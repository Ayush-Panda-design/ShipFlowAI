export type ReviewStatus =
  | "pending"
  | "in_progress"
  | "approved"
  | "changes_requested"
  | "failed";

export const statusStyles: Record<
  ReviewStatus,
  { label: string; badgeClassName: string; dotClassName: string; tileClassName: string }
> = {
  pending: {
    label: "Pending",
    badgeClassName:
      "border-warning/25 bg-warning-soft text-warning",
    dotClassName: "bg-warning",
    tileClassName: "bg-warning-soft text-warning",
  },
  in_progress: {
    label: "In progress",
    badgeClassName:
      "border-info/25 bg-info-soft text-info",
    dotClassName: "bg-info",
    tileClassName: "bg-info-soft text-info",
  },
  approved: {
    label: "Approved",
    badgeClassName:
      "border-success/25 bg-success-soft text-success",
    dotClassName: "bg-success",
    tileClassName: "bg-success-soft text-success",
  },
  changes_requested: {
    label: "Changes requested",
    badgeClassName:
      "border-amber/40 bg-amber-soft text-warning",
    dotClassName: "bg-amber",
    tileClassName: "bg-amber-soft text-warning",
  },
  failed: {
    label: "Failed",
    badgeClassName:
      "border-danger/25 bg-danger-soft text-danger",
    dotClassName: "bg-danger",
    tileClassName: "bg-danger-soft text-danger",
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
      "border-success/25 bg-success-soft text-success",
  },
  disconnected: {
    label: "Not connected",
    badgeClassName: "border-border bg-muted text-muted-foreground",
  },
  error: {
    label: "Connection error",
    badgeClassName:
      "border-danger/25 bg-danger-soft text-danger",
  },
};
