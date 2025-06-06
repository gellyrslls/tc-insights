import { createClient } from '@/lib/supabase/server';
import { isUserAllowed } from '@/lib/authUtils';
import { NextResponse, type NextRequest } from 'next/server';
import { subDays, startOfMonth, startOfWeek, formatISO } from 'date-fns'; // Date utility library

// Helper function to get date ranges for presets
function getDateRange(period?: string | null): { startDate?: string; endDate?: string } {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined = now; // Default end date is now

  switch (period) {
    case 'last_7_days':
      startDate = subDays(now, 7);
      break;
    case 'last_28_days':
      startDate = subDays(now, 28);
      break;
    case 'last_90_days':
      startDate = subDays(now, 90);
      break;
    case 'this_month':
      startDate = startOfMonth(now);
      break;
    case 'last_month':
      const startOfCurrentMonth = startOfMonth(now);
      endDate = subDays(startOfCurrentMonth, 1); // End of previous month
      startDate = startOfMonth(endDate); // Start of previous month
      break;
    case 'this_week': // Assuming week starts on Sunday
      startDate = startOfWeek(now);
      break;
    case 'last_week': // Assuming week starts on Sunday
       const startOfCurrentWeek = startOfWeek(now);
       endDate = subDays(startOfCurrentWeek, 1); // End of previous week
       startDate = startOfWeek(endDate); // Start of previous week
       break;
    // Add cases for 'this_year', etc. if needed
    case 'overall':
    default:
      // No date filtering for 'overall' or default
      return {};
  }

  // Format dates as ISO strings for Supabase query
  return {
    startDate: startDate ? formatISO(startDate) : undefined,
    endDate: endDate ? formatISO(endDate) : undefined,
  };
}


// GET: Fetch existing posts with filtering and ranking
export async function GET(request: NextRequest) { // Use request to get searchParams
  const supabase = createClient();

  // --- Authorization Check ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // --- End Authorization Check ---

  // --- Parse Query Parameters ---
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get('platform'); // 'facebook', 'instagram', or null/undefined for 'all'
  const period = searchParams.get('period'); // 'overall', 'last_7_days', 'last_month', etc.
  const startDateParam = searchParams.get('startDate'); // Custom start date YYYY-MM-DD
  const endDateParam = searchParams.get('endDate'); // Custom end date YYYY-MM-DD
  const postId = searchParams.get('postId'); // Specific post ID for search
  const ranking = searchParams.get('ranking'); // 'overall'
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : (ranking === 'overall' ? 10 : undefined); // Default limit 10 for overall ranking

  // --- Determine Date Range ---
  let dateRange: { startDate?: string; endDate?: string };
  if (startDateParam && endDateParam) {
    // Use custom range if provided (add validation if needed)
    // Ensure endDate includes the whole day if necessary, e.g., by setting time to 23:59:59
    // For simplicity, we'll use the dates as is for now.
     dateRange = { startDate: startDateParam, endDate: endDateParam };
  } else {
    // Use preset period if custom range isn't provided
    dateRange = getDateRange(period ?? (ranking === 'overall' ? 'overall' : null)); // Default to 'overall' if ranking=overall
  }
  const { startDate, endDate } = dateRange;

  // --- Build Supabase Query ---
  try {
    let query = supabase
      .from('social_posts')
      .select('post_id, platform, permalink, publish_time, composite_score, views, reach, interactions, link_clicks'); // Select columns needed

    // Apply Post ID filter (highest priority)
    if (postId) {
      query = query.eq('post_id', postId);
    } else {
      // Apply Platform filter (if not searching by specific ID)
      if (platform && platform !== 'all') {
        query = query.ilike('platform', platform);
      }

      // Apply Date Range filter (if not searching by specific ID and not 'overall')
      if (startDate) {
        query = query.gte('publish_time', startDate);
      }
      if (endDate && period !== 'overall') { // Don't filter end date for 'overall' ranking
         // Adjust endDate to include the whole day if needed, depending on how publish_time is stored
         // Example: query = query.lte('publish_time', `${endDate}T23:59:59Z`);
         query = query.lte('publish_time', endDate);
      }

      // Apply Ordering (always order by score descending for ranking)
      // Ensure posts without scores are handled (e.g., filtered or ordered last)
      query = query.not('composite_score', 'is', null); // Filter out posts without score
      query = query.order('composite_score', { ascending: false, nullsFirst: false });

      // Apply Limit (only for overall ranking or if explicitly requested)
      if (limit && !isNaN(limit)) {
        query = query.limit(limit);
      }
    }

    // --- Execute Query ---
    const { data, error } = await query;

    if (error) {
      console.error('API GET /posts Error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch posts', details: error.message }, { status: 500 });
    }

    // --- Add Rank (Simple rank based on query order) ---
    // Note: This rank is only meaningful within the returned subset.
    // For true pagination later, SQL RANK() would be better.
    const rankedData = data.map((post, index) => ({
      ...post,
      rank: index + 1,
    }));

    return NextResponse.json(rankedData, { status: 200 });

  } catch (e: unknown) {
    console.error('API GET /posts Exception:', e);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

// POST function remains the same as before...
export async function POST(request: NextRequest) {
  const supabase = createClient();

  // --- Authorization Check (Defense in Depth) ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // --- End Authorization Check ---

  // --- Process Request Body ---
  let postData;
  try {
    postData = await request.json();
    // TODO: Add validation here using Zod or similar to ensure postData matches expected schema
    if (!postData || !postData.post_id || !postData.platform || !postData.publish_time) {
       return NextResponse.json({ error: 'Missing required post data fields (post_id, platform, publish_time)' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // --- Upsert Data ---
  try {
    // Ensure numeric fields are numbers or null
    const views = postData.views ? Number(postData.views) : null;
    const reach = postData.reach ? Number(postData.reach) : null;
    const interactions = postData.interactions ? Number(postData.interactions) : null;
    const link_clicks = postData.link_clicks ? Number(postData.link_clicks) : null;
    const composite_score = postData.composite_score ? Number(postData.composite_score) : null;
    const rank_within_batch = postData.rank_within_batch ? Number(postData.rank_within_batch) : null;

    const upsertData = {
      post_id: postData.post_id,
      platform: postData.platform,
      permalink: postData.permalink,
      publish_time: postData.publish_time, // Ensure this is a valid ISO 8601 string
      views: isNaN(views as number) ? null : views,
      reach: isNaN(reach as number) ? null : reach,
      interactions: isNaN(interactions as number) ? null : interactions,
      link_clicks: isNaN(link_clicks as number) ? null : link_clicks,
      composite_score: isNaN(composite_score as number) ? null : composite_score,
      rank_within_batch: isNaN(rank_within_batch as number) ? null : rank_within_batch,
      // Add other fields like qualitative_analysis if needed during upsert
    };

    const { data, error } = await supabase
      .from('social_posts')
      .upsert(upsertData, { onConflict: 'post_id' }) // Upsert based on the post_id primary key
      .select() // Optionally select the upserted data to return
      .single(); // Expecting a single row back

    if (error) {
      console.error('API POST /posts Error:', error.message);
      // Check for specific errors like RLS violation
      return NextResponse.json({ error: 'Failed to upsert post', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 }); // 201 Created (or 200 OK if updated)

  } catch (e: unknown) {
    console.error('API POST /posts Exception:', e);
    return NextResponse.json({ error: 'An unexpected error occurred during upsert' }, { status: 500 });
  }
}