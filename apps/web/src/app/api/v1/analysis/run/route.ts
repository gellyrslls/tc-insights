import { createClient } from '@/lib/supabase/server';
import { isUserAllowed } from '@/lib/authUtils';
import {
  processAndScoreBatch,
  type PostDataForScoring,
  type MetricWeights,
  type ScoredPost,
} from '@/lib/scoringUtils';
import { NextResponse, type NextRequest } from 'next/server';

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

// For Facebook published_posts and Instagram media list
interface MetaPostOrMediaItem {
  id: string;
  created_time?: string; // Facebook
  timestamp?: string;    // Instagram
  permalink_url?: string; // Facebook
  permalink?: string;     // Instagram
  message?: string;       // Facebook
  caption?: string;       // Instagram
  media_type?: string;    // Instagram
  // Add other direct fields if you fetch them like like_count, comments_count for IG
}

interface MetaFeedResponse {
  data: MetaPostOrMediaItem[];
  paging?: MetaPaging;
  error?: MetaApiErrorDetail; // For direct error on feed response
}

// For Instagram Business Account ID
interface InstagramBusinessAccountData {
  id: string;
}
interface InstagramBusinessAccountResponse {
  instagram_business_account?: InstagramBusinessAccountData;
  id?: string; // The page ID itself is also returned
  error?: MetaApiErrorDetail;
}

