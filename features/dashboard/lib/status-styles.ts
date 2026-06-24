export type ReviewStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "changes_requested"
  | "failed";

export const statusStyles: Record<
  ReviewStatus,
  { label: string; badgeClassName: string }
> = {
  pending: {
    label: "Pending",
    badgeClassName:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  in_progress: {
    label: "In progress",
    badgeClassName:
      "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400",
  },
  approved: {
    label: "Approved",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  changes_requested: {
    label: "Changes requested",
    badgeClassName:
      "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
  },
  failed: {
    label: "Failed",
    badgeClassName:
      "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export type GitHubAppStatus = "connected" | "disconnected" | "error";

export const githubAppStatusStyles: Record<
  GitHubAppStatus,
  { label: string; badgeClassName: string }
> = {
  connected: {
    label: "Connected",
    badgeClassName:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  disconnected: {
    label: "Not connected",
    badgeClassName: "border-border bg-muted text-muted-foreground",
  },
  error: {
    label: "Connection error",
    badgeClassName:
      "border-destructive/30 bg-destructive/10 text-destructive",
  },
};
