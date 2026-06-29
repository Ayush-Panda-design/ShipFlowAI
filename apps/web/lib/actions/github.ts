"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DASHBOARD_BASE_PATH } from "@/features/dashboard/lib/routes";
import {
  deleteInstallationForUser,
  saveInstallationFromGitHub,
  syncInstallationForUser,
} from "@/features/github/server/installation";
import { requireSession } from "@/lib/auth-session";

function redirectWithGitHubError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (
    message.includes("not on your github account") ||
    message.includes("sign in with github") ||
    message.includes("cannot access someone else")
  ) {
    redirect(`${DASHBOARD_BASE_PATH}/github-app?error=wrong_github_account`);
  }

  redirect(`${DASHBOARD_BASE_PATH}/github-app?error=${fallback}`);
}

export async function linkGitHubInstallation() {
  const session = await requireSession();

  try {
    await syncInstallationForUser(session.user.id);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[github/link] failed:", error);
    }
    redirectWithGitHubError(error, "link_failed");
  }

  revalidatePath(`${DASHBOARD_BASE_PATH}/github-app`);
  revalidatePath(`${DASHBOARD_BASE_PATH}/repositories`);
  redirect(`${DASHBOARD_BASE_PATH}/github-app`);
}

export async function linkGitHubInstallationById(formData: FormData) {
  const session = await requireSession();
  const installationId = formData.get("installationId");
  const parsedId = Number(String(installationId ?? "").trim());

  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    redirect(`${DASHBOARD_BASE_PATH}/github-app?error=invalid_installation_id`);
  }

  try {
    await saveInstallationFromGitHub(session.user.id, parsedId);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[github/link-by-id] failed:", error);
    }
    redirectWithGitHubError(error, "link_failed");
  }

  revalidatePath(`${DASHBOARD_BASE_PATH}/github-app`);
  revalidatePath(`${DASHBOARD_BASE_PATH}/repositories`);
  redirect(`${DASHBOARD_BASE_PATH}/github-app`);
}

export async function disconnectGitHubApp() {
  const session = await requireSession();
  await deleteInstallationForUser(session.user.id);
  revalidatePath(`${DASHBOARD_BASE_PATH}/github-app`);
  revalidatePath(`${DASHBOARD_BASE_PATH}/repositories`);
}