// For Facebook Post Insights (simplified)
interface MetaInsightValue {
  value?: number | Record<string, number> | string; // Value can be number, object (reactions), or sometimes string
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

// For Facebook Comments/Shares summary
interface MetaSummary {
  total_count: number;
  // ... other summary fields if any
}
interface MetaCommentsSharesResponse {
  summary?: MetaSummary;
  data?: unknown[]; // data array might be empty if limit=0
  error?: MetaApiErrorDetail;
}
// --- END TYPE DEFINITIONS FOR META API RESPONSES ---


// Define the weights
const ENGAGEMENT_WEIGHTS: MetricWeights = {
  views: 0.15,
  reach: 0.25,
  interactions: 0.5,
  link_clicks: 0.1,
};
const LAST_FETCH_TIMESTAMP_KEY = 'last_meta_fetch_timestamp';

async function fetchNewPostsFromMetaAPI(
  since?: string
): Promise<PostDataForScoring[]> {
  console.log(`Fetching new posts from Meta API${since ? ` since ${since}` : ''}...`);
  
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  
  if (!pageAccessToken || !pageId) {
    console.error("Missing required environment variables: META_PAGE_ACCESS_TOKEN and/or META_PAGE_ID");
    throw new Error("Meta API configuration is incomplete. Please check environment variables.");
  }
  
  let sinceUnixTimestamp: number | undefined;
  if (since) {
    try {
      sinceUnixTimestamp = Math.floor(new Date(since).getTime() / 1000);
      console.log(`Using since timestamp: ${since} (Unix: ${sinceUnixTimestamp})`);
    } catch (error) {
      console.error(`Invalid since timestamp: ${since}`, error);
    }
  }
  
  const allPosts: PostDataForScoring[] = [];
  
  try {
    console.log(`Fetching Facebook posts for Page ID: ${pageId}`);
    const facebookPosts = await fetchFacebookPosts(pageId, pageAccessToken, sinceUnixTimestamp);
    console.log(`Retrieved ${facebookPosts.length} Facebook posts`);
    allPosts.push(...facebookPosts);
    
    try {
      const instagramBusinessAccountId = await getInstagramBusinessAccountId(pageId, pageAccessToken);
      if (instagramBusinessAccountId) {
        console.log(`Fetching Instagram posts for IG Business Account ID: ${instagramBusinessAccountId}`);
        const instagramPosts = await fetchInstagramPosts(instagramBusinessAccountId, pageAccessToken, sinceUnixTimestamp);
        console.log(`Retrieved ${instagramPosts.length} Instagram posts`);
        allPosts.push(...instagramPosts);
      } else {
        console.log("No Instagram Business Account linked to this Facebook Page");
      }
    } catch (igError) {
      console.error("Error fetching Instagram posts:", igError);
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
    // ADDED TYPE: InstagramBusinessAccountResponse
    const data: InstagramBusinessAccountResponse = await response.json();
    
    if (!response.ok) {
      console.error("Error getting Instagram Business Account ID:", data.error);
      return null;
    }
    
    if (data.instagram_business_account?.id) {
      return data.instagram_business_account.id;
    }
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
  const initialUrl = `https://graph.facebook.com/v22.0/${pageId}/published_posts?fields=id,created_time,permalink_url,message&limit=25${since ? `&since=${since}` : ''}&access_token=${accessToken}`;
  let nextUrl: string | undefined = initialUrl;
  console.log(`[fetchFacebookPosts] Initial fetch URL: ${nextUrl}`);

  let pagesFetched = 0;
  const MAX_PAGES_TO_FETCH_FOR_TESTING = 1; 

  while (nextUrl && pagesFetched < MAX_PAGES_TO_FETCH_FOR_TESTING) { 
    pagesFetched++; 
    console.log(`[fetchFacebookPosts] Fetching page ${pagesFetched} of max ${MAX_PAGES_TO_FETCH_FOR_TESTING}...`);
    try {
      console.log(`[fetchFacebookPosts] Attempting to fetch: ${nextUrl}`);
      const response = await fetch(nextUrl); // 'response' type is inferred as Response
      console.log(`[fetchFacebookPosts] Response status for ${nextUrl}: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData;
        try {
          // ADDED TYPE: MetaApiErrorResponse
          errorData = await response.json() as MetaApiErrorResponse; 
          console.error("[fetchFacebookPosts] Meta API Error (from response.json()):", errorData.error || errorData);
        } catch (_jsonError) { // eslint-disable-line @typescript-eslint/no-unused-vars
          console.error(`[fetchFacebookPosts] Meta API Error: Status ${response.status} ${response.statusText}. Could not parse error JSON.`);
        }
        break; 
      }

      // ADDED TYPE: MetaFeedResponse
      const data: MetaFeedResponse = await response.json(); 
      console.log(`[fetchFacebookPosts] Raw data received for current page:`, JSON.stringify(data, null, 2).substring(0, 500) + "...");
      
      if (data.data && Array.isArray(data.data)) {
        console.log(`[fetchFacebookPosts] Found ${data.data.length} posts on this page.`);
        for (const post of data.data) { // post type is inferred as MetaPostOrMediaItem
          try {
            console.log(`[fetchFacebookPosts] Processing post ID: ${post.id}`);
            const insights = await fetchFacebookPostInsights(post.id, accessToken);
            posts.push({
              post_id: post.id,
              platform: 'Facebook',
              publish_time: post.created_time || '', // Ensure publish_time is string
              permalink: post.permalink_url,
              views: insights.views,
              reach: insights.reach,
              interactions: insights.interactions,
              link_clicks: insights.link_clicks,
            });
          } catch (insightError) {
            console.error(`Error fetching insights for Facebook post ${post.id}:`, insightError);
          }
        }
      } else {
        console.log("[fetchFacebookPosts] No 'data' array in the response or it's empty for this page.");
      }
      
      nextUrl = data.paging?.next || undefined;
      if (nextUrl) {
        console.log(`[fetchFacebookPosts] Next page URL: ${nextUrl}`);
      } else {
        console.log("[fetchFacebookPosts] No next page found. End of Facebook posts.");
      }
      
    } catch (error) {
      console.error(`[fetchFacebookPosts] Exception during fetch from ${nextUrl || initialUrl}:`, error);
      break;
    }
  }
  if (pagesFetched >= MAX_PAGES_TO_FETCH_FOR_TESTING && nextUrl) { 
    console.log(`[fetchFacebookPosts] Reached MAX_PAGES_TO_FETCH_FOR_TESTING limit of ${MAX_PAGES_TO_FETCH_FOR_TESTING} pages. More posts might be available.`);
  }
  return posts;
}

async function fetchFacebookPostInsights(
  postId: string, 
  accessToken: string
): Promise<{ views: number; reach: number; interactions: number; link_clicks: number }> {
  const insightsUrl = `https://graph.facebook.com/v22.0/${postId}/insights?metric=post_impressions,post_impressions_unique&access_token=${accessToken}`;
  const reactionsUrl = `https://graph.facebook.com/v22.0/${postId}/insights?metric=post_reactions_by_type_total&access_token=${accessToken}`;
  const commentsUrl = `https://graph.facebook.com/v22.0/${postId}/comments?summary=true&limit=0&access_token=${accessToken}`;
  const sharesUrl = `https://graph.facebook.com/v22.0/${postId}/sharedposts?summary=true&limit=0&access_token=${accessToken}`; // Or use post fields=shares
  const clicksUrl = `https://graph.facebook.com/v22.0/${postId}/insights?metric=post_clicks_by_type&access_token=${accessToken}`;
  
  try {
    const responses = await Promise.all([ // 'responses' type is inferred
      fetch(insightsUrl), fetch(reactionsUrl), fetch(commentsUrl), fetch(sharesUrl), fetch(clicksUrl)
    ]);
    
    // ADDED TYPE: for parsed JSON data
    const [insightsData, reactionsData, commentsData, sharesData, clicksData] = 
      await Promise.all(responses.map(res => res.json())) as [MetaInsightsResponse, MetaInsightsResponse, MetaCommentsSharesResponse, MetaCommentsSharesResponse, MetaInsightsResponse];
    
    let views = 0;
    let reach = 0;
    let totalReactions = 0;
    let commentCount = 0;
    let shareCount = 0;
    let linkClicks = 0;
    
    if (insightsData.data) {
      const impressionsData = insightsData.data.find((item: MetaInsightEntry) => item.name === 'post_impressions');
      if (typeof impressionsData?.values?.[0]?.value === 'number') {
        views = impressionsData.values[0].value;
      }
      
      const reachData = insightsData.data.find((item: MetaInsightEntry) => item.name === 'post_impressions_unique');
      if (typeof reachData?.values?.[0]?.value === 'number') {
        reach = reachData.values[0].value;
      }
    }
    
    if (reactionsData.data?.[0]?.values?.[0]?.value) {
      const reactionsValue = reactionsData.data[0].values[0].value;
      if (typeof reactionsValue === 'object' && reactionsValue !== null) {
        totalReactions = Object.values(reactionsValue).reduce((sum, count) => sum + (Number(count) || 0), 0);
      }
    }
    
    if (commentsData.summary?.total_count) {
      commentCount = commentsData.summary.total_count;
    }
    
    // For shares, check if sharesData.summary exists (it might not if there are no shares or endpoint is different)
    if (sharesData.summary?.total_count) {
        shareCount = sharesData.summary.total_count;
    } else {
        // Fallback or alternative: sometimes 'shares' is a top-level field on the post object itself
        // This function only gets insights, so if sharesUrl doesn't return summary, it will be 0.
        // Consider fetching 'shares{count}' in the main fetchFacebookPosts fields if this is unreliable.
    }
    
    if (clicksData.data?.[0]?.values?.[0]?.value) {
      const clicksValue = clicksData.data[0].values[0].value as Record<string, number>; // Assuming it's Record<string, number>
      linkClicks = clicksValue.link_clicks || 0;
    }
    
    const interactions = totalReactions + commentCount + shareCount;
    
    return { views, reach, interactions, link_clicks: linkClicks };
  } catch (error) {
    console.error(`Error fetching insights for post ${postId}:`, error);
    return { views: 0, reach: 0, interactions: 0, link_clicks: 0 };
  }
}

async function fetchInstagramPosts(
  igBusinessId: string,
  accessToken: string,
  since?: number
): Promise<PostDataForScoring[]> {
  const posts: PostDataForScoring[] = [];
  const initialUrl = `https://graph.facebook.com/v22.0/${igBusinessId}/media?fields=id,timestamp,permalink,media_type,caption&limit=25${since ? `&since=${since}` : ''}&access_token=${accessToken}`;
  let nextUrl: string | undefined = initialUrl; 
  console.log(`[fetchInstagramPosts] Initial fetch URL: ${nextUrl}`);

  let pagesFetchedIG = 0;
  const MAX_PAGES_TO_FETCH_FOR_TESTING_IG = 1; 

  while (nextUrl && pagesFetchedIG < MAX_PAGES_TO_FETCH_FOR_TESTING_IG) { 
    pagesFetchedIG++; 
    console.log(`[fetchInstagramPosts] Fetching IG page ${pagesFetchedIG} of max ${MAX_PAGES_TO_FETCH_FOR_TESTING_IG}...`);
    try {
      console.log(`[fetchInstagramPosts] Attempting to fetch: ${nextUrl}`); 
      const response = await fetch(nextUrl); // 'response' type is inferred as Response
      console.log(`[fetchInstagramPosts] Response status for ${nextUrl}: ${response.status} ${response.statusText}`); 

      if (!response.ok) {
        let errorData;
        try {
          // ADDED TYPE: MetaApiErrorResponse
          errorData = await response.json() as MetaApiErrorResponse; 
          console.error("[fetchInstagramPosts] Meta API Error (from response.json()):", errorData.error || errorData);
        } catch (_jsonError) { // eslint-disable-line @typescript-eslint/no-unused-vars
          console.error(`[fetchInstagramPosts] Meta API Error: Status ${response.status} ${response.statusText}. Could not parse error JSON.`);
        }
        break;
      }
      
      // ADDED TYPE: MetaFeedResponse
      const data: MetaFeedResponse = await response.json(); 
      console.log(`[fetchInstagramPosts] Raw data received for IG page:`, JSON.stringify(data, null, 2).substring(0, 500) + "..."); 

      if (data.data && Array.isArray(data.data)) {
        console.log(`[fetchInstagramPosts] Found ${data.data.length} IG media on this page.`); 
        for (const media of data.data) { // media type is inferred as MetaPostOrMediaItem
          try {
            console.log(`[fetchInstagramPosts] Processing IG media ID: ${media.id}`); 
            const insights = await fetchInstagramMediaInsights(media.id, accessToken);
            posts.push({
              post_id: media.id,
              platform: 'Instagram',
              publish_time: media.timestamp || '', // Ensure publish_time is string
              permalink: media.permalink,
              views: insights.impressions, 
              reach: insights.reach,
              interactions: insights.engagement,
              link_clicks: 0, 
            });
          } catch (insightError) {
            console.error(`Error fetching insights for Instagram media ${media.id}:`, insightError);
          }
        }
      } else {
        console.log("[fetchInstagramPosts] No 'data' array in the IG response or it's empty for this page."); 
      }
      
      nextUrl = data.paging?.next || undefined; 
      if (nextUrl) {
        console.log(`[fetchInstagramPosts] Next IG page URL: ${nextUrl}`); 
      } else {
        console.log("[fetchInstagramPosts] No next IG page found. End of Instagram media."); 
      }
      
    } catch (error) {
      console.error(`[fetchInstagramPosts] Exception during fetch from ${nextUrl || initialUrl}:`, error);
      break;
    }
  }
  if (pagesFetchedIG >= MAX_PAGES_TO_FETCH_FOR_TESTING_IG && nextUrl) {
    console.log(`[fetchInstagramPosts] Reached MAX_PAGES_TO_FETCH_FOR_TESTING_IG limit of ${MAX_PAGES_TO_FETCH_FOR_TESTING_IG} pages. More IG media might be available.`);
  }
  return posts;
}

async function fetchInstagramMediaInsights(
  mediaId: string,
  accessToken: string
): Promise<{ impressions: number; reach: number; engagement: number }> { 

  const insightsMetrics = 'views,reach,likes,comments,saved';
  const url = `https://graph.facebook.com/v22.0/${mediaId}/insights?metric=${insightsMetrics}&access_token=${accessToken}`;
  console.log(`[fetchInstagramMediaInsights] Fetching insights for media ${mediaId} with URL: ${url}`);

  try {
    const response = await fetch(url); // 'response' type is inferred
    // ADDED TYPE: MetaInsightsResponse
    const data: MetaInsightsResponse = await response.json(); 
    console.log(`[fetchInstagramMediaInsights] Raw insights data for media ${mediaId}:`, data);

    if (!response.ok) {
      console.error(`Error fetching Instagram insights for media ${mediaId}:`, data.error || `Status: ${response.status}`);
      if (data.error) {
          console.error(`Meta API Error Details: Type: ${data.error.type}, Code: ${data.error.code}, Message: ${data.error.message}, FBTrace ID: ${data.error.fbtrace_id}`);
      }
      return { impressions: 0, reach: 0, engagement: 0 };
    }

    let apiViews = 0; 
    let reach = 0;
    let likes = 0;
    let comments = 0;
    let saved = 0;

    if (data.data && Array.isArray(data.data)) {
      for (const metric of data.data) { // metric type is inferred as MetaInsightEntry
        const value = metric.values?.[0]?.value;
        if (value === undefined || value === null) continue;

        if (metric.name === 'views') { 
          apiViews = Number(value) || 0;
        } else if (metric.name === 'reach') {
          reach = Number(value) || 0;
        } else if (metric.name === 'likes') {
          likes = Number(value) || 0;
        } else if (metric.name === 'comments') {
          comments = Number(value) || 0;
        } else if (metric.name === 'saved') {
          saved = Number(value) || 0;
        }
      }
    }
    
    const finalCalculatedEngagement = likes + comments + saved;
    console.log(`[fetchInstagramMediaInsights] Processed insights for ${mediaId}: apiViews=${apiViews}, reach=${reach}, likes=${likes}, comments=${comments}, saved=${saved}, finalEngagement=${finalCalculatedEngagement}`);
    return { impressions: apiViews, reach, engagement: finalCalculatedEngagement };
  } catch (error) {
    console.error(`Exception fetching Instagram insights for media ${mediaId}:`, error);
    return { impressions: 0, reach: 0, engagement: 0 };
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const allowed = await isUserAllowed(user.email, supabase);
  if (!allowed) {
    console.error(`Analysis run: Forbidden access attempt by ${user.email}.`);
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
      console.error("Analysis run: Error reading last fetch timestamp:", lastFetchError.message);
    }
    const lastFetchTimestamp = lastFetchData?.value_timestamp;
    console.log("Analysis run: Last fetch timestamp was:", lastFetchTimestamp ?? "Never");

    console.log("Analysis run: Fetching historical data...");
    const { data: historicalDataRaw, error: historyError } = await supabase
      .from("social_posts")
      .select("post_id, platform, publish_time, permalink, views, reach, interactions, link_clicks");

    if (historyError) {
      console.error("Analysis run: Error fetching historical data:", historyError.message);
      throw new Error(`Failed to fetch historical data: ${historyError.message}`);
    }
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
    console.log(`Analysis run: Fetched ${historicalPosts.length} historical posts.`);

    const newPosts = await fetchNewPostsFromMetaAPI(lastFetchTimestamp); 
    if (!newPosts || newPosts.length === 0) {
      console.log("Analysis run: No new posts fetched from Meta API.");

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
      return NextResponse.json({ message: "No new posts found to process." },{ status: 200 });
    }

    console.log("Analysis run: Processing and scoring new batch...");
    const scoredRankedPosts: ScoredPost[] = processAndScoreBatch(
      newPosts,
      historicalPosts,
      ENGAGEMENT_WEIGHTS
    );
    console.log(`Analysis run: Scored and ranked ${scoredRankedPosts.length} posts.`);

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

    console.log("Analysis run: Upserting scored data...");
    if (finalUpsertData.length > 0) { 
      const { error: upsertError } = await supabase
        .from("social_posts")
        .upsert(finalUpsertData, { onConflict: "post_id" });

      if (upsertError) {
        console.error("Analysis run: Error upserting scored data:", upsertError.message);
        throw new Error(`Failed to save scored posts: ${upsertError.message}`);
      }
      console.log(`Analysis run: Successfully upserted ${finalUpsertData.length} posts.`);
    } else {
        console.log("Analysis run: No data prepared for upsert (this shouldn't happen if new posts were found).");
    }

    console.log("Analysis run: Updating last fetch timestamp...");
    const { error: updateTimestampError } = await supabase
        .from('app_metadata')
        .update({ value_timestamp: currentTimestampISO, updated_at: currentTimestampISO })
        .eq('key', LAST_FETCH_TIMESTAMP_KEY);

    if (updateTimestampError) {
        console.error("Analysis run: Failed to update last fetch timestamp:", updateTimestampError.message);
    } else {
        console.log("Analysis run: Successfully updated last fetch timestamp to:", currentTimestampISO);
    }
    
    const duration = Date.now() - startTimestamp;
    console.log(`Analysis run completed successfully in ${duration}ms.`);

    return NextResponse.json({
        message: `Analysis complete. Processed ${scoredRankedPosts.length} new posts.`,
        processedPosts: scoredRankedPosts, 
      },{ status: 200 });

  } catch (error: unknown) {
    const duration = Date.now() - startTimestamp;
    console.error(`Analysis run failed after ${duration}ms:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during analysis.";
    return NextResponse.json({ error: "Analysis run failed", details: errorMessage },{ status: 500 });
  }
}