import { AppWindow, Plug, Unplug } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { githubAppStatusStyles } from "@/features/dashboard/lib/status-styles";
import {
  getGitHubAppConfigError,
  getGitHubInstallUrl,
} from "@/features/github/utils/github-app";
import { Input } from "@/components/ui/input";
import { disconnectGitHubApp, linkGitHubInstallation, linkGitHubInstallationById } from "@/lib/actions/github";
import { cn } from "@/lib/utils";

type GitHubConnectCardProps = {
  userId: string;
  installation: {
    accountLogin: string;
    accountType: string;
  } | null;
  error?: string | null;
};

const errorMessages: Record<string, string> = {
  missing_params: "GitHub did not return installation details. Try again.",
  invalid_state: "Installation state did not match your account. Try again.",
  save_failed: "Could not save the GitHub App installation. Check your app credentials.",
  link_failed:
    "Could not link the installation. Verify GITHUB_APP_ID is the numeric App ID from GitHub App settings (not Client ID) and that GITHUB_APP_PRIVATE_KEY matches the same app. Restart the dev server after editing .env.",
  invalid_installation_id: "Enter a valid installation ID from your GitHub installation URL.",
};

export function GitHubConnectCard({
  userId,
  installation,
  error,
}: GitHubConnectCardProps) {
  const isConnected = Boolean(installation);
  const configError = getGitHubAppConfigError();
  const installUrl = getGitHubInstallUrl(userId);
  const canInstall = Boolean(installUrl);
  const status = isConnected ? "connected" : canInstall ? "disconnected" : "error";
  const statusStyle = githubAppStatusStyles[status];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <AppWindow className="size-5" />
              GitHub App
            </CardTitle>
            <CardDescription>
              Install the app on your GitHub account or organization to grant
              repository access for code reviews.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={cn("shrink-0 font-medium", statusStyle.badgeClassName)}
          >
            {statusStyle.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive">
            {errorMessages[error] ?? "Something went wrong. Please try again."}
          </p>
        ) : null}

        {isConnected && installation ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Installed on</p>
              <p className="font-medium">
                @{installation.accountLogin}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({installation.accountType})
                </span>
              </p>
            </div>
            <form action={disconnectGitHubApp}>
              <Button type="submit" variant="outline">
                <Unplug />
                Disconnect
              </Button>
            </form>
          </div>
        ) : canInstall && installUrl ? (
          <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              If you already installed the app on GitHub, link it to this
              dashboard account. Otherwise, install it first.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <form action={linkGitHubInstallation}>
                <Button type="submit">
                  <Plug />
                  Link existing installation
                </Button>
              </form>
              <a
                href={installUrl}
                className={buttonVariants({ variant: "outline", className: "w-fit" })}
              >
                Install on GitHub
              </a>
            </div>
            <form
              action={linkGitHubInstallationById}
              className="mx-auto flex w-full max-w-sm flex-col gap-2 sm:flex-row"
            >
              <Input
                name="installationId"
                placeholder="Installation ID (e.g. 142268534)"
                inputMode="numeric"
                required
              />
              <Button type="submit" variant="secondary" className="shrink-0">
                Link by ID
              </Button>
            </form>
            <p className="text-xs text-muted-foreground">
              Installation ID is in your GitHub URL:{" "}
              <code className="text-xs">github.com/settings/installations/142268534</code>
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border/60 p-6 text-center">
            <p className="text-sm font-medium">GitHub App not configured</p>
            <p className="text-sm text-muted-foreground">
              {configError ??
                "Check your .env GitHub App values and restart the dev server."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
