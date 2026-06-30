import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  FolderGit2,
  FolderKanban,
  GitPullRequest,
  History,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Link2,
  MessagesSquare,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  AppWindow,
  CheckCircle2,
  Bot,
  Filter,
} from "lucide-react";

export type SectionGuideId =
  | "overview"
  | "workspaces"
  | "projects"
  | "feature-requests"
  | "intake"
  | "prd"
  | "pull-requests"
  | "review-history"
  | "review-sla"
  | "activity"
  | "approvals"
  | "repositories"
  | "billing"
  | "github-app"
  | "settings";

export type GuideItemConfig = {
  icon: LucideIcon;
  title: string;
  body: string;
  iconClassName?: string;
};

export type GuideBlockConfig = {
  title: string;
  items: GuideItemConfig[];
};

export type SectionGuideConfig = {
  title: string;
  intro: string;
  blocks: GuideBlockConfig[];
};

export const SECTION_GUIDES: Record<SectionGuideId, SectionGuideConfig> = {
  overview: {
    title: "How the Overview works",
    intro:
      "Your home screen shows delivery health at a glance — open repos, open PRs, reviews this week, and features waiting for release. Use it to spot what needs attention before diving into a section.",
    blocks: [
      {
        title: "Summary cards",
        items: [
          {
            icon: FolderGit2,
            title: "Connected repositories",
            body: "How many repos are linked to your workspace vs your plan limit. Connect more from Repositories.",
          },
          {
            icon: GitPullRequest,
            title: "Open pull requests",
            body: "PRs still pending or in review on GitHub. Sync and review them from Pull Requests.",
          },
          {
            icon: History,
            title: "Reviews this week",
            body: "AI reviews run in the last 7 days, plus counts of PRDs and feature requests in your workspace.",
          },
          {
            icon: Rocket,
            title: "Awaiting release",
            body: "Features ready for a human sign-off before they are marked shipped.",
            iconClassName: "text-indigo-500",
          },
        ],
      },
      {
        title: "Get started & recent reviews",
        items: [
          {
            icon: Sparkles,
            title: "Setup checklist",
            body: "Shows until GitHub is fully connected — sign in with GitHub, install the app, connect repos.",
          },
          {
            icon: ShieldCheck,
            title: "Recent reviews",
            body: "Click any row to open full AI review notes. View all goes to Review History.",
            iconClassName: "text-emerald-500",
          },
        ],
      },
    ],
  },
  workspaces: {
    title: "How Workspaces work",
    intro:
      "A workspace is a separate team or company space. Each has its own projects, features, billing, and members. Switch workspaces from the bottom of the sidebar.",
    blocks: [
      {
        title: "What you can do here",
        items: [
          {
            icon: Building2,
            title: "Active workspace",
            body: "Pick which workspace you are working in. All dashboard pages use this selection.",
          },
          {
            icon: Users,
            title: "Members & invites",
            body: "Invite teammates by email. They accept the link and join this workspace.",
          },
          {
            icon: Sparkles,
            title: "Create workspace",
            body: "Start a new space for another team or product. Each workspace has its own AI credits and plan.",
          },
        ],
      },
      {
        title: "Why it matters",
        items: [
          {
            icon: ShieldCheck,
            title: "Data stays separate",
            body: "Features, PRDs, and reviews in Workspace A never mix with Workspace B.",
          },
          {
            icon: CreditCard,
            title: "Billing per workspace",
            body: "Free or Pro plan and AI credits are tracked per workspace, not per person.",
          },
        ],
      },
    ],
  },
  projects: {
    title: "How Projects work",
    intro:
      "Projects group related features under one product or area. Every feature request and connected repo belongs to a project — create one before adding work.",
    blocks: [
      {
        title: "Creating & using projects",
        items: [
          {
            icon: FolderKanban,
            title: "New project",
            body: "Give it a clear name and optional description. You can have many projects per workspace.",
          },
          {
            icon: Lightbulb,
            title: "Feature requests",
            body: "New requests attach to the active project. Switch projects from the Feature Requests page picker.",
          },
          {
            icon: FolderGit2,
            title: "Repositories",
            body: "Connected repos are linked to a project so PR sync knows where to file work.",
          },
        ],
      },
      {
        title: "On each project card",
        items: [
          {
            icon: ArrowRight,
            title: "View features",
            body: "Jump to Feature Requests filtered for that product area.",
          },
          {
            icon: BarChart3,
            title: "Counts",
            body: "See how many features and repos are already tied to the project.",
          },
        ],
      },
    ],
  },
  "feature-requests": {
    title: "How Feature Requests work",
    intro:
      "This is the main list of ideas moving toward release. Each row is one feature with a status that tells you the next step — clarify, plan, build, review, or ship.",
    blocks: [
      {
        title: "Starting & resuming",
        items: [
          {
            icon: Lightbulb,
            title: "New feature request",
            body: "Expand the form, add a title and description, pick a source (manual, email, ticket, call), then create.",
          },
          {
            icon: ArrowRight,
            title: "Continue where you left off",
            body: "Banner appears when you recently opened a feature — click Resume to jump back.",
          },
          {
            icon: Search,
            title: "Search & filter",
            body: "Find requests by title, description, or status. Filter by workflow stage.",
          },
        ],
      },
      {
        title: "Inside a feature",
        items: [
          {
            icon: MessagesSquare,
            title: "AI clarify",
            body: "AI asks questions until the idea is clear enough for a written plan.",
            iconClassName: "text-violet-500",
          },
          {
            icon: FileText,
            title: "PRD & tasks",
            body: "Generate a plan document, approve it, break into tasks, approve the plan, then develop.",
          },
          {
            icon: GitPullRequest,
            title: "Link PR & review",
            body: "Connect a GitHub pull request, run AI review against the plan, then release approval.",
          },
        ],
      },
    ],
  },
  intake: {
    title: "How Customer Intake works",
    intro:
      "Log what a customer asked for — from an email, support ticket, or call. ShipFlow creates a feature request and starts AI clarification automatically.",
    blocks: [
      {
        title: "Submitting a request",
        items: [
          {
            icon: Inbox,
            title: "Pick the source",
            body: "Email, support ticket, or customer call — helps your team remember where it came from.",
          },
          {
            icon: FileText,
            title: "Title & description",
            body: "Paste or type what they said. Be specific — AI will ask follow-ups on the feature page.",
          },
          {
            icon: FolderKanban,
            title: "Project",
            body: "The request is added to your active project shown at the top of the form.",
          },
        ],
      },
      {
        title: "What happens next",
        items: [
          {
            icon: Sparkles,
            title: "Auto clarifying",
            body: "After submit you land on the feature page where AI clarification may already be running.",
            iconClassName: "text-violet-500",
          },
          {
            icon: ArrowRight,
            title: "Same journey as manual requests",
            body: "From there: plan → tasks → build → review → ship, same as Feature Requests.",
          },
        ],
      },
    ],
  },
  prd: {
    title: "How the PRD Editor works",
    intro:
      "PRDs (product requirement documents) are written plans AI creates from clarified feature requests. Read, edit, and approve them here before tasks are generated.",
    blocks: [
      {
        title: "Using the list",
        items: [
          {
            icon: FileText,
            title: "Open a PRD",
            body: "Click any card to edit the full document — goals, user stories, acceptance criteria, edge cases.",
          },
          {
            icon: Lightbulb,
            title: "Feature status badge",
            body: "Shows where the parent feature sits in the ShipFlow journey.",
          },
        ],
      },
      {
        title: "Before tasks exist",
        items: [
          {
            icon: CheckCircle2,
            title: "Approve on feature page",
            body: "After editing, approve the PRD on the feature detail page to unlock task generation.",
            iconClassName: "text-emerald-500",
          },
          {
            icon: MessagesSquare,
            title: "No PRD yet?",
            body: "Create a feature request, finish clarifying, then click Generate PRD on the feature page.",
          },
        ],
      },
    ],
  },
  "pull-requests": {
    title: "How Pull Requests work",
    intro:
      "Synced code changes from GitHub appear here. Run AI review on each PR, link them to features, and read findings before shipping.",
    blocks: [
      {
        title: "Sync & review",
        items: [
          {
            icon: RefreshCw,
            title: "Sync from GitHub",
            body: "Pulls open PRs from connected repos. Run this after opening new PRs on GitHub.",
          },
          {
            icon: Bot,
            title: "Review button",
            body: "Queues AI analysis against the linked feature's plan and tasks. Uses AI credits.",
            iconClassName: "text-violet-500",
          },
          {
            icon: ShieldCheck,
            title: "View findings",
            body: "Click the PR title to open full review notes — blocking vs non-blocking issues.",
            iconClassName: "text-emerald-500",
          },
        ],
      },
      {
        title: "Filters & linking",
        items: [
          {
            icon: Search,
            title: "Search",
            body: "Filter by repo name, PR title, author, or linked feature.",
          },
          {
            icon: Filter,
            title: "Status & link filters",
            body: "Show only pending, reviewed, or failed PRs. Filter linked vs unlinked to features.",
          },
          {
            icon: Link2,
            title: "Link to feature",
            body: "Connect a PR to a feature on the feature detail page so review checks the right plan.",
          },
        ],
      },
    ],
  },
  "review-history": {
    title: "How Review History works",
    intro:
      "A log of every AI review that has run across your pull requests — summaries, blocking counts, confidence scores, and links to features.",
    blocks: [
      {
        title: "Reading the table",
        items: [
          {
            icon: GitPullRequest,
            title: "PR column",
            body: "Pull request number for quick reference.",
          },
          {
            icon: FileText,
            title: "Review summary",
            body: "Click any row to open the full AI review notes in a dialog.",
          },
          {
            icon: ShieldCheck,
            title: "Blocking & confidence",
            body: "Red badge = must-fix issues. Percentage = how close the change is to passing the plan.",
            iconClassName: "text-rose-500",
          },
        ],
      },
      {
        title: "Filters",
        items: [
          {
            icon: Search,
            title: "Search",
            body: "Find reviews by repo, PR title, feature name, or summary text.",
          },
          {
            icon: Filter,
            title: "Blocking filter",
            body: "Show all reviews, only those with blocking issues, or only clean (0 blocking) passes.",
          },
        ],
      },
    ],
  },
  "review-sla": {
    title: "How Review SLA works",
    intro:
      "Charts how fast your team gets a first AI review per repository — useful for spotting repos where PRs sit too long before review.",
    blocks: [
      {
        title: "The metrics",
        items: [
          {
            icon: FolderGit2,
            title: "Repository",
            body: "Each connected repo with pull request activity gets its own row.",
          },
          {
            icon: GitPullRequest,
            title: "PRs tracked",
            body: "How many pull requests ShipFlow has seen for that repo recently.",
          },
          {
            icon: BarChart3,
            title: "Avg hours to first review",
            body: "Time from PR creation to first completed AI review. Lower is faster.",
            iconClassName: "text-sky-500",
          },
        ],
      },
      {
        title: "Getting data",
        items: [
          {
            icon: RefreshCw,
            title: "Needs reviews",
            body: "Connect GitHub, sync PRs, and run at least one review per repo to populate this table.",
          },
          {
            icon: ArrowRight,
            title: "Use it wisely",
            body: "Spot bottlenecks in process — not to blame individuals. Pair with Pull Requests for action.",
          },
        ],
      },
    ],
  },
  activity: {
    title: "How Activity works",
    intro:
      "A timeline of important events in your workspace — reviews completed, blocking findings, approvals, and other workflow changes.",
    blocks: [
      {
        title: "What appears here",
        items: [
          {
            icon: ShieldCheck,
            title: "Review events",
            body: "When AI review finishes — passed with 0 blocking or found issues that need fixes.",
            iconClassName: "text-emerald-500",
          },
          {
            icon: Rocket,
            title: "Approvals & status changes",
            body: "Release decisions and feature status updates across the team.",
          },
          {
            icon: Activity,
            title: "Audit trail",
            body: "See who did what and when — helpful after rejections or ship decisions.",
          },
        ],
      },
      {
        title: "Tips",
        items: [
          {
            icon: ArrowRight,
            title: "Click review events",
            body: "Some entries link to the pull request review details when a PR is attached.",
          },
          {
            icon: Building2,
            title: "Workspace scoped",
            body: "Only events for your active workspace appear here.",
          },
        ],
      },
    ],
  },
  approvals: {
    title: "How Release Approval works",
    intro:
      "The final human gate before a feature is marked shipped. Features land here after AI review passes (or while release readiness is being checked).",
    blocks: [
      {
        title: "Who appears here",
        items: [
          {
            icon: Rocket,
            title: "Awaiting approval",
            body: "Feature passed review and is ready for a teammate to sign off.",
            iconClassName: "text-indigo-500",
          },
          {
            icon: ShieldCheck,
            title: "Fix needed",
            body: "AI found blocking issues — send back to development before approving.",
            iconClassName: "text-rose-500",
          },
          {
            icon: RefreshCw,
            title: "Release checking",
            body: "Automated readiness check may still be running in the background.",
          },
        ],
      },
      {
        title: "Your actions",
        items: [
          {
            icon: CheckCircle2,
            title: "Approve",
            body: "Marks the feature as shipped. Nothing goes live without this human yes.",
            iconClassName: "text-emerald-500",
          },
          {
            icon: FileText,
            title: "Reject with notes",
            body: "Send back for fixes with a reason — shows in approval history.",
          },
          {
            icon: History,
            title: "Approval history",
            body: "Past decisions and reviewer names on each feature card.",
          },
        ],
      },
    ],
  },
  repositories: {
    title: "How Repositories work",
    intro:
      "Choose which GitHub repos ShipFlow can read. Only connected repos sync pull requests and receive AI reviews.",
    blocks: [
      {
        title: "Connecting repos",
        items: [
          {
            icon: AppWindow,
            title: "GitHub App first",
            body: "Install the GitHub App before this page works — it grants read access to your PRs.",
          },
          {
            icon: FolderGit2,
            title: "Connect / disconnect",
            body: "Toggle repos onto your project. Your plan limits how many can be connected.",
          },
          {
            icon: GitPullRequest,
            title: "View PRs per repo",
            body: "Open a connected repo to see its pull requests and jump to review.",
          },
        ],
      },
      {
        title: "Plan limits",
        items: [
          {
            icon: CreditCard,
            title: "Repo limit",
            body: "Free plan allows fewer repos than Pro. Upgrade on Billing if you hit the cap.",
          },
          {
            icon: ArrowRight,
            title: "Then sync",
            body: "After connecting, go to Pull Requests and click Sync from GitHub.",
          },
        ],
      },
    ],
  },
  billing: {
    title: "How Billing works",
    intro:
      "Manage your workspace plan and AI credits. Clarifying, plan generation, task creation, and PR reviews all consume credits.",
    blocks: [
      {
        title: "Plans",
        items: [
          {
            icon: CreditCard,
            title: "Free",
            body: "Limited repos and monthly AI credits — enough to try the full delivery loop.",
          },
          {
            icon: Sparkles,
            title: "Pro",
            body: "More repos, more credits, PRD-aware reviews, and task agents. Upgrade via Razorpay checkout.",
            iconClassName: "text-violet-500",
          },
        ],
      },
      {
        title: "Usage panel",
        items: [
          {
            icon: Bot,
            title: "AI credits remaining",
            body: "Each clarify, PRD, task generation, and PR review uses credits. Watch this number.",
          },
          {
            icon: FolderGit2,
            title: "Connected repositories",
            body: "Shows how many repos you use vs your plan limit.",
          },
        ],
      },
    ],
  },
  "github-app": {
    title: "How the GitHub App works",
    intro:
      "ShipFlow needs permission to read your pull requests on GitHub. Signing in with GitHub alone is not enough — you must install the app on your account.",
    blocks: [
      {
        title: "Setup steps",
        items: [
          {
            icon: Users,
            title: "Sign in with GitHub",
            body: "Email-only accounts cannot install the app. Use the same GitHub account that owns your repos.",
          },
          {
            icon: AppWindow,
            title: "Install the app",
            body: "Click install on GitHub and grant access to the repos you want ShipFlow to see.",
          },
          {
            icon: FolderGit2,
            title: "Connect repositories",
            body: "Next, open Repositories and pick which repos belong to your project.",
          },
        ],
      },
      {
        title: "After connecting",
        items: [
          {
            icon: GitPullRequest,
            title: "Sync PRs",
            body: "Pull Requests page → Sync from GitHub imports open PRs.",
          },
          {
            icon: ShieldCheck,
            title: "Run reviews",
            body: "AI reads code changes and checks them against linked feature plans.",
            iconClassName: "text-emerald-500",
          },
        ],
      },
    ],
  },
  settings: {
    title: "How Settings works",
    intro:
      "View your signed-in account, active workspace, plan, credits, and GitHub connection status. Quick links take you to deeper management pages.",
    blocks: [
      {
        title: "Sections",
        items: [
          {
            icon: Users,
            title: "Account",
            body: "Your name and email from sign-in (GitHub or email).",
          },
          {
            icon: Building2,
            title: "Workspace",
            body: "Active workspace name, plan tier, and remaining AI credits.",
          },
          {
            icon: AppWindow,
            title: "GitHub integration",
            body: "Whether the app is configured and connected as your GitHub user.",
          },
        ],
      },
      {
        title: "Quick links",
        items: [
          {
            icon: ArrowRight,
            title: "Manage workspaces",
            body: "Invite members, create workspaces, switch between teams.",
          },
          {
            icon: Settings,
            title: "GitHub App settings",
            body: "Install, reconnect, or disconnect the GitHub App.",
          },
        ],
      },
    ],
  },
};
