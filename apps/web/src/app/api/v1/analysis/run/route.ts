import { createClient } from "@/lib/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { isUserAllowed } from "@/lib/authUtils";
import {
  processAndScoreBatch,
  type PostDataForScoring,
  type MetricWeights,
  type ScoredPost,
} from "@/lib/scoringUtils";
import { NextResponse } from "next/server";

// --- START TYPE DEFINITIONS FOR META API RESPONSES ---
interface MetaApiErrorDetail {
  message: string;
  type: string;
  code: number;
  fbtrace_id: string;
}

interface MetaApiErrorResponse {
  error: MetaApiErrorDetail;
}

interface MetaPaging {
  cursors?: {
    before: string;
    after: string;
  };
  next?: string;
  previous?: string;
}

interface MetaPostOrMediaItem {
  id: string;
  created_time?: string; // Facebook
  timestamp?: string; // Instagram
  permalink_url?: string; // Facebook
  permalink?: string; // Instagram
  message?: string; // Facebook
  caption?: string; // Instagram
  media_type?: string; // Instagram
  is_published?: boolean; // Facebook
  is_expired?: boolean; // Facebook
  media_product_type?: "FEED" | "REEL" | "STORY" | "AD" | "REELS_AD"; // Instagram
}

interface MetaFeedResponse {
  data: MetaPostOrMediaItem[];
  paging?: MetaPaging;
  error?: MetaApiErrorDetail;
}

interface FacebookPostFieldsResponse {
  comments?: {
    summary?: {
      total_count: number;
    };
  };
  shares?: {
    count: number;
  };
  id?: string;
  error?: MetaApiErrorDetail;
}

interface InstagramBusinessAccountData {
  id: string;
}
interface InstagramBusinessAccountResponse {
  instagram_business_account?: InstagramBusinessAccountData;
  id?: string;
  error?: MetaApiErrorDetail;
}

interface MetaInsightValue {
  value?: number | Record<string, number> | string;
}
interface MetaInsightEntry {
  name: string;
  period?: string;
  values?: MetaInsightValue[];
  title?: string;
  description?: string;
  id?: string;
}
interface MetaInsightsResponse {
  data: MetaInsightEntry[];
  error?: MetaApiErrorDetail;
}

interface HistoricalPostRow {
  post_id: string;
  platform: string;
  publish_time: string;
  permalink?: string | null;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  link_clicks: number | null;
}

// --- END TYPE DEFINITIONS FOR META API RESPONSES ---

const ENGAGEMENT_WEIGHTS: MetricWeights = {
  views: 0.15,
  reach: 0.25,
  interactions: 0.5,
  link_clicks: 0.1,
};
const LAST_FETCH_TIMESTAMP_KEY = "last_meta_fetch_timestamp";

