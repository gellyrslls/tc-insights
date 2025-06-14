export type MetricKey = "views" | "reach" | "interactions" | "link_clicks";

export interface PostDataForScoring {
  post_id: string;
  platform: string;
  publish_time: string;
  permalink?: string | null;
  caption?: string | null;
  image_url?: string | null;
  views?: number | string | null;
  reach?: number | string | null;
  interactions?: number | string | null;
  link_clicks?: number | string | null;
}

export type MetricWeights = {
  [key in MetricKey]?: number;
};

// Structure for the final output
export interface ScoredPost {
  post_id: string;
  platform: string;
  publish_time: string;
  permalink?: string | null;
  caption?: string | null;
  image_url?: string | null;
  // Cleaned numeric metrics
  views: number;
  reach: number;
  interactions: number;
  link_clicks: number;
  // Final calculated score
  composite_score: number;
  // Rank
  rank_within_batch: number;
}

export const metricKeys: MetricKey[] = [
  "views",
  "reach",
  "interactions",
  "link_clicks",
];

function cleanMetricValue(value: unknown): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  if (typeof value === "string") {
    const cleanedString = value.replace(/,/g, "").trim();
    if (cleanedString === "") return 0;
    const num = Number(cleanedString);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

type CleanedPost = {
  post_id: string;
  platform: string;
  publish_time: string;
  permalink?: string | null;
  caption?: string | null;
  image_url?: string | null;
  views: number;
  reach: number;
  interactions: number;
  link_clicks: number;
};

function cleanPostMetrics(post: PostDataForScoring): CleanedPost {
  return {
    post_id: post.post_id,
    platform: post.platform,
    publish_time: post.publish_time,
    permalink: post.permalink,
    caption: post.caption,
    image_url: post.image_url,
    views: cleanMetricValue(post.views),
    reach: cleanMetricValue(post.reach),
    interactions: cleanMetricValue(post.interactions),
    link_clicks: cleanMetricValue(post.link_clicks),
  };
}

function calculatePercentileScores(
  posts: CleanedPost[],
  weights: MetricWeights
): (CleanedPost & { composite_score: number })[] {
  if (posts.length === 0) {
    return [];
  }

  const postsWithRawPerf = posts.map((post) => {
    const raw_performance = metricKeys.reduce((acc, key) => {
      const weight = weights[key] ?? 0;
      const value = post[key] ?? 0;
      return acc + value * weight;
    }, 0);
    return { ...post, raw_performance };
  });

  postsWithRawPerf.sort((a, b) => b.raw_performance - a.raw_performance);

  const totalPosts = postsWithRawPerf.length;
  const scoredPosts = postsWithRawPerf.map((post, index) => {
    const rank = index + 1;
    const percentile =
      totalPosts > 1 ? ((totalPosts - rank) / (totalPosts - 1)) * 100 : 100;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { raw_performance, ...restOfPost } = post;
    return {
      ...restOfPost,
      composite_score: percentile,
    };
  });

  return scoredPosts;
}

export function rankPosts<T extends { composite_score: number }>(
  posts: T[]
): (T & { rank_within_batch: number })[] {
  const sortedPosts = [...posts].sort(
    (a, b) => b.composite_score - a.composite_score
  );
  let rank = 1;
  let count = 0;
  let lastScore = -Infinity;

  const rankedPosts = sortedPosts.map((post) => {
    count++;
    if (post.composite_score !== lastScore) {
      rank = count;
      lastScore = post.composite_score;
    }
    return { ...post, rank_within_batch: rank };
  });
  return rankedPosts;
}

// --- Orchestration Function ---
export function processAndScoreBatch(
  newPostsRaw: PostDataForScoring[],
  historicalPostsRaw: PostDataForScoring[],
  weights: MetricWeights
): ScoredPost[] {
  console.log(
    `Starting PERCENTILE-BASED processing for ${newPostsRaw.length} new posts and ${historicalPostsRaw.length} historical posts.`
  );

  const uniquePostsMap = new Map(
    historicalPostsRaw.map((post) => [post.post_id, post])
  );
  newPostsRaw.forEach((post) => {
    uniquePostsMap.set(post.post_id, post);
  });

  const allUniquePosts = Array.from(uniquePostsMap.values());
  console.log(
    `Combined and de-duplicated posts. Total unique posts for scoring context: ${allUniquePosts.length}`
  );

  const allCleanedPosts = allUniquePosts.map(cleanPostMetrics);

  const allFacebookPosts = allCleanedPosts.filter(
    (p) => p.platform === "Facebook"
  );
  const allInstagramPosts = allCleanedPosts.filter(
    (p) => p.platform === "Instagram"
  );

  const allScoredPosts: (CleanedPost & { composite_score: number })[] = [];

  if (allFacebookPosts.length > 0) {
    console.log(`Scoring ${allFacebookPosts.length} Facebook posts...`);
    const scoredFacebookPosts = calculatePercentileScores(
      allFacebookPosts,
      weights
    );
    allScoredPosts.push(...scoredFacebookPosts);
  }

  if (allInstagramPosts.length > 0) {
    console.log(`Scoring ${allInstagramPosts.length} Instagram posts...`);
    const scoredInstagramPosts = calculatePercentileScores(
      allInstagramPosts,
      weights
    );
    allScoredPosts.push(...scoredInstagramPosts);
  }

  if (allScoredPosts.length === 0) {
    console.log("No posts were available to be scored.");
    return [];
  }

  const postsToUpsert = allScoredPosts;
  console.log(
    `Identified ${postsToUpsert.length} total posts to save to the database.`
  );

  const rankedPostsToUpsert = rankPosts(postsToUpsert);
  console.log(`Ranked ${rankedPostsToUpsert.length} posts for this batch.`);

  return rankedPostsToUpsert;
}
