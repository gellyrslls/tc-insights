export type MetricKey = 'views' | 'reach' | 'interactions' | 'link_clicks';

export interface PostDataForScoring {
  post_id: string;
  views?: number | string | null;
  reach?: number | string | null;
  interactions?: number | string | null;
  link_clicks?: number | string | null;
}

export type MetricMinMax = {
  [key in MetricKey]?: { min: number; max: number };
};

export type MetricWeights = {
  [key in MetricKey]?: number;
};

// Structure for the final output, including normalized values
export interface ScoredPost {
  post_id: string;
  // Cleaned numeric metrics
  views: number;
  reach: number;
  interactions: number;
  link_clicks: number;
  // Normalized metrics
  views_norm: number; // Make non-optional in the final output
  reach_norm: number;
  interactions_norm: number;
  link_clicks_norm: number;
  // Final calculated score
  composite_score: number;
  // Rank
  rank_within_batch: number; // Make non-optional in the final output
}

export const metricKeys: MetricKey[] = ['views', 'reach', 'interactions', 'link_clicks'];

function cleanMetricValue(value: unknown): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const cleanedString = value.replace(/,/g, '').trim();
      if (cleanedString === '') return 0;
      const num = Number(cleanedString);
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

type CleanedPost = {
    post_id: string;
    views: number;
    reach: number;
    interactions: number;
    link_clicks: number;
};

function cleanPostMetrics(post: PostDataForScoring): CleanedPost {
    return {
      post_id: post.post_id,
      views: cleanMetricValue(post.views),
      reach: cleanMetricValue(post.reach),
      interactions: cleanMetricValue(post.interactions),
      link_clicks: cleanMetricValue(post.link_clicks),
    };
  }

export function calculateMinMaxValues(
    cleanedPosts: CleanedPost[]
  ): MetricMinMax {
    const minMax: MetricMinMax = {};
    if (cleanedPosts.length === 0) return {};

    for (const key of metricKeys) {
      const values = cleanedPosts.map(p => p[key]).filter(v => typeof v === 'number');
      if (values.length > 0) {
        minMax[key] = { min: Math.min(...values), max: Math.max(...values) };
      } else {
        minMax[key] = { min: 0, max: 0 };
      }
    }
    console.log("Calculated Min/Max:", JSON.stringify(minMax, null, 2));
    return minMax;
  }

function normalizeValue(value: number, min: number, max: number): number {
    if (max === min) return 0.0;
    const clampedValue = Math.max(min, Math.min(value, max));
    return (clampedValue - min) / (max - min);
  }

// Type for intermediate scored post including normalized values
type IntermediateScoredPost = CleanedPost & {
    views_norm: number;
    reach_norm: number;
    interactions_norm: number;
    link_clicks_norm: number;
    composite_score: number;
};

function calculatePostScore(
    post: CleanedPost,
    minMaxValues: MetricMinMax,
    weights: MetricWeights
  ): IntermediateScoredPost { // Return type includes normalized values
    let compositeScore = 0;
    const normalizedValues: { [key: string]: number } = {};

    for (const key of metricKeys) {
      const metricMinMax = minMaxValues[key];
      const weight = weights[key] ?? 0;
      let normalized = 0; // Default normalized value

      if (metricMinMax && weight > 0) {
        const rawValue = post[key];
        normalized = normalizeValue(rawValue, metricMinMax.min, metricMinMax.max);
        compositeScore += normalized * weight;
      }
      // Assign normalized value even if weight is 0 or minMax is missing
      normalizedValues[`${key}_norm`] = normalized;
    }

    return {
        ...post, // Spread the cleaned post data (id, views, reach, etc.)
        views_norm: normalizedValues['views_norm'],
        reach_norm: normalizedValues['reach_norm'],
        interactions_norm: normalizedValues['interactions_norm'],
        link_clicks_norm: normalizedValues['link_clicks_norm'],
        composite_score: compositeScore * 100, // Scale score to 0-100
    };
}

// Adjust generic constraint to allow any object with composite_score
export function rankPosts<T extends { composite_score: number }>(
    posts: T[]
  ): (T & { rank_within_batch: number })[] {
    const sortedPosts = [...posts].sort((a, b) => b.composite_score - a.composite_score);
    let rank = 1;
    let count = 0;
    let lastScore = -Infinity;

    const rankedPosts = sortedPosts.map((post) => { // Removed unused index
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
  ): ScoredPost[] { // Return type is the final ScoredPost

    console.log(`Starting processing for ${newPostsRaw.length} new posts and ${historicalPostsRaw.length} historical posts.`);

    const allPostsCleaned = [...newPostsRaw, ...historicalPostsRaw].map(cleanPostMetrics);
    console.log(`Cleaned ${allPostsCleaned.length} total posts.`);

    const minMaxValues = calculateMinMaxValues(allPostsCleaned);
    if (Object.keys(minMaxValues).length === 0 && allPostsCleaned.length > 0) {
        console.warn("Min/Max calculation resulted in empty object. Check input data.");
    }

    const newPostIds = new Set(newPostsRaw.map(p => p.post_id));

    // Calculate scores AND normalized values for NEW posts
    const scoredNewPostsIntermediate: IntermediateScoredPost[] = allPostsCleaned
      .filter(p => newPostIds.has(p.post_id))
      .map(cleanedPost => calculatePostScore(cleanedPost, minMaxValues, weights)); // This now returns IntermediateScoredPost
    console.log(`Calculated scores for ${scoredNewPostsIntermediate.length} new posts.`);

    // Rank the NEW posts (which now include normalized values)
    const rankedNewPosts = rankPosts(scoredNewPostsIntermediate); // rankedNewPosts now have type IntermediateScoredPost & { rank_within_batch: number }
    console.log(`Ranked ${rankedNewPosts.length} new posts.`);

    // The rankedNewPosts array already has the correct shape matching ScoredPost
    // No final mapping needed if IntermediateScoredPost + rank_within_batch matches ScoredPost
    // Ensure ScoredPost definition includes all fields from IntermediateScoredPost + rank_within_batch
    return rankedNewPosts; // Directly return the ranked posts
  }