async function fetchNewPostsFromMetaAPI(
  since?: string
): Promise<PostDataForScoring[]> {
  console.log(
    `Fetching new posts from Meta API${
      since ? ` since ${since}` : " (first run or no previous timestamp)"
    }...`
  );

  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;

  if (!pageAccessToken || !pageId) {
    console.error(
      "Missing required environment variables: META_PAGE_ACCESS_TOKEN and/or META_PAGE_ID"
    );
    throw new Error(
      "Meta API configuration is incomplete. Please check environment variables."
    );
  }

  let sinceUnixTimestamp: number | undefined;
  if (since) {
    try {
      sinceUnixTimestamp = Math.floor(new Date(since).getTime() / 1000);
      console.log(
        `Using since timestamp: ${since} (Unix: ${sinceUnixTimestamp})`
      );
    } catch (error) {
      console.error(`Invalid since timestamp: ${since}. Error: ${error}`);
      const defaultSinceDate = new Date("2024-01-01T00:00:00Z");
      sinceUnixTimestamp = Math.floor(defaultSinceDate.getTime() / 1000);
      console.warn(
        `Invalid 'since' timestamp. Defaulting to ${defaultSinceDate.toISOString()} (Unix: ${sinceUnixTimestamp})`
      );
    }
  } else {
    const defaultSinceDate = new Date("2024-01-01T00:00:00Z");
    sinceUnixTimestamp = Math.floor(defaultSinceDate.getTime() / 1000);
    console.log(
      `No 'since' timestamp provided. Defaulting to ${defaultSinceDate.toISOString()} (Unix: ${sinceUnixTimestamp})`
    );
  }

  const allPosts: PostDataForScoring[] = [];

  try {
    console.log(`Fetching Facebook posts for Page ID: ${pageId}`);
    const facebookPosts = await fetchFacebookPosts(
      pageId,
      pageAccessToken,
      sinceUnixTimestamp
    );
    console.log(`Retrieved ${facebookPosts.length} Facebook posts`);
    allPosts.push(...facebookPosts);

    try {
      const instagramBusinessAccountId = await getInstagramBusinessAccountId(
        pageId,
        pageAccessToken
      );
      if (instagramBusinessAccountId) {
        console.log(
          `Fetching Instagram posts for IG Business Account ID: ${instagramBusinessAccountId}`
        );
        const instagramPosts = await fetchInstagramPosts(
          instagramBusinessAccountId,
          pageAccessToken,
          sinceUnixTimestamp
        );
        console.log(`Retrieved ${instagramPosts.length} Instagram posts`);
        allPosts.push(...instagramPosts);
      } else {
        console.log(
          "No Instagram Business Account linked to this Facebook Page."
        );
      }
    } catch (igError) {
      console.error("Error during Instagram data fetching process:", igError);
    }

    console.log(`Total posts fetched from Meta API: ${allPosts.length}`);
    return allPosts;
  } catch (error) {
    console.error("Error fetching posts from Meta API:", error);
    return [];
  }
}

async function getInstagramBusinessAccountId(
  pageId: string,
  accessToken: string
): Promise<string | null> {
  const url = `https://graph.facebook.com/v22.0/${pageId}?fields=instagram_business_account&access_token=${accessToken}`;
  try {
    const response = await fetch(url);
    const data: InstagramBusinessAccountResponse = await response.json();
    if (!response.ok) {
      console.error(
        "Error getting Instagram Business Account ID:",
        data.error || `Status: ${response.status}`
      );
      return null;
    }
    if (data.instagram_business_account?.id) {
      return data.instagram_business_account.id;
    }
    console.log(
      "Instagram Business Account ID not found in response for page:",
      pageId
    );
    return null;
  } catch (error) {
    console.error("Exception getting Instagram Business Account ID:", error);
    return null;
  }
}

async function fetchFacebookPosts(
  pageId: string,
  accessToken: string,
  since?: number
): Promise<PostDataForScoring[]> {
  const posts: PostDataForScoring[] = [];
  const initialUrl = `https://graph.facebook.com/v22.0/${pageId}/published_posts?fields=id,created_time,permalink_url,message,is_published,is_expired${
    since ? `&since=${since}` : ""
  }&access_token=${accessToken}`;
  let nextUrl: string | undefined = initialUrl;
  console.log(`[fetchFacebookPosts] Initial fetch URL: ${nextUrl}`);
  let fetchedPageCount = 0;

  while (nextUrl) {
    fetchedPageCount++;
    console.log(
      `[fetchFacebookPosts] Fetching page ${fetchedPageCount}... URL: ${nextUrl.substring(
        0,
        150
      )}...`
    );
    try {
      const response = await fetch(nextUrl);
      console.log(
        `[fetchFacebookPosts] Response status for page ${fetchedPageCount}: ${response.status} ${response.statusText}`
      );
      if (!response.ok) {
        let errorData;
        try {
          errorData = (await response.json()) as MetaApiErrorResponse;
          console.error(
            "[fetchFacebookPosts] Meta API Error (from response.json()):",
            errorData.error || errorData
          );
        } catch {
          console.error(
            `[fetchFacebookPosts] Meta API Error: Status ${response.status} ${response.statusText}. Could not parse error JSON.`
          );
        }
        break;
      }
      const data: MetaFeedResponse = await response.json();
      if (data.data && Array.isArray(data.data)) {
        console.log(
          `[fetchFacebookPosts] Found ${data.data.length} posts on page ${fetchedPageCount}.`
        );
        for (const post of data.data) {
          if (post.is_published === false || post.is_expired === true) {
            continue;
          }
          try {
            const insights = await fetchFacebookPostInsights(
              post.id,
              accessToken
            );
            posts.push({
              post_id: post.id,
              platform: "Facebook",
              publish_time: post.created_time || new Date().toISOString(),
              permalink: post.permalink_url,
              views: insights.views,
              reach: insights.reach,
              interactions: insights.interactions,
              link_clicks: insights.link_clicks,
            });
          } catch (insightError) {
            console.error(
              `Error fetching insights for Facebook post ${post.id}:`,
              insightError
            );
          }
        }
      } else {
        console.log(
          `[fetchFacebookPosts] No 'data' array in the response or it's empty for page ${fetchedPageCount}.`
        );
      }
      nextUrl = data.paging?.next || undefined;
      if (!nextUrl) {
        console.log(
          "[fetchFacebookPosts] No next page found. End of Facebook posts."
        );
      }
    } catch (error) {
      console.error(
        `[fetchFacebookPosts] Exception during fetch for page ${fetchedPageCount} from ${
          nextUrl || initialUrl
        }:`,
        error
      );
      break;
    }
  }
  return posts;
}

