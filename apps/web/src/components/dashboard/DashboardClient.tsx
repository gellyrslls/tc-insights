"use client";

import { useState, useEffect, useCallback } from "react";
// import type { DateRange } from "react-day-picker";
import { format, formatDistanceToNow } from "date-fns";
import { RefreshCw, Facebook, Instagram } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "./data-table";
import { toast } from "sonner";
import SignOutButton from "../auth/SignOutButton";

export type Post = {
  rank: number;
  post_id: string;
  platform: "Facebook" | "Instagram";
  permalink: string;
  publish_time: string;
  composite_score: number;
  views: number | null;
  reach: number | null;
  interactions: number | null;
  qualitative_analysis: string | null;
  caption?: string;
  image_url?: string;
};

interface DashboardClientProps {
  user: User;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");
  const [timePeriod, setTimePeriod] = useState("overall");

  // const [customDateRange, _setCustomDateRange] = useState<DateRange | undefined>();

  const [, setSelectedPost] = useState<Post | null>(null);

  const hasActiveFilters = platform !== "all" || timePeriod !== "overall";

  const handleAddInsightClick = (post: Post) => {
    setSelectedPost(post);
    toast.info(
      `Clicked on post #${post.rank}. Insight modal coming in Phase 3!`
    );
  };

  const columns: ColumnDef<Post>[] = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => (
        <div className="text-center font-medium">#{row.getValue("rank")}</div>
      ),
    },
    {
      accessorKey: "platform",
      header: "Platform",
      cell: ({ row }) => {
        const platform: "Facebook" | "Instagram" = row.getValue("platform");
        return (
          <div className="flex items-center space-x-2">
            {platform === "Facebook" ? (
              <Facebook className="w-4 h-4 text-blue-600" />
            ) : (
              <Instagram className="w-4 h-4 text-pink-600" />
            )}
            <span className="text-sm">{platform}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "composite_score",
      header: "Score",
      cell: ({ row }) => (
        <span className="font-semibold text-tc-red">
          {parseFloat(row.getValue("composite_score")).toFixed(1)}
        </span>
      ),
    },
    {
      accessorKey: "publish_time",
      header: "Published",
      cell: ({ row }) => (
        <span className="text-sm text-gray-600">
          {format(new Date(row.getValue("publish_time")), "LLL dd, yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "interactions",
      header: () => <div className="text-right">Interactions</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.interactions?.toLocaleString() || "N/A"}
        </div>
      ),
    },
    {
      accessorKey: "reach",
      header: () => <div className="text-right">Reach</div>,
      cell: ({ row }) => (
        <div className="text-right">
          {row.original.reach?.toLocaleString() || "N/A"}
        </div>
      ),
    },
  ];

  const fetchLastUpdated = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/metadata/last-updated");
      if (!response.ok) return;
      const data = await response.json();
      if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error("Could not fetch last updated timestamp", error);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (platform !== "all") params.append("platform", platform);

    // The logic for custom date range is commented out as it's not currently used in the UI
    // if (timePeriod === "custom" && customDateRange?.from) {
    //   params.append("startDate", format(customDateRange.from, "yyyy-MM-dd"));
    //   if (customDateRange.to)
    //     params.append("endDate", format(customDateRange.to, "yyyy-MM-dd"));
    // } else

    if (timePeriod !== "overall") {
      params.append("period", timePeriod);
    } else {
      params.append("ranking", "overall");
      params.append("limit", "10");
    }
    try {
      const response = await fetch(`/api/v1/posts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data: Post[] = await response.json();
      setPosts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [platform, timePeriod]);

  useEffect(() => {
    fetchPosts();
    fetchLastUpdated();
  }, [fetchPosts, fetchLastUpdated]);

  const handleUpdateData = async () => {
    setIsUpdating(true);
    toast.info("Starting data update from Meta. This may take a moment...");
    try {
      const response = await fetch("/api/v1/analysis/run", { method: "POST" });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || "Failed to update data from Meta."
        );
      }
      await fetchPosts();
      await fetchLastUpdated();
      toast.success("Data updated successfully!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      console.error(error);
      toast.error("Update Failed", { description: errorMessage });
    } finally {
      setIsUpdating(false);
    }
  };

  const topThreePosts = posts.slice(0, 3);
  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] || user?.email;

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 text-black">
        <header className="bg-white border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-tc-red flex items-center justify-center text-white font-bold text-lg">
                TC
              </div>
              <span className="text-xl font-semibold text-gray-900">
                TC Insights
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                Hey, {displayName}
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {lastUpdated
                  ? `Last updated: ${formatDistanceToNow(
                      new Date(lastUpdated),
                      { addSuffix: true }
                    )}`
                  : "Last updated: Never"}
              </span>
              <Button
                onClick={handleUpdateData}
                disabled={isUpdating || isLoading}
                className="bg-tc-red hover:bg-tc-darkred"
              >
                {isUpdating ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isUpdating ? "Updating..." : "Update Data"}
              </Button>
            </div>
          </div>

          {!hasActiveFilters && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Top Performing Posts
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {topThreePosts.map((post, index) => (
                  <Card
                    key={post.post_id}
                    className="cursor-pointer hover:shadow-lg transition-shadow duration-200 overflow-hidden"
                    onClick={() => handleAddInsightClick(post)}
                  >
                    <CardContent className="p-0">
                      <div className="relative">
                        <Image
                          src={post.image_url || "/placeholder.svg"}
                          alt="Post thumbnail"
                          width={300}
                          height={200}
                          className="w-full h-48 object-cover"
                        />
                        <div className="absolute top-3 left-3 bg-white rounded-full p-2 shadow-md">
                          {post.platform === "Facebook" ? (
                            <Facebook className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Instagram className="w-5 h-5 text-pink-600" />
                          )}
                        </div>
                        <div className="absolute top-3 right-3 bg-tc-red text-white px-3 py-1 rounded-full text-sm font-semibold">
                          #{index + 1}
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-tc-red">
                            {post.composite_score.toFixed(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(post.publish_time), "yyyy-MM-dd")}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm line-clamp-3 h-[60px]">
                          {post.caption ||
                            `This is a placeholder caption for post #${post.rank}. The real caption would appear here.`}
                        </p>
                        <div className="flex justify-between mt-3 text-xs text-gray-500">
                          <span>
                            {post.interactions?.toLocaleString() || "N/A"}{" "}
                            interactions
                          </span>
                          <span>
                            {post.reach?.toLocaleString() || "N/A"} reach
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <Select
                value={platform}
                onValueChange={setPlatform}
                disabled={isLoading || isUpdating}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={timePeriod}
                onValueChange={setTimePeriod}
                disabled={isLoading || isUpdating}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Time Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall</SelectItem>
                  <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                  <SelectItem value="last_28_days">Last 28 Days</SelectItem>
                  <SelectItem value="last_90_days">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlatform("all");
                    setTimePeriod("overall");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <Card>
            <DataTable columns={columns} data={posts} />
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
}
