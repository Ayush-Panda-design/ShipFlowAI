import type { Octokit } from "octokit";

import { getGitHubApp } from "@/features/github/utils/github-app";

function parseRepoFullName(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid repository name: ${repoFullName}`);
  }
  return { owner, repo };
}

/**
 * Try to create a git ref. If the branch already exists (422), append a short
 * timestamp so we get a unique name instead of failing the whole codegen job.
 */
async function ensureUniqueBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
  sha: string,
): Promise<string> {
  try {
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    });
    return branchName;
  } catch (err: unknown) {
    // 422 = Reference already exists
    const status = (err as { status?: number }).status;
    if (status === 422) {
      const fallback = `${branchName}-${Date.now()}`;
      await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${fallback}`,
        sha,
      });
      return fallback;
    }
    throw err;
  }
}

function formatGitHubApiError(err: unknown, action: string): Error {
  const status = (err as { status?: number }).status;
  const message =
    (err as { message?: string }).message ??
    (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
    String(err);

  if (status === 403 && message.toLowerCase().includes("resource not accessible by integration")) {
    return new Error(
      `GitHub blocked ${action}: the app needs Contents and Pull requests permissions (Read & write) on this repository.`,
    );
  }

  if (status === 404) {
    return new Error(
      `GitHub could not find the repository or branch for ${action}. Check that the repo is connected and the default branch is correct.`,
    );
  }

  return err instanceof Error ? err : new Error(message);
}

export async function createDraftPullRequest(input: {
  installationId: number;
  repoFullName: string;
  baseBranch: string;
  branchName: string;
  filePath: string;
  fileContent: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
}) {
  const { owner, repo } = parseRepoFullName(input.repoFullName);
  const app = getGitHubApp();
  const octokit = await app.getInstallationOctokit(input.installationId);

  let baseRef;
  try {
    baseRef = await octokit.rest.git.getRef({
      owner,
      repo,
      ref: `heads/${input.baseBranch}`,
    });
  } catch (err) {
    throw formatGitHubApiError(err, "reading the base branch");
  }

  let actualBranch: string;
  try {
    actualBranch = await ensureUniqueBranch(
      octokit,
      owner,
      repo,
      input.branchName,
      baseRef.data.object.sha,
    );
  } catch (err) {
    throw formatGitHubApiError(err, "creating a branch");
  }

  let existingFileSha: string | undefined;
  try {
    const existing = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: input.filePath,
      ref: actualBranch,
    });
    if (!Array.isArray(existing.data) && "sha" in existing.data) {
      existingFileSha = existing.data.sha;
    }
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status !== 404) {
      throw formatGitHubApiError(err, "reading the target file");
    }
  }

  try {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: input.filePath,
      message: input.commitMessage,
      content: Buffer.from(input.fileContent, "utf8").toString("base64"),
      branch: actualBranch,
      ...(existingFileSha ? { sha: existingFileSha } : {}),
    });
  } catch (err) {
    throw formatGitHubApiError(err, "committing the generated file");
  }

  let pullRequest;
  try {
    pullRequest = await octokit.rest.pulls.create({
      owner,
      repo,
      title: input.prTitle,
      head: actualBranch,
      base: input.baseBranch,
      body: `${input.prBody}\n\n---\n🤖 _AI-generated draft — pending ShipFlow review_`,
      draft: true,
    });
  } catch (err) {
    throw formatGitHubApiError(err, "opening the draft pull request");
  }

  return {
    prNumber: pullRequest.data.number,
    htmlUrl: pullRequest.data.html_url,
    headSha: pullRequest.data.head.sha,
  };
}