async function fetchFacebookPostInsights(
  postId: string,
  accessToken: string
): Promise<{
  views: number;
  reach: number;
  interactions: number;
  link_clicks: number;
}> {
  const insightsMetrics =
    "post_impressions,post_impressions_unique,post_reactions_by_type_total,post_clicks_by_type";
  const insightsUrl = `https://graph.facebook.com/v22.0/${postId}/insights?metric=${insightsMetrics}&access_token=${accessToken}`;
  const postFieldsUrl = `https://graph.facebook.com/v22.0/${postId}?fields=comments.summary(true).limit(0),shares&access_token=${accessToken}`;

  try {
    const [insightsResponse, postFieldsResponse] = await Promise.all([
      fetch(insightsUrl),
      fetch(postFieldsUrl),
    ]);
    const insightsJson: MetaInsightsResponse = await insightsResponse.json();
    const postFieldsJson: FacebookPostFieldsResponse =
      await postFieldsResponse.json();

    if (!insightsResponse.ok) {
      console.error(
        `Error fetching insights for post ${postId}:`,
        insightsJson.error || `Status: ${insightsResponse.status}`
      );
    }
    if (!postFieldsResponse.ok) {
      console.error(
        `Error fetching post fields (comments/shares) for post ${postId}:`,
        postFieldsJson.error || `Status: ${postFieldsResponse.status}`
      );
    }

    let views = 0;
    let reach = 0;
    let totalReactions = 0;
    let linkClicks = 0;
    let commentCount = 0;
    let shareCount = 0;

    if (insightsJson.data) {
      const impressionsData = insightsJson.data.find(
        (item) => item.name === "post_impressions"
      );
      if (typeof impressionsData?.values?.[0]?.value === "number") {
        views = impressionsData.values[0].value;
      }
      const reachData = insightsJson.data.find(
        (item) => item.name === "post_impressions_unique"
      );
      if (typeof reachData?.values?.[0]?.value === "number") {
        reach = reachData.values[0].value;
      }
      const reactionsData = insightsJson.data.find(
        (item) => item.name === "post_reactions_by_type_total"
      );
      if (
        reactionsData?.values?.[0]?.value &&
        typeof reactionsData.values[0].value === "object"
      ) {
        totalReactions = Object.values(reactionsData.values[0].value).reduce(
          (sum, count) => sum + (Number(count) || 0),
          0
        );
      }
      const clicksData = insightsJson.data.find(
        (item) => item.name === "post_clicks_by_type"
      );
      if (
        clicksData?.values?.[0]?.value &&
        typeof clicksData.values[0].value === "object"
      ) {
        const clicksValue = clicksData.values[0].value as Record<
          string,
          number
        >;
        linkClicks =
          (clicksValue.link_clicks || 0) + (clicksValue["other clicks"] || 0);
      }
    }
    if (postFieldsJson.comments?.summary?.total_count) {
      commentCount = postFieldsJson.comments.summary.total_count;
    }
    if (postFieldsJson.shares?.count) {
      shareCount = postFieldsJson.shares.count;
    }
    const interactions = totalReactions + commentCount + shareCount;
    return { views, reach, interactions, link_clicks: linkClicks };
  } catch (error) {
    console.error(
      `Exception fetching insights bundle for Facebook post ${postId}:`,
      error
    );
    return { views: 0, reach: 0, interactions: 0, link_clicks: 0 };
  }
}

