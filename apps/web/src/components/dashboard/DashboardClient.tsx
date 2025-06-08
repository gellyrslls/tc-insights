"use client";

import { useState, useEffect, useCallback } from "react";
import type { DateRange } from "react-day-picker";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar as CalendarIcon, RefreshCw, FileText } from "lucide-react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "./data-table";
import { toast } from "sonner";

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
  qualitative_analysis: string | null; // MODIFIED: Added field for insight check
};

export default function DashboardClient() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [platform, setPlatform] = useState("all");
  const [timePeriod, setTimePeriod] = useState("overall");
  const [customDateRange, setCustomDateRange] = useState<
    DateRange | undefined
  >();

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [analysisText, setAnalysisText] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  const [isInsightSaving, setIsInsightSaving] = useState(false);

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
          alert("Error: Could not fetch existing insight.");
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
      // After saving, refetch the posts to update the UI with the new icon
      await fetchPosts();
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
        <div className="text-center font-medium">{row.getValue("rank")}</div>
      ),
    },
    { accessorKey: "platform", header: "Platform" },
    {
      accessorKey: "composite_score",
      header: "Score",
      cell: ({ row }) => (
        <div className="font-medium">
          {parseFloat(row.getValue("composite_score")).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "publish_time",
      header: "Published",
      cell: ({ row }) => (
        <span>
          {format(new Date(row.getValue("publish_time")), "LLL dd, yyyy")}
        </span>
      ),
    },
    { accessorKey: "interactions", header: "Interactions" },
    { accessorKey: "reach", header: "Reach" },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const post = row.original;
        const hasInsight = !!post.qualitative_analysis;

        return (
          <div className="flex items-center justify-end space-x-2 text-right">
            {hasInsight && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Insight has been saved for this post.</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Post
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddInsightClick(post)}
            >
              {hasInsight ? "Edit Insight" : "Add Insight"}
            </Button>
          </div>
        );
      },
    },
  ];

  const fetchLastUpdated = async () => {
    try {
      const response = await fetch("/api/v1/metadata/last-updated");
      const data = await response.json();
      if (data.lastUpdated) setLastUpdated(data.lastUpdated);
    } catch (error) {
      console.error("Could not fetch last updated timestamp", error);
    }
  };

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (platform !== "all") params.append("platform", platform);
    if (timePeriod === "custom" && customDateRange?.from) {
      params.append("startDate", format(customDateRange.from, "yyyy-MM-dd"));
      if (customDateRange.to)
        params.append("endDate", format(customDateRange.to, "yyyy-MM-dd"));
    } else {
      params.append("period", timePeriod);
    }
    if (timePeriod === "overall") {
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
  }, [platform, timePeriod, customDateRange]);

  useEffect(() => {
    fetchPosts();
    fetchLastUpdated();
  }, [fetchPosts]);

  const handleUpdateData = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/v1/analysis/run", { method: "POST" });
      if (!response.ok) throw new Error("Failed to update data from Meta.");
      await fetchPosts();
      await fetchLastUpdated();
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <TooltipProvider>
      {/* Page Header and Filters... (code unchanged) */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Analyze post performance for Today&apos;s Carolinian.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Tooltip>
            <TooltipTrigger>
              <span className="text-sm text-muted-foreground">
                {lastUpdated
                  ? `Last updated: ${formatDistanceToNow(
                      new Date(lastUpdated),
                      { addSuffix: true }
                    )}`
                  : "Last updated: Never"}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {lastUpdated
                ? format(new Date(lastUpdated), "LLL dd, yyyy, p")
                : "No update has been run yet."}
            </TooltipContent>
          </Tooltip>
          <Button onClick={handleUpdateData} disabled={isUpdating}>
            {isUpdating && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {isUpdating ? "Updating..." : "Update Data"}
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
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
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={timePeriod}
            onValueChange={(value) => {
              setTimePeriod(value);
              if (value !== "custom") setCustomDateRange(undefined);
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
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {timePeriod === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !customDateRange && "text-muted-foreground"
                  )}
                  disabled={isLoading || isUpdating}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "LLL dd, y")} -{" "}
                        {format(customDateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(customDateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customDateRange}
                  onSelect={setCustomDateRange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
        <DataTable columns={columns} data={posts} />
      </div>

      {/* --- Insight Dialog --- */}
      <Dialog
        open={!!selectedPost}
        onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Qualitative Insight</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>
                Platform:{" "}
                <span className="font-medium text-foreground">
                  {selectedPost?.platform}
                </span>
              </p>
              <p>
                Post ID:{" "}
                <span className="font-medium text-foreground">
                  {selectedPost?.post_id}
                </span>
              </p>
            </div>
            {isInsightLoading ? (
              <div className="flex items-center justify-center h-24">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Textarea
                placeholder="Type your analysis here..."
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                rows={6}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveInsight}
              disabled={isInsightSaving || isInsightLoading}
            >
              {isInsightSaving && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isInsightSaving ? "Saving..." : "Save Insight"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
