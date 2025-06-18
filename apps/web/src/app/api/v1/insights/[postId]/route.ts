import { createClient } from "@/lib/supabase/server";
import { isUserAllowed } from "@/lib/authUtils";
import { NextResponse, type NextRequest } from "next/server";

interface RouteHandlerContext {
  params: Promise<{
    postId: string;
  }>;
}

// GET: Fetch the entire insight history for a specific post
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
      .from("insight_history")
      .select("analysis_text, analyzed_by_email, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        `API GET /insights/${postId} History Error:`,
        error.message
      );
      return NextResponse.json(
        { error: "Failed to fetch insight history", details: error.message },
        { status: 500 }
      );
    }

    // Return the array of history entries
    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    console.error(`API GET /insights/${postId} History Exception:`, e);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// PUT: Save a new insight, creating a new history entry
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
    if (
      typeof body?.analysisText !== "string" ||
      body.analysisText.trim() === ""
    ) {
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

  const newInsightData = {
    post_id: postId,
    analysis_text: body.analysisText,
    analyzed_by_email: user.email,
  };

  const latestPostUpdateData = {
    qualitative_analysis: body.analysisText,
    analyzed_by_email: user.email,
    analysis_timestamp: new Date().toISOString(),
  };

  try {
    const { error: historyError } = await supabase
      .from("insight_history")
      .insert(newInsightData);

    if (historyError) {
      console.error(
        `API PUT /insights/${postId} History Insert Error:`,
        historyError.message
      );
      throw new Error(
        `Failed to save insight history: ${historyError.message}`
      );
    }

    const { data, error: postUpdateError } = await supabase
      .from("social_posts")
      .update(latestPostUpdateData)
      .eq("post_id", postId)
      .select("post_id")
      .single();

    if (postUpdateError) {
      console.error(
        `API PUT /insights/${postId} Post Update Error:`,
        postUpdateError.message
      );
      throw new Error(
        `Failed to update post with latest insight: ${postUpdateError.message}`
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    const error = e as Error;
    console.error(`API PUT /insights/${postId} Exception:`, error.message);
    return NextResponse.json(
      {
        error: "An unexpected error occurred during update",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