async function fetchInstagramPosts(
  igBusinessId: string,
  accessToken: string,
  since?: number
): Promise<PostDataForScoring[]> {
  const posts: PostDataForScoring[] = [];
  const initialUrl = `https://graph.facebook.com/v22.0/${igBusinessId}/media?fields=id,timestamp,permalink,media_type,caption,media_product_type${
    since ? `&since=${since}` : ""
  }&access_token=${accessToken}`;
  let nextUrl: string | undefined = initialUrl;
  console.log(`[fetchInstagramPosts] Initial fetch URL: ${nextUrl}`);
  let fetchedPageCountIG = 0;

  while (nextUrl) {
    fetchedPageCountIG++;
    console.log(
      `[fetchInstagramPosts] Fetching IG page ${fetchedPageCountIG}... URL: ${nextUrl.substring(
        0,
        150
      )}...`
    );
    try {
      const response = await fetch(nextUrl);
      console.log(
        `[fetchInstagramPosts] Response status for IG page ${fetchedPageCountIG}: ${response.status} ${response.statusText}`
      );
      if (!response.ok) {
        let errorData;
        try {
          errorData = (await response.json()) as MetaApiErrorResponse;
          console.error(
            "[fetchInstagramPosts] Meta API Error (from response.json()):",
            errorData.error || errorData
          );
        } catch {
          console.error(
            `[fetchInstagramPosts] Meta API Error: Status ${response.status} ${response.statusText}. Could not parse error JSON.`
          );
        }
        break;
      }
      const data: MetaFeedResponse = await response.json();
      if (data.data && Array.isArray(data.data)) {
        console.log(
          `[fetchInstagramPosts] Found ${data.data.length} IG media on page ${fetchedPageCountIG}.`
        );
        for (const media of data.data) {
          if (
            media.media_product_type === "STORY" ||
            media.media_product_type === "REELS_AD" ||
            media.media_product_type === "AD"
          ) {
            continue;
          }
          try {
            const insights = await fetchInstagramMediaInsights(
              media.id,
              accessToken
            );
            posts.push({
              post_id: media.id,
              platform: "Instagram",
              publish_time: media.timestamp || new Date().toISOString(),
              permalink: media.permalink,
              views: insights.impressions,
              reach: insights.reach,
              interactions: insights.engagement,
              link_clicks: 0,
            });
          } catch (insightError) {
            console.error(
              `Error fetching insights for Instagram media ${media.id}:`,
              insightError
            );
          }
        }
      } else {
        console.log(
          `[fetchInstagramPosts] No 'data' array in the IG response or it's empty for page ${fetchedPageCountIG}.`
        );
      }
      nextUrl = data.paging?.next || undefined;
      if (!nextUrl) {
        console.log(
          "[fetchInstagramPosts] No next IG page found. End of Instagram media."
        );
      }
    } catch (error) {
      console.error(
        `[fetchInstagramPosts] Exception during fetch for IG page ${fetchedPageCountIG} from ${
          nextUrl || initialUrl
        }:`,
        error
      );
      break;
    }
  }
  return posts;
}

