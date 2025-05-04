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
  interactions: 0.5,
  link_clicks: 0.1,
};
const LAST_FETCH_TIMESTAMP_KEY = 'last_meta_fetch_timestamp'; // Define key

// --- Mock Meta API Fetch ---
// Replace this with actual Meta API call later
async function fetchNewPostsFromMetaAPI(
  since?: string // Accept optional 'since' timestamp
): Promise<PostDataForScoring[]> {
  console.log(`MOCK: Fetching new posts from Meta API${since ? ` since ${since}` : ''}...`);
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Return mock data for testing scoring logic
  // In a real scenario, you might filter based on 'since' or just return recent posts
  const mockPosts: PostDataForScoring[] = [
    {
      post_id: "meta_mock_1",
      platform: "Facebook",
      publish_time: new Date(Date.now() - 86400000 * 1).toISOString(),
      permalink: "fb.com/1", // Added mock permalink
      views: 5500,
      reach: 4000,
      interactions: 150,
      link_clicks: 50,
    },
    {
      post_id: "meta_mock_2",
      platform: "Instagram",
      publish_time: new Date(Date.now() - 86400000 * 2).toISOString(),
      permalink: "ig.com/2", // Added mock permalink
      views: "10,000",
      reach: 8500,
      interactions: 300,
      link_clicks: 25,
    },
    {
      post_id: "meta_mock_3",
      platform: "Facebook",
      publish_time: new Date(Date.now() - 86400000 * 3).toISOString(),
      permalink: "fb.com/3", // Added mock permalink
      views: 1200,
      reach: 950,
      interactions: 20,
      link_clicks: 5,
    },
    {
      post_id: "meta_mock_4",
      platform: "Facebook",
      publish_time: new Date(Date.now() - 86400000 * 0.5).toISOString(),
      permalink: "fb.com/4", // Added mock permalink
      views: null,
      reach: 500,
      interactions: 10,
      link_clicks: 1,
    }, // Test null/missing
  ];
  console.log(`MOCK: Returning ${mockPosts.length} new posts.`);
  return mockPosts;
  // In reality, this function would handle Meta OAuth, API calls, pagination, error handling,
  // and filtering based on the 'since' timestamp.
}
// --- End Mock Meta API Fetch ---

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  const supabase = createClient();
  const startTimestamp = Date.now();
  const currentTimestampISO = new Date().toISOString(); // Timestamp for this run
  console.log("Analysis run started at:", currentTimestampISO);

  // --- Authorization Check ---
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    console.error("Analysis run: Unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    console.error(`Analysis run: Forbidden access attempt by ${user.email}.`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.log(`Analysis run: Authorized user ${user.email}.`);
  // --- End Authorization Check ---

  try {
    // *** Read the last fetch timestamp ***
    console.log("Analysis run: Reading last fetch timestamp...");
    const { data: lastFetchData, error: lastFetchError } = await supabase
      .from("app_metadata")
      .select("value_timestamp")
      .eq("key", LAST_FETCH_TIMESTAMP_KEY)
      .maybeSingle();

    if (lastFetchError) {
      console.error(
        "Analysis run: Error reading last fetch timestamp:",
        lastFetchError.message
      );
      // Decide if this is fatal or if we proceed fetching all data
      // For now, let's proceed but log a warning
    }
    const lastFetchTimestamp = lastFetchData?.value_timestamp;
    console.log(
      "Analysis run: Last fetch timestamp was:",
      lastFetchTimestamp ?? "Never"
    );

    // 1. Fetch ALL Historical Data from Supabase for normalization context
    console.log("Analysis run: Fetching historical data...");
    const { data: historicalDataRaw, error: historyError } = await supabase
      .from("social_posts")
      .select(
        "post_id, platform, publish_time, permalink, views, reach, interactions, link_clicks" // Ensure all needed fields are selected
      );

    if (historyError) {
      console.error(
        "Analysis run: Error fetching historical data:",
        historyError.message
      );
      throw new Error(
        `Failed to fetch historical data: ${historyError.message}`
      );
    }
    // Map raw data to ensure it matches PostDataForScoring type
    const historicalPosts: PostDataForScoring[] = (historicalDataRaw || []).map(p => ({
        post_id: p.post_id,
        platform: p.platform,
        publish_time: p.publish_time,
        permalink: p.permalink,
        views: p.views,
        reach: p.reach,
        interactions: p.interactions,
        link_clicks: p.link_clicks,
    }));
    console.log(
      `Analysis run: Fetched ${historicalPosts.length} historical posts.`
    );

    // 2. Fetch New/Recent Data (Using Mock for now)
    const newPosts = await fetchNewPostsFromMetaAPI(lastFetchTimestamp); // Pass timestamp
    if (!newPosts || newPosts.length === 0) {
      console.log("Analysis run: No new posts fetched from Meta API (mock).");

      // *** Update timestamp even if no new posts ***
      console.log("Analysis run: Updating last fetch timestamp (no new posts)...");
      const { error: updateTimestampError } = await supabase
          .from('app_metadata')
          .update({ value_timestamp: currentTimestampISO, updated_at: currentTimestampISO })
          .eq('key', LAST_FETCH_TIMESTAMP_KEY);
      if (updateTimestampError) {
          console.error("Analysis run: Failed to update last fetch timestamp:", updateTimestampError.message);
      } else {
          console.log("Analysis run: Successfully updated last fetch timestamp to:", currentTimestampISO);
      }
      // *** End timestamp update ***

      return NextResponse.json(
        { message: "No new posts found to process." },
        { status: 200 }
      );
    }

    // 3. Process & Score the new batch using historical context
    console.log("Analysis run: Processing and scoring new batch...");
    const scoredRankedPosts: ScoredPost[] = processAndScoreBatch(
      newPosts,
      historicalPosts,
      ENGAGEMENT_WEIGHTS
    );
    console.log(
      `Analysis run: Scored and ranked ${scoredRankedPosts.length} posts.`
    );

    // 4. Prepare data for Upsert
    //    The scoredRankedPosts should now contain all necessary fields defined in ScoredPost
    const finalUpsertData = scoredRankedPosts.map((scoredPost) => {
      // Map directly from ScoredPost to the fields needed for the DB upsert
      return {
        post_id: scoredPost.post_id,
        platform: scoredPost.platform,
        permalink: scoredPost.permalink,
        publish_time: scoredPost.publish_time,
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
    if (finalUpsertData.length > 0) { // Check if there's actually data to upsert
      const { error: upsertError } = await supabase
        .from("social_posts")
        .upsert(finalUpsertData, { onConflict: "post_id" });

      if (upsertError) {
        console.error(
          "Analysis run: Error upserting scored data:",
          upsertError.message
        );
        // Don't update timestamp if upsert fails
        throw new Error(`Failed to save scored posts: ${upsertError.message}`);
      }
      console.log(
        `Analysis run: Successfully upserted ${finalUpsertData.length} posts.`
      );
    } else {
        // This case should ideally not be reached if newPosts check passed,
        // but kept for safety.
        console.log("Analysis run: No data prepared for upsert (this shouldn't happen if new posts were found).");
    }

    // *** Update the last fetch timestamp AFTER successful processing/upsert ***
    console.log("Analysis run: Updating last fetch timestamp...");
    const { error: updateTimestampError } = await supabase
        .from('app_metadata')
        .update({ value_timestamp: currentTimestampISO, updated_at: currentTimestampISO })
        .eq('key', LAST_FETCH_TIMESTAMP_KEY);

    if (updateTimestampError) {
        // Log error but don't fail the whole request just because timestamp update failed
        console.error("Analysis run: Failed to update last fetch timestamp:", updateTimestampError.message);
    } else {
        console.log("Analysis run: Successfully updated last fetch timestamp to:", currentTimestampISO);
    }
    // *** End timestamp update ***

    const duration = Date.now() - startTimestamp;
    console.log(`Analysis run completed successfully in ${duration}ms.`);

    // Return the scored/ranked new posts as the response
    return NextResponse.json(
      {
        message: `Analysis complete. Processed ${scoredRankedPosts.length} new posts.`,
        processedPosts: scoredRankedPosts, // Send back the results
      },
      { status: 200 }
    );

  } catch (error: unknown) {
    const duration = Date.now() - startTimestamp;
    console.error(`Analysis run failed after ${duration}ms:`, error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown error occurred during analysis.";
    return NextResponse.json(
      { error: "Analysis run failed", details: errorMessage },
      { status: 500 }
    );
  }
}