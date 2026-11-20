import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  EmptyFeaturesIllustration,
  EmptyPullRequestsIllustration,
  EmptyReleaseIllustration,
  EmptyReposIllustration,
  EmptyReviewsIllustration,
} from "./empty-states";

const illustrations = {
  "pull-requests": EmptyPullRequestsIllustration,
  reviews: EmptyReviewsIllustration,
  repositories: EmptyReposIllustration,
  release: EmptyReleaseIllustration,
  features: EmptyFeaturesIllustration,
} as const;

export type EmptyIllustrationKind = keyof typeof illustrations;

type IllustratedEmptyStateProps = {
  kind: EmptyIllustrationKind;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** compact = for use inside panels; default = full-page empty */
  size?: "compact" | "default";
  className?: string;
};

/** Art-directed empty state: illustration, title, supporting copy, and an optional action. */
export function IllustratedEmptyState({
  kind,
  title,
  description,
  children,
  size = "default",
  className,
}: IllustratedEmptyStateProps) {
  const Illustration = illustrations[kind];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "default" ? "gap-1 px-6 py-10" : "gap-0.5 px-4 py-6",
        className,
      )}
    >
      <Illustration
        className={cn(
          "h-auto select-none",
          size === "default" ? "w-60 max-w-full" : "w-44 max-w-full",
        )}
      />
      <h3 className="mt-1 text-base font-semibold tracking-tight">{title}</h3>
      {description ? (
        <p className="max-w-md text-balance text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children ? <div className="mt-4 flex flex-col items-center gap-2">{children}</div> : null}
    </div>
  );
}
