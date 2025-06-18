"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Clock,
  History,
  HelpCircle,
  Eye,
  Users,
  Heart,
  ExternalLink,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import type { Post } from "./DashboardClient";
import { PostPreviewCard } from "./PostPreviewCard";

interface InsightHistoryEntry {
  analysis_text: string;
  analyzed_by_email: string;
  created_at: string;
}

interface PostInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post | null;
  history: InsightHistoryEntry[] | null;
  onSave: (insightText: string) => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

const insightGuideQuestions = [
  {
    category: "Platform & Audience Analysis",
    questions: [
      "Does this post's performance align with our typical audience for this platform? (e.g., broad university news for Facebook, niche social/political commentary for Instagram).",
      "Why do you think this resonated more (or less) on this specific platform?",
      "Does this post reveal anything new about the audience on this platform? (e.g., a growing interest in a new topic).",
    ],
  },
  {
    category: "Content & Format Strategy",
    questions: [
      "Was the format (e.g., photo album, comic, news update, literary piece) the right choice for this message? Why?",
      "What specific theme does this post fall under (e.g., University Event, Student Life/Humor, Breaking News, Social Issue)? How does this theme typically perform?",
      "What element of the content (visuals, caption, headline) was most responsible for its performance?",
    ],
  },
  {
    category: "Context & Timing",
    questions: [
      "How did the timing of this post affect its performance? (e.g., start of semester, major university event like USC Days, holiday, anniversary like Martial Law).",
      "Was this an 'ASAP' post (breaking news, urgent update)? If so, how did that urgency impact its reach and interaction?",
      "How does this post's performance compare to other posts from the same general time period?",
    ],
  },
  {
    category: "Future Recommendations",
    questions: [
      "What is the key, actionable lesson from this post that we can apply to future content?",
      "Based on this, should we create more or less of this type of content? Should we try it on a different platform?",
      "What is one takeaway from this post that should be included in the next bi-monthly report?",
    ],
  },
];

export function PostInsightModal({
  isOpen,
  onClose,
  post,
  history,
  onSave,
  isLoading,
  isSaving,
}: PostInsightModalProps) {
  const [analysisText, setAnalysisText] = useState("");
  const [rightPanelView, setRightPanelView] = useState<"history" | "guide">(
    "history"
  );

  useEffect(() => {
    if (post && history && history.length > 0) {
      setAnalysisText(history[0].analysis_text);
    } else if (post && post.qualitative_analysis) {
      setAnalysisText(post.qualitative_analysis);
    } else {
      setAnalysisText("");
    }
  }, [post, history]);

  if (!post) return null;

  const handleSaveClick = () => onSave(analysisText);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  const getInitials = (email: string) =>
    email
      ? email
          .split("@")[0]
          .split(".")
          .map((p) => p[0])
          .join("")
          .toUpperCase()
      : "??";

  const formatNumber = (num: number | null) =>
    num || num === 0
      ? new Intl.NumberFormat("en-US", {
          notation: "compact",
          maximumFractionDigits: 1,
        }).format(num)
      : "--";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add Qualitative Insights
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 overflow-y-auto px-6 py-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Post Preview</h3>
              <PostPreviewCard post={post} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                Performance Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Eye, label: "Views", value: post.views },
                  { icon: Users, label: "Reach", value: post.reach },
                  {
                    icon: Heart,
                    label: "Interactions",
                    value: post.interactions,
                  },
                  {
                    icon: ExternalLink,
                    label: "Link Clicks",
                    value: post.link_clicks,
                  },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="bg-gray-50 rounded-lg p-4 text-center border"
                  >
                    <metric.icon className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                    <div className="text-lg font-semibold text-gray-900">
                      {formatNumber(metric.value)}
                    </div>
                    <div className="text-xs text-gray-500">{metric.label}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-tc-red/5 rounded-lg border border-tc-red/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-5 h-5 text-tc-red" />
                    <span className="font-medium text-gray-900">
                      Performance Score
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-tc-red">
                    {post.composite_score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Your Insights</h4>
              <Textarea
                value={analysisText}
                onChange={(e) => setAnalysisText(e.target.value)}
                placeholder="Analyze why this post performed well/poorly, audience reactions, key lessons..."
                className="min-h-[120px] resize-none"
                rows={6}
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-4 h-full border sticky top-0">
              <Tabs
                value={rightPanelView}
                onValueChange={(value) =>
                  setRightPanelView(value as "history" | "guide")
                }
              >
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="history">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                  <TabsTrigger value="guide">
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Guide
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="history" className="mt-0">
                  <div className="space-y-3 max-h-[calc(80vh-150px)] overflow-y-auto pr-2">
                    {isLoading ? (
                      <div className="flex justify-center items-center h-48">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                      </div>
                    ) : history && history.length > 0 ? (
                      history.map((item) => (
                        <div
                          key={item.created_at}
                          className="bg-white rounded-lg p-3 border"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-tc-red/80 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold">
                              {getInitials(item.analyzed_by_email)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-800 leading-relaxed break-words">
                                {item.analysis_text}
                              </p>
                              <div className="flex items-center space-x-2 mt-2 pt-2 border-t">
                                <User className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500 truncate">
                                  {item.analyzed_by_email}
                                </span>
                              </div>
                              <div className="flex items-center space-x-2 mt-1">
                                <Clock className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No previous insights.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="guide" className="mt-0">
                  <div className="space-y-3 max-h-[calc(80vh-150px)] overflow-y-auto pr-2 text-sm text-gray-600">
                    <p className="mb-4">How to provide Insights?</p>
                    {insightGuideQuestions.map((section) => (
                      <div
                        key={section.category}
                        className="bg-white rounded-lg p-3 border"
                      >
                        <h4 className="font-medium text-gray-900 text-sm mb-2">
                          {section.category}
                        </h4>
                        <ul className="space-y-2">
                          {section.questions.map((q) => (
                            <li
                              key={q}
                              className="text-xs text-gray-700 flex items-start"
                            >
                              <span className="text-tc-red mr-2 mt-1">•</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-white flex-shrink-0 flex justify-between">
          <div>
            <Button variant="ghost" asChild>
              <Link
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Original Post
              </Link>
            </Button>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={
                isSaving ||
                isLoading ||
                (analysisText || "").trim().length === 0
              }
              className="bg-tc-red hover:bg-tc-darkred"
            >
              {isSaving && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              Save Insights
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
