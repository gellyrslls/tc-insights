"use client";

import { useState, useEffect, useCallback, useRef } from "react"; // Import useRef
import { format, formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  Facebook,
  Instagram,
  Calendar as CalendarIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { type DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataTable } from "./data-table";
import { toast } from "sonner";
import SignOutButton from "../auth/SignOutButton";
import { PostInsightModal } from "./PostInsightModal";
import { cn } from "@/lib/utils";

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
  caption?: string | null;
  image_url?: string | null;
};

interface DashboardClientProps {
  user: User;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Filter states
  const [platform, setPlatform] = useState("all");
  const [timePeriod, setTimePeriod] = useState("overall");
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [analysisText, setAnalysisText] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isInsightSaving, setIsInsightSaving] = useState(false);

  const hasActiveFilters =
    platform !== "all" || timePeriod !== "overall" || !!date;

  // *** START OF THE FINAL FIX ***

  // 1. Create a ref to track the state of a user's date selection "session".
  // This does not cause re-renders and persists across them.
  const isDateSelectionInProgress = useRef(false);

  const fetchPosts = useCallback(
    async (
      currentPlatform: string,
      currentPeriod: string,
      currentDate?: DateRange
    ) => {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (currentPlatform !== "all") {
        params.append("platform", currentPlatform);
      }

      if (currentPeriod === "custom" && currentDate?.from && currentDate?.to) {
        params.append("startDate", format(currentDate.from, "yyyy-MM-dd"));
        params.append("endDate", format(currentDate.to, "yyyy-MM-dd"));
      } else if (currentPeriod !== "overall") {
        params.append("period", currentPeriod);
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
        toast.error("Error: Could not fetch posts.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // 2. Create a handler for when the popover opens or closes.
  const handleDatePopoverOpenChange = (open: boolean) => {
    // When the popover opens, we know the user is starting a NEW selection.
    // So, we set our ref to true.
    if (open) {
      isDateSelectionInProgress.current = true;
    }
  };

  // 3. Create the definitive handler for date selection.
  const handleDateSelect = (range: DateRange | undefined) => {
    // Always update the state for immediate UI feedback.
    setDate(range);

    // If our ref is true, it means this is the FIRST click.
    if (isDateSelectionInProgress.current) {
      // It's the first click, so we do NOT fetch. We just set the ref to false
      // to signal that the next click will be the second one.
      isDateSelectionInProgress.current = false;
      return; // Stop execution here.
    }

    // If the ref was already false, it means this is the SECOND click.
    // Now we can safely check for a complete range and fetch.
    if (range?.from && range?.to) {
      setTimePeriod("custom");
      fetchPosts(platform, "custom", range);
    }
  };

  // *** END OF THE FINAL FIX ***

  // Effect for initial data load ONLY
  useEffect(() => {
    fetchPosts("all", "overall", undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPost) {
      const fetchInsight = async () => {
        setIsInsightLoading(true);
        try {
          const response = await fetch(
            `/api/v1/insights/${selectedPost.post_id}`
          );
          if (!response.ok) throw new Error("Failed to fetch insight.");
          const data = await response.json();
          setAnalysisText(data.qualitative_analysis || "");
        } catch (error) {
          console.error(error);
          toast.error("Error: Could not fetch existing insight.");
        } finally {
          setIsInsightLoading(false);
        }
      };
      fetchInsight();
    }
  }, [selectedPost]);

  const handleAddInsightClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleCloseDialog = () => {
    setSelectedPost(null);
    setAnalysisText("");
  };

  const handleSaveInsight = async () => {
    if (!selectedPost) return;
    setIsInsightSaving(true);
    try {
      const response = await fetch(`/api/v1/insights/${selectedPost.post_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisText }),
      });
      if (!response.ok) throw new Error("Failed to save insight.");
      toast.success("Insight saved successfully!");
      await fetchPosts(platform, timePeriod, date);
      handleCloseDialog();
    } catch (error) {
      console.error(error);
      toast.error("Error: Could not save insight.");
    } finally {
      setIsInsightSaving(false);
    }
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
        const platformValue: "Facebook" | "Instagram" =
          row.getValue("platform");
        return (
          <div className="flex items-center space-x-2">
            {platformValue === "Facebook" ? (
              <Facebook className="w-4 h-4 text-blue-600" />
            ) : (
              <Instagram className="w-4 h-4 text-pink-600" />
            )}
            <span className="text-sm">{platformValue}</span>
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

  useEffect(() => {
    fetchLastUpdated();
  }, [fetchLastUpdated]);

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
      await fetchPosts(platform, timePeriod, date);
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
                Hi, {displayName} ツ
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
            <div className="flex flex-wrap items-center gap-4">
              <Select
                value={platform}
                onValueChange={(value) => {
                  setPlatform(value);
                  fetchPosts(value, timePeriod, date);
                }}
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
                onValueChange={(value) => {
                  if (value !== "custom") {
                    setDate(undefined);
                    setTimePeriod(value);
                    fetchPosts(platform, value, undefined);
                  }
                }}
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

              {/* 4. Wire up the new handlers to the Popover and Calendar */}
              <Popover onOpenChange={handleDatePopoverOpenChange}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[260px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                    disabled={isLoading || isUpdating}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={handleDateSelect}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPlatform("all");
                    setTimePeriod("overall");
                    setDate(undefined);
                    fetchPosts("all", "overall", undefined);
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <Card>
            <DataTable
              columns={columns}
              data={posts}
              onRowClick={handleAddInsightClick}
            />
          </Card>
        </main>

        <PostInsightModal
          isOpen={!!selectedPost}
          onClose={handleCloseDialog}
          post={selectedPost}
          insight={analysisText}
          onInsightChange={setAnalysisText}
          onSave={handleSaveInsight}
          isLoading={isInsightLoading}
          isSaving={isInsightSaving}
        />
      </div>
    </TooltipProvider>
  );
}
