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
import { disconnectGitHubApp, linkGitHubInstallation } from "@/lib/actions/github";
import { cn } from "@/lib/utils";

type GitHubConnectCardProps = {
  userId: string;
  installation: {
    accountLogin: string;
    accountType: string;
  } | null;
  signedInWithGitHub: boolean;
  error?: string | null;
};

const errorMessages: Record<string, string> = {
  missing_params:
    "GitHub did not return installation details after you approved access. Click Install on GitHub again.",
  invalid_state:
    "Your session changed during the GitHub redirect. Stay signed in to ShipFlow, then try again.",
  save_failed:
    "ShipFlow could not save the connection. Check server GitHub App env vars, redeploy, then try again.",
  link_failed:
    "Could not link automatically. If you already approved the app on GitHub, click Link my installation. Otherwise click Install on GitHub first.",
  wrong_github_account:
    "That GitHub installation belongs to a different account. Sign in with YOUR GitHub account, then Install on GitHub and pick only your repos.",
  invalid_installation_id: "Enter a valid installation ID from your GitHub installation URL.",
};

function ConnectOption({
  title,
  when,
  steps,
  action,
}: {
  title: string;
  when: string;
  steps: string[];
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 p-4 text-left">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{when}</p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="pt-1">{action}</div>
    </div>
  );
}

export function GitHubConnectCard({
  userId,
  installation,
  signedInWithGitHub,
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
              Sign-in with GitHub only proves who you are. This step grants
              ShipFlow permission to read PRs and repos on{" "}
              <strong>your GitHub account only</strong>.
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
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessages[error] ?? "Something went wrong. Please try again."}
          </p>
        ) : null}

        {!signedInWithGitHub && !isConnected ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            You signed in with email. Sign out and use{" "}
            <strong>Sign in with GitHub</strong> first — repo access is always
            tied to your GitHub identity.
          </p>
        ) : null}

        {isConnected && installation ? (
          <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Connected as</p>
              <p className="font-medium">
                @{installation.accountLogin}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({installation.accountType})
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Pull Requests and Repositories now use this GitHub account only.
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
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Already approved on GitHub?</p>
              <p className="mt-1">
                If you completed the GitHub permission screen but ShipFlow still
                shows disconnected, click <strong>Link my installation</strong>{" "}
                below — no second trip to GitHub.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <ConnectOption
                title="Install on GitHub"
                when="Use this the first time, or if you never selected repositories on GitHub."
                steps={[
                  "Opens github.com (same account you used to sign in).",
                  "Choose your personal account (not someone else's).",
                  "Select which repositories ShipFlow may access.",
                  "GitHub sends you back here automatically when done.",
                ]}
                action={
                  <a
                    href={installUrl}
                    className={buttonVariants({ className: "w-full sm:w-fit" })}
                  >
                    Install on GitHub
                  </a>
                }
              />

              <ConnectOption
                title="Link my installation"
                when="Use this only after you already installed the app on GitHub but ShipFlow still says disconnected."
                steps={[
                  "Does not open GitHub again.",
                  "ShipFlow looks up the app install on your signed-in GitHub account.",
                  "Connects that install to this dashboard.",
                  "If this fails, use Install on GitHub instead (your token may need refresh — sign out and sign in with GitHub).",
                ]}
                action={
                  <form action={linkGitHubInstallation}>
                    <Button type="submit" variant="outline" className="w-full sm:w-fit">
                      <Plug />
                      Link my installation
                    </Button>
                  </form>
                }
              />
            </div>
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
