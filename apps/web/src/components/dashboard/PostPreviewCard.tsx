"use client";

import {
  Facebook,
  Instagram,
  ThumbsUp,
  MessageCircle,
  Share,
  Heart,
  Bookmark,
} from "lucide-react";
import Image from "next/image";
import type { Post } from "./DashboardClient";

interface PostPreviewCardProps {
  post: Post;
}

const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0";
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export function PostPreviewCard({ post }: PostPreviewCardProps) {
  if (post.platform === "Facebook") {
    return (
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center p-3 bg-white border-b">
          <div className="w-10 h-10 bg-tc-red rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
            TC
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">
              Today&apos;s Carolinian
            </div>
            <div className="text-xs text-gray-500">
              {new Date(post.publish_time).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
          <Facebook className="w-5 h-5 text-blue-600" />
        </div>

        <div className="p-3 space-y-3">
          <div className="max-h-40 overflow-y-auto">
            <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
              {post.caption}
            </p>
          </div>
          {post.image_url && (
            <div className="relative w-full h-72 bg-gray-200 rounded-md overflow-hidden">
              {/* ================================================================== */}
              {/* THE FIX: Changed objectFit from "cover" to "contain".           */}
              {/* ================================================================== */}
              <Image
                src={post.image_url}
                alt="Post content"
                layout="fill"
                objectFit="contain"
              />
            </div>
          )}
        </div>

        <div className="p-2 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2 px-2">
            <span>{formatNumber(post.interactions)} reactions</span>
          </div>
          <div className="flex items-center justify-around pt-1 border-t">
            <button className="flex items-center space-x-1 text-gray-600 hover:bg-gray-200/70 px-3 py-1.5 rounded-md w-full justify-center">
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">Like</span>
            </button>
            <button className="flex items-center space-x-1 text-gray-600 hover:bg-gray-200/70 px-3 py-1.5 rounded-md w-full justify-center">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Comment</span>
            </button>
            <button className="flex items-center space-x-1 text-gray-600 hover:bg-gray-200/70 px-3 py-1.5 rounded-md w-full justify-center">
              <Share className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
          </div>
        </div>
      </div>
    );
  } else {
    // Instagram
    return (
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <div className="flex items-center p-3 bg-white">
          <div className="w-8 h-8 bg-tc-red rounded-full flex items-center justify-center text-white font-bold text-xs mr-3">
            TC
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-sm">
              todayscarolinian
            </div>
          </div>
          <Instagram className="w-5 h-5 text-pink-600" />
        </div>
        {post.image_url && (
          <div className="relative w-full h-80 bg-gray-200">
            {/* ================================================================== */}
            {/* THE FIX: Changed objectFit from "cover" to "contain".           */}
            {/* ================================================================== */}
            <Image
              src={post.image_url}
              alt="Post content"
              layout="fill"
              objectFit="contain"
            />
          </div>
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Heart className="w-6 h-6 text-gray-800" />
              <MessageCircle className="w-6 h-6 text-gray-800 -scale-x-100" />
              <Share className="w-6 h-6 text-gray-800" />
            </div>
            <Bookmark className="w-6 h-6 text-gray-800" />
          </div>
          <div className="text-sm font-semibold text-gray-900">
            {formatNumber(post.interactions)} likes
          </div>
          <div className="text-sm text-gray-900 max-h-24 overflow-y-auto whitespace-pre-wrap">
            <span className="font-semibold mr-1">todayscarolinian</span>
            {post.caption}
          </div>
        </div>
      </div>
    );
  }
}
