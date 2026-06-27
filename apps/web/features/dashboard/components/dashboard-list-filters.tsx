"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DashboardListFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  resultCount?: number;
  totalCount?: number;
  className?: string;
  children?: ReactNode;
};

export function DashboardListFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  resultCount,
  totalCount,
  className,
  children,
}: DashboardListFiltersProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      <div className="relative min-w-[200px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="bg-background pl-9"
        />
      </div>
      {children}
      {resultCount != null && totalCount != null ? (
        <p className="text-xs text-muted-foreground sm:ml-auto">
          Showing {resultCount} of {totalCount}
        </p>
      ) : null}
    </div>
  );
}

export function filterBySearch<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) =>
    getText(item).toLowerCase().includes(normalized),
  );
}
