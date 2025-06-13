"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Facebook,
  Instagram,
  Calendar,
  Hash,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import type { Post } from "./DashboardClient";
import Link from "next/link";

interface PostInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  insight: string;
  onInsightChange: (value: string) => void;
  onSave: () => void;
  isLoading: boolean;
  isSaving: boolean;
}

export function PostInsightModal({
  isOpen,
  onClose,
  post,
  insight,
  onInsightChange,
  onSave,
  isLoading,
  isSaving,
}: PostInsightModalProps) {
  if (!post) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add Insight
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900 mb-3">Post Details</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {post.platform === "Facebook" ? (
                    <Facebook className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Instagram className="w-5 h-5 text-pink-600" />
                  )}
                  <Badge variant="secondary" className="text-sm">
                    {post.platform}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-tc-red" />
                  <span className="text-2xl font-bold text-tc-red">
                    {post.composite_score.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 min-w-0">
                  <Hash className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">Post ID:</span>
                  <span className="font-mono bg-white px-2 py-1 rounded border truncate">
                    {post.post_id}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Published:</span>
                  <span>{formatDate(post.publish_time)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Post Caption</h4>
              <div className="bg-white border rounded-lg p-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {post.caption || "No caption available for this post."}
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Your Analysis</h4>
              <Textarea
                value={insight}
                onChange={(e) => onInsightChange(e.target.value)}
                placeholder="Why do you think this post performed that way it did? What was the audience reaction? What are the key takeaways for future posts?"
                className="min-h-[120px] resize-none"
                rows={6}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  {insight.length} characters
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4 border-t sm:justify-between">
          <Button variant="ghost" asChild>
            <Link
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Original Post
            </Link>
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={onSave}
              disabled={
                isSaving || isLoading || (insight || "").trim().length === 0
              }
              className="bg-tc-red hover:bg-tc-darkred"
            >
              {isSaving ? "Saving..." : "Save Insight"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
