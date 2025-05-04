import { createClient } from "@/lib/supabase/server";
import { isUserAllowed } from "@/lib/authUtils";
import { NextResponse, type NextRequest } from "next/server";

interface RouteHandlerContext {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params: any;
  }

// GET: Fetch qualitative analysis for a specific post
export async function GET(
  request: NextRequest, // Request object might be needed for future extensions
  { params }: RouteHandlerContext
) {
  const supabase = createClient();
  const postId = params?.postId as string;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  // --- Authorization Check ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // --- End Authorization Check ---

  try {
    const { data, error } = await supabase
      .from("social_posts")
      .select("qualitative_analysis, analyzed_by_email, analysis_timestamp") // Select relevant fields
      .eq("post_id", postId)
      .maybeSingle(); // Fetch a single record or null if not found

    if (error) {
      console.error(`API GET /insights/${postId} Error:`, error.message);
      return NextResponse.json(
        { error: "Failed to fetch insight", details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      // It's okay if a post exists but has no analysis yet, return nulls or empty object
      return NextResponse.json(
        {
          qualitative_analysis: null,
          analyzed_by_email: null,
          analysis_timestamp: null,
        },
        { status: 200 }
      );
      // Alternatively, if post ID *must* exist: return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Return the fetched insight data
    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    console.error(`API GET /insights/${postId} Exception:`, e);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT: Update qualitative analysis for a specific post
export async function PUT(
  request: NextRequest,
  { params }: RouteHandlerContext
) {
  const supabase = createClient();
  const postId = params?.postId as string;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  // --- Authorization Check ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // --- End Authorization Check ---

  // --- Process Request Body ---
  let body;
  try {
    body = await request.json();
    // Validate that the analysis text is present (can be empty string, but key should exist)
    if (typeof body?.analysisText !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid analysisText in request body" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // --- Update Data ---
  try {
    const analysisData = {
      qualitative_analysis: body.analysisText,
      analyzed_by_email: user.email, // Record who made the update
      analysis_timestamp: new Date().toISOString(), // Record when it was updated
      // updated_at will be handled by the trigger
    };

    const { data, error } = await supabase
      .from("social_posts")
      .update(analysisData)
      .eq("post_id", postId)
      .select(
        "post_id, qualitative_analysis, analyzed_by_email, analysis_timestamp"
      ) // Select updated fields
      .single(); // Use single() to ensure the post exists and was updated

    if (error) {
      // Handle potential error if post_id doesn't exist (depends on RLS/db constraints)
      if (error.code === "PGRST116") {
        // PostgREST code for "Matching row not found"
        console.warn(`API PUT /insights/${postId}: Post not found for update.`);
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      console.error(`API PUT /insights/${postId} Error:`, error.message);
      return NextResponse.json(
        { error: "Failed to update insight", details: error.message },
        { status: 500 }
      );
    }

    // If data is null after update without error, it means RLS might have prevented update without throwing specific error code
    if (!data) {
      console.warn(
        `API PUT /insights/${postId}: Update successful but no data returned (potentially RLS issue or post deleted concurrently?).`
      );
      // Decide appropriate response, maybe 204 No Content or 404 Not Found
      return NextResponse.json(
        { message: "Update applied, but no data returned." },
        { status: 200 }
      ); // Or 204
    }

    // Return the updated insight data
    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    console.error(`API PUT /insights/${postId} Exception:`, e);
    return NextResponse.json(
      { error: "An unexpected error occurred during update" },
      { status: 500 }
    );
  }
}
