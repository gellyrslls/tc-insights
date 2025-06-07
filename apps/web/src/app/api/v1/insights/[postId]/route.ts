import { createClient } from "@/lib/supabase/server";
import { isUserAllowed } from "@/lib/authUtils";
import { NextResponse, type NextRequest } from "next/server";

interface RouteHandlerContext {
  params: Promise<{
    postId: string;
  }>;
}

// GET: Fetch qualitative analysis for a specific post
export async function GET(
  request: NextRequest,
  { params }: RouteHandlerContext
) {
  const supabase = createClient();
  const { postId } = await params;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  // Authorization Check
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

  try {
    const { data, error } = await supabase
      .from("social_posts")
      .select("qualitative_analysis, analyzed_by_email, analysis_timestamp")
      .eq("post_id", postId)
      .maybeSingle();
    if (error) {
      console.error(`API GET /insights/${postId} Error:`, error.message);
      return NextResponse.json(
        { error: "Failed to fetch insight", details: error.message },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        {
          qualitative_analysis: null,
          analyzed_by_email: null,
          analysis_timestamp: null,
        },
        { status: 200 }
      );
    }
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
  const { postId } = await params;

  if (!postId) {
    return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
  }

  // Authorization Check
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

  let body;
  try {
    body = await request.json();
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

  try {
    const analysisData = {
      qualitative_analysis: body.analysisText,
      analyzed_by_email: user.email,
      analysis_timestamp: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("social_posts")
      .update(analysisData)
      .eq("post_id", postId)
      .select(
        "post_id, qualitative_analysis, analyzed_by_email, analysis_timestamp"
      )
      .single();
    if (error) {
      if (error.code === "PGRST116") {
        console.warn(`API PUT /insights/${postId}: Post not found for update.`);
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      console.error(`API PUT /insights/${postId} Error:`, error.message);
      return NextResponse.json(
        { error: "Failed to update insight", details: error.message },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { message: "Update applied, but no data returned." },
        { status: 200 }
      );
    }
    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    console.error(`API PUT /insights/${postId} Exception:`, e);
    return NextResponse.json(
      { error: "An unexpected error occurred during update" },
      { status: 500 }
    );
  }
}
