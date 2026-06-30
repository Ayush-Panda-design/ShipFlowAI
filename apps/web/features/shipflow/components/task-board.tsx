"use client";

import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  EyeOff,
  GitMerge,
  GitPullRequest,
  HelpCircle,
  ListTodo,
  MoreHorizontal,
  RefreshCw,
  RotateCcw,
  Scissors,
  Sparkles,
  FileCode,
  Filter,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { TaskCodeDialog } from "@/features/shipflow/components/task-code-dialog";
import { CollapsibleCard } from "@/features/shipflow/components/collapsible-card";
import {
  getCodeGenAccent,
  getCodeGenMeta,
  getCodeGenStageInfo,
} from "@/features/shipflow/components/code-gen-status";
import { formatCodegenError } from "@/features/shipflow/lib/codegen-errors";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DashboardListFilters,
  filterBySearch,
} from "@/features/dashboard/components/dashboard-list-filters";
import {
  AutoHideScroll,
  dashboardPanelHeightClass,
} from "@/components/ui/auto-hide-scroll";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import { LoadingState } from "@/components/ui/loading-state";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

const columns = [
  { key: "todo" as const, label: "To do", description: "Not started yet" },
  { key: "in_progress" as const, label: "In progress", description: "Being built / AI generating code" },
  { key: "done" as const, label: "Done", description: "Completed or merged" },
];

const COLUMN_THEME = {
  todo: {
    ring: "ring-slate-500/20",
    header: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
    icon: ListTodo,
    empty: "No tasks queued",
  },
  in_progress: {
    ring: "ring-amber-500/25",
    header: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
    icon: Circle,
    empty: "Nothing in progress",
  },
  done: {
    ring: "ring-emerald-500/25",
    header: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
    dot: "bg-emerald-500",
    icon: CheckCircle2,
    empty: "No completed tasks",
  },
} as const;

const SHIPPED_STATUSES = new Set(["shipped", "closed", "cancelled"]);
const GUIDE_KEY = "shipflow.taskboard.guide.v3";

type KanbanTask = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  updatedAt: Date | string;
  featureRequest: { id: string; title: string; status: string };
  codeGenStatus?: string;
  codeGenStage?: string | null;
  codeGenError?: string | null;
  aiGeneratable?: boolean;
  generatedCode?: string | null;
  generatedFilePath?: string | null;
  generatedSummary?: string | null;
  draftPrUrl?: string | null;
  draftPrNumber?: number | null;
};

/** A task is stuck if it has been "generating" for more than 6 minutes. */
function isStuck(task: { codeGenStatus: string; updatedAt: Date | string }) {
  if (task.codeGenStatus !== "generating") return false;
  const updated = new Date(task.updatedAt).getTime();
  return Date.now() - updated > 6 * 60 * 1000;
}

type TaskBoardProps = {
  projectId: string;
  fromFeatureId?: string;
};

