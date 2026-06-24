import type { GitHubRepo, GitHubReposPage } from "@/features/github/types";
import { getGitHubApp } from "@/features/github/utils/github-app";

export async function getInstallationReposPage(
  installationId: number,
  page: number
): Promise<GitHubReposPage> {
  const app = getGitHubApp();
  const octokit = await app.getInstallationOctokit(installationId);

  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
    per_page: 100,
    page,
  });

  const repos: GitHubRepo[] = data.repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    visibility: repo.private ? "private" : "public",
    defaultBranch: repo.default_branch ?? "main",
    updatedAt: repo.updated_at ?? new Date().toISOString(),
    language: repo.language ?? null,
    stars: repo.stargazers_count ?? 0,
  }));

  return {
    repos,
    hasMore: data.repositories.length === 100,
    totalCount: data.total_count,
  };
}
