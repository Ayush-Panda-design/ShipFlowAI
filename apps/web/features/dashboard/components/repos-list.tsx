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
import { LoadingListRows } from "@/components/ui/loading-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GitHubRepo, GitHubReposPage } from "@/features/github/types";
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

export function ReposList({
  renderActions,
  onRepoClick,
}: {
  renderActions?: (repo: GitHubRepo) => React.ReactNode;
  onRepoClick?: (repo: GitHubRepo) => void;
}) {
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
    return <LoadingListRows rows={5} variant="repos" />;
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
            {renderActions ? <TableHead className="text-right">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {repos.map((repo) => (
            <TableRow key={repo.id}>
              <TableCell className="font-medium">
                {onRepoClick ? (
                  <button
                    type="button"
                    onClick={() => onRepoClick(repo)}
                    className="text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title="View pull requests and reviews"
                  >
                    {repo.fullName}
                  </button>
                ) : (
                  repo.fullName
                )}
              </TableCell>
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
              {renderActions ? (
                <TableCell className="text-right">{renderActions(repo)}</TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div ref={sentinelRef} className="h-1" />

      {isFetchingNextPage ? <LoadingListRows rows={3} variant="repos" /> : null}
    </div>
  );
}
