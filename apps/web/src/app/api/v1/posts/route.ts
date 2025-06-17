import { createClient } from "@/lib/supabase/server";
import { isUserAllowed } from "@/lib/authUtils";
import { NextResponse, type NextRequest } from "next/server";
import { subDays, startOfMonth, startOfWeek, formatISO } from "date-fns";

// Helper function to get date ranges for presets
function getDateRange(period?: string | null): {
  startDate?: string;
  endDate?: string;
} {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined = now;

  switch (period) {
    case "last_7_days":
      startDate = subDays(now, 7);
      break;
    case "last_28_days":
      startDate = subDays(now, 28);
      break;
    case "last_90_days":
      startDate = subDays(now, 90);
      break;
    case "this_month":
      startDate = startOfMonth(now);
      break;
    case "last_month":
      const startOfCurrentMonth = startOfMonth(now);
      endDate = subDays(startOfCurrentMonth, 1);
      startDate = startOfMonth(endDate);
      break;
    case "this_week":
      startDate = startOfWeek(now);
      break;
    case "last_week":
      const startOfCurrentWeek = startOfWeek(now);
      endDate = subDays(startOfCurrentWeek, 1);
      startDate = startOfWeek(endDate);
      break;
    case "overall":
    default:
      return {};
  }

  return {
    startDate: startDate ? formatISO(startDate) : undefined,
    endDate: endDate ? formatISO(endDate) : undefined,
  };
}

// GET: Fetch existing posts with filtering and pagination
export async function GET(request: NextRequest) {
  const supabase = createClient();

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

  // --- Parse Query Parameters ---
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const period = searchParams.get("period");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const postId = searchParams.get("postId");
  const searchQuery = searchParams.get("searchQuery");

  // Pagination parameters
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // --- Determine Date Range ---
  let dateRange: { startDate?: string; endDate?: string };
  if (startDateParam && endDateParam) {
    dateRange = { startDate: startDateParam, endDate: endDateParam };
  } else {
    dateRange = getDateRange(period);
  }
  const { startDate, endDate } = dateRange;

  // --- Build Supabase Query ---
  try {
    let query = supabase.from("social_posts").select(
      "post_id, platform, permalink, publish_time, composite_score, views, reach, interactions, link_clicks, qualitative_analysis, analysis_timestamp, analyzed_by_email, caption, image_url",
      { count: "exact" } // Get total count of filtered rows
    );

    if (postId) {
      query = query.eq("post_id", postId);
    } else {
      if (platform && platform !== "all") {
        query = query.ilike("platform", platform);
      }

      if (searchQuery) {
        query = query.ilike("caption", `%${searchQuery}%`);
      }

      if (startDate) {
        query = query.gte("publish_time", startDate);
      }
      if (endDate && period !== "overall") {
        query = query.lte("publish_time", endDate);
      }
    }

    // Apply ordering and pagination range
    query = query
      .order("composite_score", { ascending: false, nullsFirst: false })
      .order("interactions", { ascending: false })
      .range(from, to);

    // --- Execute Query ---
    const { data, error, count } = await query;

    if (error) {
      console.error("API GET /posts Error:", error.message);
      return NextResponse.json(
        { error: "Failed to fetch posts", details: error.message },
        { status: 500 }
      );
    }

    // --- Add Rank (relative to the current page) ---
    const rankedData = data.map((post, index) => ({
      ...post,
      rank: from + index + 1,
    }));

    // Return data along with the total count for pagination UI
    return NextResponse.json(
      { data: rankedData, totalCount: count },
      { status: 200 }
    );
  } catch (e: unknown) {
    console.error("API GET /posts Exception:", e);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
