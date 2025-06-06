"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { type Post } from "./DashboardClient"; // We'll import the type from our client component

export const columns: ColumnDef<Post>[] = [
  {
    accessorKey: "rank",
    header: "Rank",
    cell: ({ row }) => (
      <div className="text-center font-medium">{row.getValue("rank")}</div>
    ),
  },
  {
    accessorKey: "platform",
    header: "Platform",
  },
  {
    accessorKey: "composite_score",
    header: "Score",
    cell: ({ row }) => {
      const score = parseFloat(row.getValue("composite_score"));
      return <div className="font-medium">{score.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "publish_time",
    header: "Published",
    cell: ({ row }) => {
      const date = new Date(row.getValue("publish_time"));
      return <span>{format(date, "LLL dd, yyyy")}</span>;
    },
  },
  {
    accessorKey: "interactions",
    header: "Interactions",
  },
  {
    accessorKey: "reach",
    header: "Reach",
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }) => {
      const post = row.original;
      return (
        <div className="space-x-2 text-right">
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Post
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            Add Insight
          </Button>
        </div>
      );
    },
  },
];
