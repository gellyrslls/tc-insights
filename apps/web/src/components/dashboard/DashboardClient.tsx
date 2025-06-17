"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  Facebook,
  Instagram,
  Calendar as CalendarIcon,
  Search,
  MessageSquareText,
  Trophy,
  Eye,
  Users,
  Heart,
  ExternalLink,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  link_clicks: number | null;
  qualitative_analysis: string | null;
  analyzed_by_email: string | null;
  analysis_timestamp: string | null;
  caption?: string | null;
  image_url?: string | null;
};

interface DashboardClientProps {
  user: User;
}

interface InsightData {
  qualitative_analysis: string | null;
  analyzed_by_email: string | null;
  analysis_timestamp: string | null;
}

const PAGE_SIZE = 10;

export default function DashboardClient({ user }: DashboardClientProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Filter states
  const [platform, setPlatform] = useState("all");
  const [timePeriod, setTimePeriod] = useState("overall");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [insightData, setInsightData] = useState<InsightData | null>(null);
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isInsightSaving, setIsInsightSaving] = useState(false);

  const hasActiveFilters =
    platform !== "all" ||
    timePeriod !== "overall" ||
    !!date ||
    searchQuery !== "";

  const isDateSelectionInProgress = useRef(false);

  const fetchPosts = useCallback(
    async (
      pageToFetch: number,
      currentPlatform: string,
      currentPeriod: string,
      currentDate?: DateRange,
      currentSearchQuery?: string
    ) => {
      setIsLoading(true);
      const params = new URLSearchParams();

      params.append("page", pageToFetch.toString());
      params.append("limit", PAGE_SIZE.toString());

      if (currentPlatform !== "all") {
        params.append("platform", currentPlatform);
      }

      if (currentSearchQuery && currentSearchQuery.trim() !== "") {
        params.append("searchQuery", currentSearchQuery.trim());
      }

      if (currentPeriod === "custom" && currentDate?.from && currentDate?.to) {
        params.append("startDate", format(currentDate.from, "yyyy-MM-dd"));
        params.append("endDate", format(currentDate.to, "yyyy-MM-dd"));
      } else if (currentPeriod !== "overall") {
        params.append("period", currentPeriod);
      }

      try {
        const response = await fetch(`/api/v1/posts?${params.toString()}`);
        if (!response.ok) throw new Error("Failed to fetch posts");
        const { data, totalCount } = await response.json();
        setPosts(data);
        setTotalPosts(totalCount || 0);
      } catch (error) {
        console.error(error);
        toast.error("Error: Could not fetch posts.");
        setPosts([]);
        setTotalPosts(0);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Debouncing for search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // Reset to page 1 when search query changes
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Main data fetching effect
  useEffect(() => {
    fetchPosts(currentPage, platform, timePeriod, date, debouncedSearchQuery);
  }, [
    currentPage,
    platform,
    timePeriod,
    date,
    debouncedSearchQuery,
    fetchPosts,
  ]);

  // Fetch insight for selected post
  useEffect(() => {
    if (selectedPost) {
      const fetchInsight = async () => {
        setIsInsightLoading(true);
        setInsightData(null);
        try {
          const response = await fetch(
            `/api/v1/insights/${selectedPost.post_id}`
          );
          if (!response.ok) throw new Error("Failed to fetch insight.");
          const data: InsightData = await response.json();
          setInsightData(data);
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
    setInsightData(null);
  };

  const handleSaveInsight = async () => {
    if (!selectedPost || !insightData) return;
    setIsInsightSaving(true);
    try {
      const response = await fetch(`/api/v1/insights/${selectedPost.post_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisText: insightData.qualitative_analysis,
        }),
      });
      if (!response.ok) throw new Error("Failed to save insight.");
      toast.success("Insight saved successfully!");
      fetchPosts(currentPage, platform, timePeriod, date, debouncedSearchQuery);
      handleCloseDialog();
    } catch (error) {
      console.error(error);
      toast.error("Error: Could not save insight.");
    } finally {
      setIsInsightSaving(false);
    }
  };

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
      setCurrentPage(1);
      fetchPosts(1, platform, timePeriod, date, debouncedSearchQuery);
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

  // Helper function to format large numbers into K/M format
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return "--";
    if (num === 0) return "0";
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Helper function to get the first sentence of a caption
  const getFirstSentence = (caption: string | null | undefined): string => {
    if (!caption) return "No caption available for this post.";
    const firstSentence = caption.split(/[.!?]/)[0];
    return firstSentence.length > 80
      ? `${firstSentence.substring(0, 80)}...`
      : `${firstSentence}.`;
  };

  // Helper function to get the rank styling
  const getRankStyling = (rank: number): string => {
    if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (rank === 2) return "bg-gray-200 text-gray-800 border-gray-300";
    if (rank === 3) return "bg-orange-100 text-orange-800 border-orange-200";
    if (rank <= 10) return "bg-red-100/60 text-tc-red border-red-200/80";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  const topThreePosts = posts.slice(0, 3);
  const displayName =
    user?.user_metadata?.full_name?.split(" ")[0] || user?.email;
  const totalPages = Math.ceil(totalPosts / PAGE_SIZE);

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
                      {
                        addSuffix: true,
                      }
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

          {!hasActiveFilters && currentPage === 1 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Top Performing Posts
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {topThreePosts.map((post) => (
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
                          #{post.rank}
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
                            {formatNumber(post.interactions)} interactions
                          </span>
                          <span>{formatNumber(post.reach)} reach</span>
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by caption..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 h-9 w-[220px] rounded-md border border-input bg-transparent text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isLoading || isUpdating}
                />
              </div>

              <Select
                value={platform}
                onValueChange={(value) => {
                  setPlatform(value);
                  setCurrentPage(1);
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
                    setCurrentPage(1);
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

              <Popover
                onOpenChange={(open) =>
                  (isDateSelectionInProgress.current = open)
                }
              >
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
                    onSelect={(range) => {
                      setDate(range);
                      if (range?.from && range?.to) {
                        setTimePeriod("custom");
                        setCurrentPage(1);
                      }
                    }}
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
                    setSearchQuery("");
                    setCurrentPage(1);
                  }}
                  disabled={isLoading || isUpdating}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">
                    <Trophy className="inline-block h-4 w-4 mr-1" /> Rank
                  </TableHead>
                  <TableHead className="min-w-[300px]">Post</TableHead>
                  <TableHead className="text-center">
                    <Heart className="inline-block h-4 w-4 mr-1" /> Interactions
                  </TableHead>
                  <TableHead className="text-center">
                    <Users className="inline-block h-4 w-4 mr-1" /> Reach
                  </TableHead>
                  <TableHead className="text-center">
                    <Eye className="inline-block h-4 w-4 mr-1" /> Views
                  </TableHead>
                  <TableHead className="text-center">
                    <ExternalLink className="inline-block h-4 w-4 mr-1" /> Link
                    Clicks
                  </TableHead>
                  <TableHead className="text-center">Date published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <TableRow
                      key={post.post_id}
                      className="cursor-pointer hover:bg-gray-50/80 transition-colors"
                      onClick={() => handleAddInsightClick(post)}
                    >
                      <TableCell className="text-center font-semibold">
                        <div
                          className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center border-2 ${getRankStyling(
                            post.rank
                          )}`}
                        >
                          {post.rank}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-4">
                          <div className="relative flex-shrink-0">
                            <Image
                              src={post.image_url || "/placeholder.svg"}
                              alt="Post thumbnail"
                              width={64}
                              height={64}
                              className="w-16 h-16 object-cover rounded-lg border"
                            />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                              {post.platform === "Facebook" ? (
                                <Facebook className="w-4 h-4 text-blue-600" />
                              ) : (
                                <Instagram className="w-4 h-4 text-pink-600" />
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800 line-clamp-2">
                              {getFirstSentence(post.caption)}
                            </p>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500">
                                Score:{" "}
                                <span className="font-bold text-tc-red">
                                  {post.composite_score.toFixed(1)}
                                </span>
                              </span>
                              {post.qualitative_analysis && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <MessageSquareText className="h-4 w-4 text-blue-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Insight Added</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatNumber(post.interactions)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatNumber(post.reach)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatNumber(post.views)}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatNumber(post.link_clicks)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-gray-600">
                        {format(new Date(post.publish_time), "MMM dd, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {isLoading ? "Loading posts..." : "No results found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          {totalPages > 0 && (
            <div className="flex items-center justify-end space-x-2 py-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({totalPosts} results)
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </main>

        <PostInsightModal
          isOpen={!!selectedPost}
          onClose={handleCloseDialog}
          post={selectedPost}
          insightData={insightData}
          onInsightChange={(text) =>
            setInsightData(
              (prev) => ({ ...prev, qualitative_analysis: text } as InsightData)
            )
          }
          onSave={handleSaveInsight}
          isLoading={isInsightLoading}
          isSaving={isInsightSaving}
        />
      </div>
    </TooltipProvider>
  );
}
