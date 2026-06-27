"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FeatureStatusBadge } from "@/features/shipflow/components/feature-status-badge";
import { trpc } from "@/trpc/client";
import { cn } from "@/lib/utils";

const columns = [
  { key: "todo" as const, label: "To do" },
  { key: "in_progress" as const, label: "In progress" },
  { key: "done" as const, label: "Done" },
];

type TaskBoardProps = {
  projectId: string;
};

export function TaskBoard({ projectId }: TaskBoardProps) {
  const utils = trpc.useUtils();
  const { data: tasks = [], isLoading } = trpc.task.kanban.useQuery({ projectId });

  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [splitTaskId, setSplitTaskId] = useState<string | null>(null);
  const [splitTitles, setSplitTitles] = useState(["", ""]);

  const invalidate = () => utils.task.kanban.invalidate({ projectId });

  const updateStatus = trpc.task.updateStatus.useMutation({
    onSuccess: invalidate,
    onError: (error) => toast.error(error.message),
  });

  const merge = trpc.task.merge.useMutation({
    onSuccess: async () => {
      toast.success("Tasks merged");
      setMergeSourceId(null);
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const split = trpc.task.split.useMutation({
    onSuccess: async () => {
      toast.success("Task split");
      setSplitTaskId(null);
      setSplitTitles(["", ""]);
      await invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading tasks…</p>;
  }

  const sameFeatureTasks = (taskId: string, featureId: string) =>
    tasks.filter(
      (task) => task.featureRequest.id === featureId && task.id !== taskId,
    );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Move tasks between columns, merge related tasks, or split one task into
        subtasks.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {columns.map((column) => (
          <Card key={column.key}>
            <CardHeader>
              <CardTitle className="text-sm">{column.label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks
                .filter((task) => task.status === column.key)
                .map((task) => (
                  <div
                    key={task.id}
                    className="space-y-2 rounded-lg border p-3 text-sm"
                  >
                    <p className="font-medium">{task.title}</p>
                    <Link
                      href={`/dashboard/feature-requests/${task.featureRequest.id}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {task.featureRequest.title}
                    </Link>
                    <FeatureStatusBadge status={task.featureRequest.status} />

                    <div className="flex flex-wrap gap-1 pt-1">
                      {columns
                        .filter((target) => target.key !== task.status)
                        .map((target) => (
                          <button
                            key={target.key}
                            type="button"
                            disabled={updateStatus.isPending}
                            onClick={() =>
                              updateStatus.mutate({
                                taskId: task.id,
                                status: target.key,
                              })
                            }
                            className={cn(
                              "rounded border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted",
                              updateStatus.isPending && "opacity-50",
                            )}
                          >
                            → {target.label}
                          </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1 border-t pt-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() =>
                          setMergeSourceId(
                            mergeSourceId === task.id ? null : task.id,
                          )
                        }
                      >
                        {mergeSourceId === task.id ? "Cancel merge" : "Merge…"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSplitTaskId(
                            splitTaskId === task.id ? null : task.id,
                          );
                          setSplitTitles(["", ""]);
                        }}
                      >
                        {splitTaskId === task.id ? "Cancel split" : "Split…"}
                      </Button>
                    </div>

                    {mergeSourceId === task.id && (
                      <div className="space-y-1 rounded border border-dashed p-2">
                        <p className="text-xs text-muted-foreground">
                          Merge into this task:
                        </p>
                        {sameFeatureTasks(task.id, task.featureRequest.id).map(
                          (other) => (
                            <Button
                              key={other.id}
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-7 w-full justify-start text-xs"
                              disabled={merge.isPending}
                              onClick={() =>
                                merge.mutate({
                                  primaryTaskId: task.id,
                                  secondaryTaskId: other.id,
                                })
                              }
                            >
                              + {other.title}
                            </Button>
                          ),
                        )}
                      </div>
                    )}

                    {splitTaskId === task.id && (
                      <div className="space-y-2 rounded border border-dashed p-2">
                        <p className="text-xs text-muted-foreground">
                          Split into subtasks:
                        </p>
                        {splitTitles.map((title, index) => (
                          <Input
                            key={index}
                            value={title}
                            placeholder={`Subtask ${index + 1} title`}
                            className="h-8 text-xs"
                            onChange={(event) => {
                              const next = [...splitTitles];
                              next[index] = event.target.value;
                              setSplitTitles(next);
                            }}
                          />
                        ))}
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() =>
                              setSplitTitles([...splitTitles, ""])
                            }
                          >
                            + Add row
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={
                              split.isPending ||
                              splitTitles.filter((title) => title.trim()).length <
                                2
                            }
                            onClick={() =>
                              split.mutate({
                                taskId: task.id,
                                parts: splitTitles
                                  .filter((title) => title.trim())
                                  .map((title) => ({ title: title.trim() })),
                              })
                            }
                          >
                            Split task
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              {tasks.filter((task) => task.status === column.key).length === 0 && (
                <p className="text-xs text-muted-foreground">No tasks</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
