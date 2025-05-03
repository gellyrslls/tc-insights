import { createClient } from '@/lib/supabase/server';
import { isUserAllowed } from '@/lib/authUtils';
import {
  processAndScoreBatch,
  type PostDataForScoring,
  type MetricWeights,
  type ScoredPost,
} from '@/lib/scoringUtils'; // Import scoring functions and types
import { NextResponse, type NextRequest } from 'next/server';

// Define the weights (move to a config file later if needed)
const ENGAGEMENT_WEIGHTS: MetricWeights = {
  views: 0.15,
  reach: 0.25,
  interactions: 0.50,
  link_clicks: 0.10,
};

// --- Mock Meta API Fetch ---
// Replace this with actual Meta API call later
async function fetchNewPostsFromMetaAPI(): Promise<PostDataForScoring[]> {
  console.log("MOCK: Fetching new posts from Meta API...");
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return mock data for testing scoring logic
  // Use realistic-looking IDs and data structures
  const mockPosts: PostDataForScoring[] = [
    { post_id: "meta_mock_1", platform: "Facebook", publish_time: new Date(Date.now() - 86400000 * 1).toISOString(), views: 5500, reach: 4000, interactions: 150, link_clicks: 50 },
    { post_id: "meta_mock_2", platform: "Instagram", publish_time: new Date(Date.now() - 86400000 * 2).toISOString(), views: "10,000", reach: 8500, interactions: 300, link_clicks: 25 },
    { post_id: "meta_mock_3", platform: "Facebook", publish_time: new Date(Date.now() - 86400000 * 3).toISOString(), views: 1200, reach: 950, interactions: 20, link_clicks: 5 },
    { post_id: "meta_mock_4", platform: "Facebook", publish_time: new Date(Date.now() - 86400000 * 0.5).toISOString(), views: null, reach: 500, interactions: 10, link_clicks: 1 }, // Test null/missing
  ];
  console.log(`MOCK: Returning ${mockPosts.length} new posts.`);
  return mockPosts;
  // In reality, this function would handle Meta OAuth, API calls, pagination, error handling,
  // and potentially filtering based on a 'last fetched' timestamp.
}
// --- End Mock Meta API Fetch ---


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  const supabase = createClient();
  const startTimestamp = Date.now();
  console.log("Analysis run started...");

  // --- Authorization Check ---
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    console.error("Analysis run: Unauthorized access attempt.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    console.error(`Analysis run: Forbidden access attempt by ${user.email}.`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  console.log(`Analysis run: Authorized user ${user.email}.`);
  // --- End Authorization Check ---

  try {
    // 1. Fetch ALL Historical Data from Supabase for normalization context
    //    (Select only columns needed for scoring)
    console.log("Analysis run: Fetching historical data...");
    const { data: historicalDataRaw, error: historyError } = await supabase
      .from('social_posts')
      .select('post_id, platform, publish_time, permalink, views, reach, interactions, link_clicks'); // Select only necessary fields

    if (historyError) {
      console.error("Analysis run: Error fetching historical data:", historyError.message);
      throw new Error(`Failed to fetch historical data: ${historyError.message}`);
    }
    const historicalPosts: PostDataForScoring[] = historicalDataRaw || [];
    console.log(`Analysis run: Fetched ${historicalPosts.length} historical posts.`);

    // 2. Fetch New/Recent Data (Using Mock for now)
    //    TODO: Replace mock function with actual Meta API call
    const newPosts = await fetchNewPostsFromMetaAPI();
    if (!newPosts || newPosts.length === 0) {
        console.log("Analysis run: No new posts fetched from Meta API (mock).");
        // Decide if this is an error or just means nothing to update
        return NextResponse.json({ message: 'No new posts found to process.' }, { status: 200 });
    }

    // 3. Process & Score the new batch using historical context
    console.log("Analysis run: Processing and scoring new batch...");
    const scoredRankedPosts: ScoredPost[] = processAndScoreBatch(
      newPosts,
      historicalPosts,
      ENGAGEMENT_WEIGHTS
    );
    console.log(`Analysis run: Scored and ranked ${scoredRankedPosts.length} posts.`);


     // We need to merge back platform, permalink, publish_time from the original `newPosts`
     // as `processAndScoreBatch` currently only returns scoring-related fields defined in ScoredPost
     const newPostsMap = new Map(newPosts.map(p => [p.post_id, p]));
     const finalUpsertData = scoredRankedPosts.map(scoredPost => {
        const originalPost = newPostsMap.get(scoredPost.post_id);
        return {
            post_id: scoredPost.post_id,
            platform: originalPost?.platform ?? 'Unknown', // Get from original or default
            permalink: originalPost?.permalink, // Get from original
            publish_time: originalPost?.publish_time ?? new Date().toISOString(), // Get from original or default
            views: scoredPost.views,
            reach: scoredPost.reach,
            interactions: scoredPost.interactions,
            link_clicks: scoredPost.link_clicks,
            composite_score: scoredPost.composite_score,
            rank_within_batch: scoredPost.rank_within_batch,
        };
     });


    // 5. Upsert scored data back into Supabase
    console.log("Analysis run: Upserting scored data...");
    if (finalUpsertData.length > 0) {
        const { error: upsertError } = await supabase
            .from('social_posts')
            .upsert(finalUpsertData, { onConflict: 'post_id' });

        if (upsertError) {
            console.error("Analysis run: Error upserting scored data:", upsertError.message);
            throw new Error(`Failed to save scored posts: ${upsertError.message}`);
        }
        console.log(`Analysis run: Successfully upserted ${finalUpsertData.length} posts.`);
    } else {
        console.log("Analysis run: No data to upsert.");
    }


    // TODO: Update a "Last Updated" timestamp mechanism here if needed

    const duration = Date.now() - startTimestamp;
    console.log(`Analysis run completed successfully in ${duration}ms.`);

    // Return the scored/ranked new posts as the response
    return NextResponse.json({
        message: `Analysis complete. Processed ${scoredRankedPosts.length} new posts.`,
        processedPosts: scoredRankedPosts // Send back the results
    }, { status: 200 });

  } catch (error: unknown) {
    const duration = Date.now() - startTimestamp;
    console.error(`Analysis run failed after ${duration}ms:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during analysis.';
    return NextResponse.json({ error: 'Analysis run failed', details: errorMessage }, { status: 500 });
  }
}