async function fetchInstagramMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<{ impressions: number; reach: number; engagement: number }> {
  const insightsMetrics = "views,reach,likes,comments,saved,total_interactions";
  const url = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${insightsMetrics}&access_token=${accessToken}`;
  try {
    const response = await fetch(url);
    const data: MetaInsightsResponse = await response.json();
    if (!response.ok) {
      console.error(
        `Error fetching Instagram insights for media ${mediaId}:`,
        data.error || `Status: ${response.status}`
      );
      if (data.error) {
        console.error(
          `Meta API Error Details: Type: ${data.error.type}, Code: ${data.error.code}, Message: ${data.error.message}, FBTrace ID: ${data.error.fbtrace_id}`
        );
      }
      return { impressions: 0, reach: 0, engagement: 0 };
    }
    let newViews = 0;
    let reach = 0;
    let likes = 0;
    let comments = 0;
    let saved = 0;
    let totalInteractions = 0;
    if (data.data && Array.isArray(data.data)) {
      for (const metric of data.data) {
        const value = metric.values?.[0]?.value;
        if (value === undefined || value === null) continue;
        switch (metric.name) {
          case "views":
            newViews = Number(value) || 0;
            break;
          case "reach":
            reach = Number(value) || 0;
            break;
          case "likes":
            likes = Number(value) || 0;
            break;
          case "comments":
            comments = Number(value) || 0;
            break;
          case "saved":
            saved = Number(value) || 0;
            break;
          case "total_interactions":
            totalInteractions = Number(value) || 0;
            break;
        }
      }
    }
    const calculatedEngagementSum = likes + comments + saved;
    const finalEngagement =
      totalInteractions > 0 ? totalInteractions : calculatedEngagementSum;
    return { impressions: newViews, reach, engagement: finalEngagement };
  } catch (error) {
    console.error(
      `Exception fetching Instagram insights for media ${mediaId}:`,
      error
    );
    return { impressions: 0, reach: 0, engagement: 0 };
  }
}

// NEW FUNCTION FOR PAGINATED FETCH OF HISTORICAL POSTS
async function fetchAllHistoricalPosts(
  supabaseClient: SupabaseClient
): Promise<PostDataForScoring[]> {
  const allHistoricalPostsMapped: PostDataForScoring[] = [];
  const CHUNK_SIZE = 1000;
  let offset = 0;
  let keepFetching = true;
  let totalCountFromDB: number | null = null;

  console.log("Fetching all historical posts from DB with pagination...");

  while (keepFetching) {
    const {
      data: chunk,
      error,
      count,
    } = await supabaseClient
      .from("social_posts")
      .select(
        "post_id, platform, publish_time, permalink, views, reach, interactions, link_clicks",
        { count: "exact" }
      )
      .range(offset, offset + CHUNK_SIZE - 1);

    if (error) {
      console.error(
        `Error fetching chunk of historical data (offset: ${offset}):`,
        error.message
      );
      throw new Error(
        `Failed to fetch chunk of historical data: ${error.message}`
      );
    }

    if (totalCountFromDB === null && count !== null) {
      totalCountFromDB = count;
      console.log(
        `Total historical posts in DB as per count: ${totalCountFromDB}`
      );
    }

    if (chunk && chunk.length > 0) {
      const mappedChunk: PostDataForScoring[] = chunk.map(
        (p: HistoricalPostRow) => ({
          post_id: p.post_id,
          platform: p.platform,
          publish_time: p.publish_time,
          permalink: p.permalink,
          views: p.views,
          reach: p.reach,
          interactions: p.interactions,
          link_clicks: p.link_clicks,
        })
      );
      allHistoricalPostsMapped.push(...mappedChunk);
      console.log(
        `Fetched DB chunk: ${mappedChunk.length} rows, current offset: ${offset}. Total mapped so far: ${allHistoricalPostsMapped.length}.`
      );

      offset += CHUNK_SIZE;

      if (
        chunk.length < CHUNK_SIZE ||
        (totalCountFromDB !== null &&
          allHistoricalPostsMapped.length >= totalCountFromDB)
      ) {
        keepFetching = false;
      }
    } else {
      keepFetching = false;
    }
  }
  console.log(
    `Finished fetching all historical posts from DB. Total mapped: ${allHistoricalPostsMapped.length}`
  );
  return allHistoricalPostsMapped;
}

export async function POST() {
  const supabase = createClient();
  const startTimestamp = Date.now();
  const currentTimestampISO = new Date().toISOString();
  console.log("Analysis run started at:", currentTimestampISO);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user || !user.email) {
    console.error("Analysis run: Unauthorized access attempt.");
    return NextResponse.json(
      {
        error: "Unauthorized",
        details: "User session not found or email missing.",
      },
      { status: 401 }
    );
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    console.error(`Analysis run: Forbidden access attempt by ${user.email}.`);
    return NextResponse.json(
      { error: "Forbidden", details: "User not authorized for this action." },
      { status: 403 }
    );
  }
  console.log(`Analysis run: Authorized user ${user.email}.`);

  try {
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
    }
    const lastFetchTimestamp = lastFetchData?.value_timestamp;
    console.log(
      "Analysis run: Last fetch timestamp was:",
      lastFetchTimestamp ?? "Never (will use default since date)"
    );

    console.log(
      "Analysis run: Fetching historical data for scoring context using pagination..."
    );
    const historicalPosts: PostDataForScoring[] = await fetchAllHistoricalPosts(
      supabase
    );
    console.log(
      `Analysis run: Fetched ${historicalPosts.length} total historical posts for scoring context (after pagination).`
    );

    const newPosts = await fetchNewPostsFromMetaAPI(lastFetchTimestamp);

    if (!newPosts || newPosts.length === 0) {
      console.log("Analysis run: No new posts fetched from Meta API.");
      console.log(
        "Analysis run: Updating last fetch timestamp (no new posts)..."
      );
      const { error: updateTimestampErrorNoNew } = await supabase
        .from("app_metadata")
        .upsert(
          {
            key: LAST_FETCH_TIMESTAMP_KEY,
            value_timestamp: currentTimestampISO,
            updated_at: currentTimestampISO,
          },
          { onConflict: "key" }
        );
      if (updateTimestampErrorNoNew) {
        console.error(
          "Analysis run: Failed to update last fetch timestamp (no new posts):",
          updateTimestampErrorNoNew.message
        );
      } else {
        console.log(
          "Analysis run: Successfully updated last fetch timestamp to (no new posts):",
          currentTimestampISO
        );
      }
      return NextResponse.json(
        { message: "No new posts found to process. Last fetch time updated." },
        { status: 200 }
      );
    }

    console.log(
      `Analysis run: Processing and scoring ${newPosts.length} new posts...`
    );
    const scoredRankedPosts: ScoredPost[] = processAndScoreBatch(
      newPosts,
      historicalPosts,
      ENGAGEMENT_WEIGHTS
    );
    console.log(
      `Analysis run: Scored and ranked ${scoredRankedPosts.length} new posts.`
    );

    const finalUpsertData = scoredRankedPosts.map((scoredPost) => ({
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
    }));

    console.log("Analysis run: Upserting scored data for new posts...");
    if (finalUpsertData.length > 0) {
      const { error: upsertError } = await supabase
        .from("social_posts")
        .upsert(finalUpsertData, { onConflict: "post_id" });
      if (upsertError) {
        console.error(
          "Analysis run: Error upserting scored data:",
          upsertError.message
        );
        throw new Error(`Failed to save scored posts: ${upsertError.message}`);
      }
      console.log(
        `Analysis run: Successfully upserted ${finalUpsertData.length} posts.`
      );
    } else {
      console.log(
        "Analysis run: No new data was processed and scored for upsert (this might be unexpected if new posts were fetched)."
      );
    }

    console.log(
      "Analysis run: Updating last fetch timestamp (after processing new posts)..."
    );
    const { error: updateTimestampError } = await supabase
      .from("app_metadata")
      .upsert(
        {
          key: LAST_FETCH_TIMESTAMP_KEY,
          value_timestamp: currentTimestampISO,
          updated_at: currentTimestampISO,
        },
        { onConflict: "key" }
      );
    if (updateTimestampError) {
      console.error(
        "Analysis run: Failed to update last fetch timestamp:",
        updateTimestampError.message
      );
    } else {
      console.log(
        "Analysis run: Successfully updated last fetch timestamp to:",
        currentTimestampISO
      );
    }

    const duration = Date.now() - startTimestamp;
    console.log(`Analysis run completed successfully in ${duration}ms.`);

    return NextResponse.json(
      {
        message: `Analysis complete. Processed and saved ${scoredRankedPosts.length} new posts.`,
        processedPosts: scoredRankedPosts,
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
