import {
  getInstallationForUser,
  tryAutoLinkGitHubInstallation,
} from "@/features/github/server/installation";
import { prisma } from "@/lib/db";
import { countConnectedRepositories } from "@repo/services";

export type OnboardingStep = 1 | 2 | 3 | "complete";

export type OnboardingState = {
  variant: "email" | "github";
  signedInWithGitHub: boolean;
  githubAppConnected: boolean;
  githubAccountLogin: string | null;
  connectedRepos: number;
  currentStep: OnboardingStep;
  isComplete: boolean;
};

export async function getOnboardingState(
  userId: string,
  workspaceId: string,
): Promise<OnboardingState> {
  const [githubAccount, connectedRepos] = await Promise.all([
    prisma.account.findFirst({
      where: { userId, providerId: "github" },
      select: { id: true },
    }),
    countConnectedRepositories(workspaceId),
  ]);

  const signedInWithGitHub = Boolean(githubAccount);

  const installation =
    (await getInstallationForUser(userId)) ??
    (await tryAutoLinkGitHubInstallation(userId));

  const githubAppConnected = Boolean(installation);
  const githubAccountLogin = installation?.accountLogin ?? null;

  const isComplete =
    signedInWithGitHub && githubAppConnected && connectedRepos > 0;

  let currentStep: OnboardingStep = "complete";
  if (!isComplete) {
    if (!signedInWithGitHub) {
      currentStep = 1;
    } else if (!githubAppConnected) {
      currentStep = 2;
    } else {
      currentStep = 3;
    }
  }

  return {
    variant: signedInWithGitHub ? "github" : "email",
    signedInWithGitHub,
    githubAppConnected,
    githubAccountLogin,
    connectedRepos,
    currentStep,
    isComplete,
  };
}
