"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { FolderGit2, Star } from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GitHubReposPage } from "@/features/github/types";
import { cn } from "@/lib/utils";

async function fetchReposPage(page: number): Promise<GitHubReposPage> {
  const response = await fetch(`/api/github/repos?page=${page}`);

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Failed to fetch repositories");
  }

  return response.json() as Promise<GitHubReposPage>;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReposList() {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["github-repos"],
    queryFn: ({ pageParam }) => fetchReposPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.hasMore ? lastPageParam + 1 : undefined,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const repos = data?.pages.flatMap((page) => page.repos) ?? [];
  const totalCount = data?.pages[0]?.totalCount;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGit2 />
          </EmptyMedia>
          <EmptyTitle>Could not load repositories</EmptyTitle>
          <EmptyDescription>
            {error instanceof Error ? error.message : "An error occurred."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (repos.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderGit2 />
          </EmptyMedia>
          <EmptyTitle>No repositories found</EmptyTitle>
          <EmptyDescription>
            Grant the GitHub App access to repositories on the installation
            page, then refresh.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {totalCount !== undefined ? (
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "repository" : "repositories"}{" "}
          accessible to the app
        </p>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Default branch</TableHead>
            <TableHead>Language</TableHead>
            <TableHead className="text-right">Stars</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {repos.map((repo) => (
            <TableRow key={repo.id}>
              <TableCell className="font-medium">{repo.fullName}</TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium capitalize",
                    repo.visibility === "private"
                      ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400"
                  )}
                >
                  {repo.visibility}
                </Badge>
              </TableCell>
              <TableCell>{repo.defaultBranch}</TableCell>
              <TableCell>{repo.language ?? "—"}</TableCell>
              <TableCell className="text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <Star className="size-3.5 text-muted-foreground" />
                  {repo.stars}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatUpdatedAt(repo.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