export function TaskBoard({ projectId, fromFeatureId }: TaskBoardProps) {
  const [search, setSearch] = useState("");
  const [columnFilter, setColumnFilter] = useState("all");
  const [featureFilter, setFeatureFilter] = useState("all");
  const [hideShipped, setHideShipped] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() =>
    typeof window !== "undefined" ? window.localStorage.getItem(GUIDE_KEY) !== "0" : false,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeFeatureFilter = fromFeatureId ?? featureFilter;

  const toggleGuide = () => {
    setGuideOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(GUIDE_KEY, next ? "1" : "0");
      return next;
    });
  };

  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.task.kanban.useQuery(
    { projectId },
    {
      refetchInterval: (query) => {
        const data = query.state.data ?? [];
        if (data.some((t) => "codeGenStatus" in t && t.codeGenStatus === "generating")) return 2500;
        if (fromFeatureId && data.filter((t) => t.featureRequest.id === fromFeatureId).length === 0) return 3000;
        return false;
      },
    },
  );

  const { data: features = [], isLoading: isLoadingFeatures } = trpc.featureRequest.list.useQuery(
    { projectId },
    { staleTime: 60_000 },
  );

  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [splitTaskId, setSplitTaskId] = useState<string | null>(null);
  const [splitTitles, setSplitTitles] = useState(["", ""]);

  const invalidate = () => utils.task.kanban.invalidate({ projectId });

  const updateStatus = trpc.task.updateStatus.useMutation({
    onMutate: async ({ taskId, status }) => {
      await utils.task.kanban.cancel({ projectId });
      const previous = utils.task.kanban.getData({ projectId });
      utils.task.kanban.setData({ projectId }, (old) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t)) ?? [],
      );
      return { previous };
    },
    onSuccess: (_data, { status }) => {
      const label = columns.find((c) => c.key === status)?.label ?? status;
      toast.success(`Moved to ${label}`);
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.previous) {
        utils.task.kanban.setData({ projectId }, ctx.previous);
      }
      toast.error(e.message);
    },
    onSettled: () => {
      void utils.task.kanban.invalidate({ projectId });
    },
  });
  const merge = trpc.task.merge.useMutation({
    onSuccess: async () => { toast.success("Tasks merged"); setMergeSourceId(null); await invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const split = trpc.task.split.useMutation({
    onSuccess: async () => { toast.success("Task split"); setSplitTaskId(null); setSplitTitles(["", ""]); await invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const codegen = trpc.task.triggerCodegen.useMutation({
    onSuccess: async (r) => { toast.success(r.message); await invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const openDraftPr = trpc.task.triggerDraftPr.useMutation({
    onSuccess: async (r) => { toast.success(r.message); await invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const resetCodegen = trpc.task.resetCodegen.useMutation({
    onSuccess: async () => { toast.success("Task reset — you can generate again."); await invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteTask = trpc.task.deleteTask.useMutation({
    onSuccess: async () => { toast.success("Task deleted."); await invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const refreshPrStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/github/refresh-pr-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error("Unexpected response from server.");
      }

      let data: {
        ok?: boolean;
        checked?: number;
        updated?: number;
        error?: string;
      };
      try {
        data = (await res.json()) as typeof data;
      } catch {
        throw new Error("Could not parse server response.");
      }

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not refresh.");
      }

      toast.success(
        !data.checked
          ? "No open draft PRs to check."
          : `Checked ${data.checked} PR${data.checked === 1 ? "" : "s"} · ${data.updated} updated`,
      );
      await invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh PR status.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let items = filterBySearch(tasks, search, (t) =>
      [t.title, t.description ?? "", t.featureRequest.title, t.status, t.featureRequest.status].join(" "),
    );
    if (columnFilter !== "all") items = items.filter((t) => t.status === columnFilter);
    if (activeFeatureFilter !== "all") items = items.filter((t) => t.featureRequest.id === activeFeatureFilter);
    if (hideShipped) items = items.filter((t) => !SHIPPED_STATUSES.has(t.featureRequest.status));
    return items;
  }, [tasks, search, columnFilter, activeFeatureFilter, hideShipped]);

  const isBoardLoading = isLoading || isLoadingFeatures;

  const featureTasks = fromFeatureId
    ? tasks.filter((t) => t.featureRequest.id === fromFeatureId)
    : tasks;
  const waitingForTasks =
    Boolean(fromFeatureId) && !isBoardLoading && featureTasks.length === 0;

  if (isBoardLoading) {
    return (
      <LoadingState
        label="Loading task board"
        description="Organizing engineering tasks from your approved requirements."
        variant="tasks"
      />
    );
  }

  const sameFeatureTasks = (taskId: string, featureId: string) =>
    filteredTasks.filter((t) => t.featureRequest.id === featureId && t.id !== taskId);

  const visibleColumns = columnFilter === "all" ? columns : columns.filter((c) => c.key === columnFilter);
  const shippedTaskCount = tasks.filter((t) => SHIPPED_STATUSES.has(t.featureRequest.status)).length;

  const taskActions = {
    mergeSourceId,
    splitTaskId,
    splitTitles,
    setMergeSourceId,
    setSplitTaskId,
    setSplitTitles,
    updateStatus,
    merge,
    split,
    codegen,
    openDraftPr,
    resetCodegen,
    deleteTask,
    sameFeatureTasks,
  };

  return (
    <div className="space-y-5">
      <GuidePanel open={guideOpen} onToggle={toggleGuide} />

      <DashboardListFilters
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tasks, features, status…"
        resultCount={filteredTasks.length}
        totalCount={tasks.length}
        className="rounded-xl border-border/60 bg-card/80 shadow-sm backdrop-blur-sm"
      >
        <select
          value={columnFilter}
          onChange={(e) => setColumnFilter(e.target.value)}
          className="h-9 rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm"
        >
          <option value="all">All columns</option>
          {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>

        <select
          value={activeFeatureFilter}
          onChange={(e) => setFeatureFilter(e.target.value)}
          className="h-9 min-w-[10rem] rounded-lg border border-border/60 bg-background px-3 text-sm shadow-sm"
        >
          <option value="all">All features</option>
          {features.map((f) => (
            <option key={f.id} value={f.id}>{f.title}</option>
          ))}
        </select>

        <Button
          type="button"
          variant={hideShipped ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-1.5 rounded-lg text-xs"
          onClick={() => setHideShipped((v) => !v)}
          title={hideShipped ? "Show shipped tasks" : `Hide ${shippedTaskCount} tasks from shipped features`}
        >
          <EyeOff className="size-3.5" />
          {hideShipped ? "Active only" : "Hide shipped"}
          {!hideShipped && shippedTaskCount > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">{shippedTaskCount}</span>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-lg text-xs"
          disabled={isRefreshing}
          onClick={refreshPrStatus}
        >
          <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
          {isRefreshing ? "Refreshing…" : "Sync PRs"}
        </Button>
      </DashboardListFilters>

      {!guideOpen && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={toggleGuide}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <HelpCircle className="size-3.5" /> How does this work?
          </button>
        </div>
      )}

      {waitingForTasks && (
        <div className="overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/[0.08] to-transparent p-5">
          <div className="flex items-center gap-2">
            <span className="inline-block size-2 animate-pulse rounded-full bg-violet-500" />
            <p className="text-sm font-medium text-violet-700 dark:text-violet-300">AI is generating tasks for this feature…</p>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Engineering tasks are being created from the approved requirements. This page refreshes automatically.
          </p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-violet-500/15">
            <div className="h-full w-[55%] animate-pulse rounded-full bg-violet-500" />
          </div>
        </div>
      )}

      <AutoHideScroll
        className={cn(
          dashboardPanelHeightClass,
          "grid gap-5 overflow-auto md:grid-cols-3",
        )}
      >
        {visibleColumns.map((column) => {
          const theme = COLUMN_THEME[column.key];
          const ColumnIcon = theme.icon;
          const columnTasks = filteredTasks.filter((t) => t.status === column.key);

          const featureGroups = columnTasks.reduce<
            Map<string, { featureId: string; featureTitle: string; featureStatus: string; tasks: typeof columnTasks }>
          >((acc, task) => {
            const fid = task.featureRequest.id;
            if (!acc.has(fid)) {
              acc.set(fid, {
                featureId: fid,
                featureTitle: task.featureRequest.title,
                featureStatus: task.featureRequest.status,
                tasks: [],
              });
            }
            acc.get(fid)!.tasks.push(task);
            return acc;
          }, new Map());

          return (
            <section
              key={column.key}
              className={cn(
                "flex min-h-[20rem] flex-col rounded-xl ring-1 ring-inset",
                theme.ring,
                "bg-card/50",
              )}
            >
              <header className={cn("rounded-t-xl px-4 py-3", theme.header)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ColumnIcon className="size-4 shrink-0 opacity-80" />
                    <h2 className="text-sm font-semibold tracking-tight">{column.label}</h2>
                  </div>
                  <span className="rounded-full bg-background/60 px-2.5 py-0.5 text-xs font-medium tabular-nums">
                    {columnTasks.length}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] opacity-75">{column.description}</p>
              </header>

              <div className="flex flex-1 flex-col gap-3 p-3">
                {featureGroups.size === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 px-4 py-10 text-center">
                    <ColumnIcon className="mb-2 size-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{theme.empty}</p>
                  </div>
                ) : (
                  [...featureGroups.values()].map((group) => (
                    <div
                      key={group.featureId}
                      className="overflow-hidden rounded-lg border border-border/50 bg-background/40 shadow-sm"
                    >
                      <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-3 py-2">
                        <Link
                          href={`/dashboard/feature-requests/${group.featureId}`}
                          className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground hover:underline"
                        >
                          {group.featureTitle}
                        </Link>
                        <FeatureStatusBadge status={group.featureStatus} />
                        <span className="shrink-0 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular-nums">
                          {group.tasks.length}
                        </span>
                      </div>

                      <div className="space-y-2.5 p-2.5">
                        {group.tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task as KanbanTask}
                            actions={taskActions}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </AutoHideScroll>
    </div>
  );
}

type TaskCardProps = {
  task: KanbanTask;
  actions: {
    mergeSourceId: string | null;
    splitTaskId: string | null;
    splitTitles: string[];
    setMergeSourceId: (id: string | null) => void;
    setSplitTaskId: (id: string | null) => void;
    setSplitTitles: (titles: string[]) => void;
    updateStatus: ReturnType<typeof trpc.task.updateStatus.useMutation>;
    merge: ReturnType<typeof trpc.task.merge.useMutation>;
    split: ReturnType<typeof trpc.task.split.useMutation>;
    codegen: ReturnType<typeof trpc.task.triggerCodegen.useMutation>;
    openDraftPr: ReturnType<typeof trpc.task.triggerDraftPr.useMutation>;
    resetCodegen: ReturnType<typeof trpc.task.resetCodegen.useMutation>;
    deleteTask: ReturnType<typeof trpc.task.deleteTask.useMutation>;
    sameFeatureTasks: (taskId: string, featureId: string) => KanbanTask[];
  };
};

function TaskCard({ task, actions }: TaskCardProps) {
  const {
    mergeSourceId,
    splitTaskId,
    splitTitles,
    setMergeSourceId,
    setSplitTaskId,
    setSplitTitles,
    updateStatus,
    merge,
    split,
    codegen,
    openDraftPr,
    resetCodegen,
    deleteTask,
    sameFeatureTasks,
  } = actions;

  const codeGenStatus = task.codeGenStatus ?? "none";
  /** Legacy rows: codegen succeeded but PR step failed under old combined flow. */
  const displayStatus =
    codeGenStatus === "failed" && task.generatedCode ? "pr_failed" : codeGenStatus;
  const codeGenStage = task.codeGenStage ?? null;
  const codeGenError = task.codeGenError ?? null;
  const stuck = isStuck({ codeGenStatus, updatedAt: task.updatedAt });
  const meta = getCodeGenMeta(displayStatus);
  const stageInfo = getCodeGenStageInfo(codeGenStage);
  const hasPrUrl = Boolean(task.draftPrUrl);
  const orphaned = codeGenStatus === "draft_pr_open" && !hasPrUrl;
  const isGenerating = codeGenStatus === "generating" && !stuck;

  const canGenerate =
    task.aiGeneratable !== false &&
    codeGenStatus !== "generating" &&
    (codeGenStatus === "none" ||
      codeGenStatus === "code_ready" ||
      codeGenStatus === "failed" ||
      codeGenStatus === "pr_failed" ||
      codeGenStatus === "closed" ||
      codeGenStatus === "draft_pr_open");

  const canOpenPr =
    Boolean(task.generatedCode) &&
    !task.draftPrUrl &&
    codeGenStatus !== "generating" &&
    codeGenStatus !== "draft_pr_open" &&
    codeGenStatus !== "pr_open";

  const canReset =
    codeGenStatus !== "none" &&
    (stuck || orphaned || codeGenStatus === "failed" || codeGenStatus === "pr_failed");

  const showCodegenBlock = codeGenStatus !== "none";
  const [showMore, setShowMore] = useState(false);
  const moveTargets = columns.filter((c) => c.key !== task.status);
  const isMovingThis =
    updateStatus.isPending && updateStatus.variables?.taskId === task.id;

  /** Extra collapsed detail only when it differs from the status pill. */
  const collapsedSummary = isGenerating
    ? stageInfo.label
    : hasPrUrl && task.draftPrNumber
      ? `PR #${task.draftPrNumber}`
      : undefined;

  const statusPill = isGenerating ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-600">
      <span className="size-1.5 animate-pulse rounded-full bg-violet-500" />
      Working
    </span>
  ) : (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        meta.className,
        "bg-muted/60",
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dotClassName)} />
      {meta.label}
    </span>
  );

  return (
    <CollapsibleCard
      title={task.title}
      statusPill={statusPill}
      summary={collapsedSummary}
      defaultOpen={isGenerating || codeGenStatus === "pr_failed" || codeGenStatus === "failed"}
      accent={getCodeGenAccent(displayStatus)}
      className="shadow-none border-border/50"
      bodyClassName="space-y-3 px-3 py-3"
      headerClassName="px-3 py-2.5"
    >
      {stuck && (
        <AlertBanner>
          Job seems stuck.{" "}
          <button
            type="button"
            className="font-medium underline hover:no-underline"
            disabled={resetCodegen.isPending}
            onClick={() => resetCodegen.mutate({ taskId: task.id })}
          >
            Reset
          </button>{" "}
          to try again.
        </AlertBanner>
      )}

      {orphaned && (
        <AlertBanner>
          Draft PR link missing.{" "}
          <button
            type="button"
            className="font-medium underline hover:no-underline"
            disabled={resetCodegen.isPending}
            onClick={() => resetCodegen.mutate({ taskId: task.id })}
          >
            Reset
          </button>{" "}
          and open PR again.
        </AlertBanner>
      )}

      {isGenerating && (
        <div className="space-y-2 rounded-lg border border-violet-500/25 bg-violet-500/[0.06] p-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-violet-500" />
            {stageInfo.label}…
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-violet-500/15">
            <div
              className="h-full rounded-full bg-violet-500 transition-all duration-700 ease-out"
              style={{ width: `${stageInfo.progress}%` }}
            />
          </div>
        </div>
      )}

      {showCodegenBlock && !isGenerating && (
        <div className="space-y-1.5 rounded-lg bg-muted/40 px-2.5 py-2">
          <p className="text-[11px] leading-snug text-muted-foreground">{meta.hint}</p>
          {(codeGenStatus === "failed" || codeGenStatus === "pr_failed") && codeGenError && (
            <p className="rounded-md border border-red-500/20 bg-red-500/[0.06] px-2 py-1.5 text-[11px] leading-snug text-red-600 dark:text-red-400">
              {formatCodegenError(codeGenError)}
            </p>
          )}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-dashed border-border/50 bg-muted/15 p-2.5">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Build your way.</span> Code in your IDE and
          move this card across columns — AI steps below are{" "}
          <span className="font-medium text-foreground">optional</span>.
        </p>

        {task.aiGeneratable !== false && (
          <>
            <div className="space-y-1.5 border-t border-border/30 pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                AI draft code <span className="font-normal normal-case text-muted-foreground/75">(optional)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {canGenerate && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg border-violet-500/40 text-xs text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
                    disabled={codegen.isPending}
                    onClick={() => codegen.mutate({ taskId: task.id })}
                  >
                    <Bot className="size-3.5" />
                    {task.generatedCode ? "Regenerate with AI" : "Generate with AI"}
                  </Button>
                )}

                {task.generatedCode && (
                  <TaskCodeDialog
                    taskTitle={task.title}
                    generatedCode={task.generatedCode}
                    generatedFilePath={task.generatedFilePath}
                    generatedSummary={task.generatedSummary}
                    draftPrUrl={task.draftPrUrl}
                    draftPrNumber={task.draftPrNumber}
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5 border-t border-border/30 pt-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                GitHub draft PR <span className="font-normal normal-case text-muted-foreground/75">(optional)</span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                Requires AI-generated code, or paste your own commit on GitHub manually.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {canOpenPr && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 rounded-lg border-sky-500/40 text-xs text-sky-700 hover:bg-sky-500/10 dark:text-sky-300"
                    disabled={openDraftPr.isPending}
                    onClick={() => openDraftPr.mutate({ taskId: task.id })}
                  >
                    <GitPullRequest className="size-3.5" />
                    Open draft PR
                  </Button>
                )}

                {task.draftPrUrl && (
                  <a
                    href={task.draftPrUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                  >
                    <ExternalLink className="size-3.5" /> GitHub PR
                  </a>
                )}

                {canReset && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-amber-600"
                    disabled={resetCodegen.isPending}
                    onClick={() => resetCodegen.mutate({ taskId: task.id })}
                  >
                    <RotateCcw className="size-3.5" /> Reset
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Move</span>
          {moveTargets.map((target) => (
            <Button
              key={target.key}
              type="button"
              size="sm"
              variant="outline"
              disabled={isMovingThis}
              onClick={() =>
                updateStatus.mutate({ taskId: task.id, status: target.key })
              }
              className="h-7 gap-1 rounded-md px-2 text-[11px] font-medium"
            >
              <ArrowRight className="size-3" />
              {target.label}
            </Button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            showMore && "bg-muted text-foreground",
          )}
          title="More actions"
        >
          <MoreHorizontal className="size-3.5" />
        </button>
      </div>

      {showMore && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border border-dashed border-border/50 bg-muted/20 p-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setMergeSourceId(mergeSourceId === task.id ? null : task.id)}
          >
            <GitMerge className="size-3" />
            {mergeSourceId === task.id ? "Cancel merge" : "Merge"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setSplitTaskId(splitTaskId === task.id ? null : task.id);
              setSplitTitles(["", ""]);
            }}
          >
            <Scissors className="size-3" />
            {splitTaskId === task.id ? "Cancel split" : "Split"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 text-xs text-red-600 hover:border-red-400 hover:bg-red-500/10"
            disabled={deleteTask.isPending}
            onClick={() => {
              if (confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                deleteTask.mutate({ taskId: task.id });
              }
            }}
          >
            <Trash2 className="size-3" /> Delete
          </Button>
        </div>
      )}

      {mergeSourceId === task.id && (
        <div className="space-y-1.5 rounded-lg border border-dashed border-border/60 bg-muted/20 p-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">Merge into this task:</p>
          {sameFeatureTasks(task.id, task.featureRequest.id).length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No other tasks in this feature.</p>
          ) : (
            sameFeatureTasks(task.id, task.featureRequest.id).map((other) => (
              <Button
                key={other.id}
                type="button"
                size="sm"
                variant="secondary"
                className="h-8 w-full justify-start text-xs"
                disabled={merge.isPending}
                onClick={() => merge.mutate({ primaryTaskId: task.id, secondaryTaskId: other.id })}
              >
                + {other.title}
              </Button>
            ))
          )}
        </div>
      )}

      {splitTaskId === task.id && (
        <div className="space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-2.5">
          <p className="text-[11px] font-medium text-muted-foreground">Split into subtasks (min. 2):</p>
          {splitTitles.map((title, i) => (
            <Input
              key={i}
              value={title}
              placeholder={`Subtask ${i + 1}`}
              className="h-8 text-xs"
              onChange={(e) => {
                const n = [...splitTitles];
                n[i] = e.target.value;
                setSplitTitles(n);
              }}
            />
          ))}
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setSplitTitles([...splitTitles, ""])}
            >
              + Row
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={split.isPending || splitTitles.filter((t) => t.trim()).length < 2}
              onClick={() =>
                split.mutate({
                  taskId: task.id,
                  parts: splitTitles.filter((t) => t.trim()).map((t) => ({ title: t.trim() })),
                })
              }
            >
              Split task
            </Button>
          </div>
        </div>
      )}
    </CollapsibleCard>
  );
}

function AlertBanner({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:text-amber-300">
      <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function GuidePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  if (!open) return null;
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent shadow-sm">
      <CardHeader className="gap-1 pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="size-4 text-primary" />
            </span>
            How the Task Board works
          </span>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-normal text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Hide <ChevronDown className="size-3.5" />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs text-muted-foreground">
        <p className="leading-relaxed">
          Tasks come from approved requirements and are grouped by <strong className="text-foreground">feature</strong>.
          You can build entirely in your IDE — <strong className="text-foreground">AI draft code</strong> and{" "}
          <strong className="text-foreground">draft PRs</strong> are optional shortcuts, not required.
        </p>

        <GuideSection title="Columns & workflow">
          <div className="grid gap-2 sm:grid-cols-2">
            <GuideItem icon={<ListTodo className="size-3.5 text-slate-500" />} title="To do" body="Not started. Pick a task and move it to In progress when you begin — in your IDE or with AI." />
            <GuideItem icon={<Circle className="size-3.5 text-amber-500" />} title="In progress" body="Active work. Stay here while coding locally or while optional AI jobs run." />
            <GuideItem icon={<CheckCircle2 className="size-3.5 text-emerald-500" />} title="Done" body="Finished — merged, shipped, or complete in your repo. Use after your PR lands or manual work is done." />
            <GuideItem icon={<ArrowRight className="size-3.5" />} title="Move" body="Each card has Move chips (→ In progress, → Done, etc.) to drag work across the board without AI." />
          </div>
        </GuideSection>

        <GuideSection title="Search & filters">
          <div className="grid gap-2 sm:grid-cols-2">
            <GuideItem icon={<Search className="size-3.5" />} title="Search" body="Filter by task title, feature name, or status text." />
            <GuideItem icon={<Filter className="size-3.5" />} title="Column filter" body="Show only To do, In progress, or Done — or All columns." />
            <GuideItem icon={<Filter className="size-3.5" />} title="Feature filter" body="Focus on one feature request's tasks (useful from the feature detail page)." />
            <GuideItem icon={<EyeOff className="size-3.5" />} title="Hide shipped" body="Hides tasks whose parent feature is already shipped, closed, or cancelled." />
            <GuideItem icon={<RefreshCw className="size-3.5" />} title="Sync PRs" body="Refreshes draft PR status from GitHub for open AI-linked pull requests." />
          </div>
        </GuideSection>

        <GuideSection title="Task cards">
          <div className="grid gap-2 sm:grid-cols-2">
            <GuideItem icon={<ChevronDown className="size-3.5" />} title="Collapsible cards" body="Click a task header to expand or collapse. Status pill and summary stay visible when collapsed." />
            <GuideItem icon={<Sparkles className="size-3.5 text-primary" />} title="Feature groups" body="Tasks are nested under their feature title — click it to open the feature request page." />
            <GuideItem icon={<ListTodo className="size-3.5 text-indigo-500" />} title="Feature status" body="Badge shows where the parent feature sits in the ShipFlow journey (clarify, requirements, dev, etc.)." />
          </div>
        </GuideSection>

        <GuideSection title="Optional AI & GitHub (you can skip all of this)">
          <div className="grid gap-2 sm:grid-cols-2">
            <GuideItem icon={<Bot className="size-3.5 text-violet-500" />} title="Generate with AI" body="Optional — AI drafts code and saves it on the task. Use View code to copy into your IDE, or ignore and write yourself." />
            <GuideItem icon={<FileCode className="size-3.5" />} title="View code" body="Opens the AI-generated file (path, summary, copy button). Only appears after an AI run." />
            <GuideItem icon={<GitPullRequest className="size-3.5 text-sky-500" />} title="Open draft PR" body="Optional — pushes saved AI code to GitHub as a draft PR. Slow; needs GitHub App permissions. Skip if you commit manually." />
            <GuideItem icon={<ExternalLink className="size-3.5" />} title="GitHub PR" body="Opens the linked draft PR on GitHub after Open draft PR succeeds." />
            <GuideItem icon={<RotateCcw className="size-3.5 text-amber-500" />} title="Reset" body="Clears a stuck or failed AI/PR job. Keeps saved AI code when present so you can retry or work locally." />
          </div>
        </GuideSection>

        <GuideSection title="Manual IDE path (no AI)">
          <p className="mb-2 leading-relaxed">
            1. Move task to <strong className="text-foreground">In progress</strong> → 2. Code in VS Code / Cursor / any IDE →
            3. Open PR on GitHub yourself → 4. Move task to <strong className="text-foreground">Done</strong>.
            Link the PR on the feature page if you want AI review.
          </p>
        </GuideSection>

        <GuideSection title="More actions (⋯ menu on each card)">
          <div className="grid gap-2 sm:grid-cols-2">
            <GuideItem icon={<GitMerge className="size-3.5" />} title="Merge" body="Combine two tasks from the same feature into one. Pick the target, then choose which task to absorb." />
            <GuideItem icon={<Scissors className="size-3.5" />} title="Split" body="Break one large task into smaller subtasks (at least two titles required)." />
            <GuideItem icon={<Trash2 className="size-3.5 text-red-500" />} title="Delete" body="Permanently removes the task. Cannot be undone." />
            <GuideItem icon={<MoreHorizontal className="size-3.5" />} title="⋯ menu" body="Click the three-dot button on a card to reveal Merge, Split, and Delete." />
          </div>
        </GuideSection>
      </CardContent>
    </Card>
  );
}

function GuideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground/80">{title}</h3>
      {children}
    </div>
  );
}

function GuideItem({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-border/50 bg-background/70 p-2.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>
        <span className="font-medium text-foreground">{title}</span>
        <span className="text-muted-foreground"> — {body}</span>
      </span>
    </div>
  );
}
