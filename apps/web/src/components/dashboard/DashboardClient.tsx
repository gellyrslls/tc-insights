"use client";

import { useState, useEffect, useCallback } from "react";
import type { DateRange } from "react-day-picker";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar as CalendarIcon, RefreshCw } from "lucide-react";

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

// Corrected import paths
import { DataTable } from "./data-table";
import { columns } from "./columns";

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
};

// No props are needed for this component anymore
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

  const fetchLastUpdated = async () => {
    try {
      const response = await fetch("/api/v1/metadata/last-updated");
      const data = await response.json();
      if (data.lastUpdated) {
        setLastUpdated(data.lastUpdated);
      }
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
      if (customDateRange.to) {
        params.append("endDate", format(customDateRange.to, "yyyy-MM-dd"));
      }
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
      {/* Page Header */}
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

      {/* Filters and Table Section */}
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
            onValueChange={(value: string) => {
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
    </TooltipProvider>
  );
}
