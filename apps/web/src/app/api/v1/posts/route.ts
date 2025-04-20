import { createClient } from '@/lib/supabase/server'; // Use server client for Route Handlers
import { isUserAllowed } from '@/lib/authUtils'; // Reuse our auth helper
import { NextResponse, type NextRequest } from 'next/server';

// GET: Fetch existing posts (e.g., Top 10 for dashboard)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  const supabase = createClient();

  // --- Authorization Check (Defense in Depth) ---
  // Although middleware should protect, verify again in the API route
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Check whitelist again
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // --- End Authorization Check ---

  // --- Fetch Data ---
  // Example: Fetch top 10 posts ordered by composite_score (descending)
  // Handle null scores appropriately (e.g., filter them out or order them last)
  try {
    const { data, error } = await supabase
      .from('social_posts')
      .select('post_id, platform, permalink, composite_score') // Select specific columns needed
      .not('composite_score', 'is', null) // Ensure score exists for ranking
      .order('composite_score', { ascending: false, nullsFirst: false })
      .limit(10);

    if (error) {
      // RLS errors might appear here if policies are incorrect
      console.error('API GET /posts Error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch posts', details: error.message }, { status: 500 });
    }

    // Add rank based on the fetched order
    const rankedData = data.map((post, index) => ({
      ...post,
      rank: index + 1, // Simple rank based on query order
    }));

    return NextResponse.json(rankedData, { status: 200 });

  } catch (e: unknown) {
    console.error('API GET /posts Exception:', e);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}


// POST: Upsert social post data
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

// We might add PUT/PATCH later for updating insights specifically
// export async function PATCH(request: NextRequest) { ... }