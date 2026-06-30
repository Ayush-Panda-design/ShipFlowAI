"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RepoPullRequestsDialog } from "@/features/dashboard/components/repo-pull-requests-dialog";
import { usePullRequestReviewDialog } from "@/features/dashboard/components/use-pull-request-review-dialog";
import {
  connectRepositoryAction,
  disconnectRepositoryAction,
} from "@/lib/actions/shipflow";
import { ReposList } from "@/features/dashboard/components/repos-list";

type ConnectedRepo = {
  repoFullName: string;
  projectId: string;
};

type ReposConnectPanelProps = {
  projectId: string;
  installationId: number;
  connectedRepos: ConnectedRepo[];
  repoLimit: number;
};

export function ReposConnectPanel({
  projectId,
  installationId,
  connectedRepos,
  repoLimit,
}: ReposConnectPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const { openReview, dialog } = usePullRequestReviewDialog();
  const connectedSet = new Set(connectedRepos.map((repo) => repo.repoFullName));

  const toggleRepo = (
    repoFullName: string,
    defaultBranch: string,
    githubRepoId: number,
    connected: boolean,
  ) => {
    startTransition(async () => {
      try {
        if (connected) {
          await disconnectRepositoryAction(projectId, repoFullName);
          toast.success(`Disconnected ${repoFullName}`);
        } else {
          await connectRepositoryAction(
            projectId,
            repoFullName,
            installationId,
            defaultBranch,
            githubRepoId,
          );
          toast.success(`Connected ${repoFullName}`);
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Repository action failed",
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Badge variant="outline">
          {connectedRepos.length} / {repoLimit} connected
        </Badge>
        <span>Connect repos to your project for ShipFlow tracking and limits.</span>
      </div>
      <ReposList
        onRepoClick={(repo) => {
          setSelectedRepo(repo.fullName);
          setRepoDialogOpen(true);
        }}
        renderActions={(repo) => {
          const connected = connectedSet.has(repo.fullName);
          return (
            <Button
              type="button"
              size="sm"
              variant={connected ? "outline" : "default"}
              disabled={isPending || (!connected && connectedRepos.length >= repoLimit)}
              onClick={() =>
                toggleRepo(repo.fullName, repo.defaultBranch, repo.id, connected)
              }
            >
              {connected ? "Disconnect" : "Connect"}
            </Button>
          );
        }}
      />
      <RepoPullRequestsDialog
        open={repoDialogOpen}
        onOpenChange={setRepoDialogOpen}
        repoFullName={selectedRepo}
        onSelectPullRequest={openReview}
      />
      {dialog}
    </div>
  );
}
