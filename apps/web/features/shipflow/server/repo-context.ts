import type { Octokit } from "octokit";

import { getGitHubApp } from "@/features/github/utils/github-app";

type RepoContext = {
  repoFullName: string;
  defaultBranch: string;
  description: string | null;
  techStack: string[];
  topFiles: string[];
  readmeSnippet: string | null;
};

function parseFullName(repoFullName: string) {
  const [owner, repo] = repoFullName.split("/");
  if (!owner || !repo) throw new Error(`Invalid repo: ${repoFullName}`);
  return { owner, repo };
}

async function safeGetContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path });
    if ("content" in data && typeof data.content === "string") {
      return Buffer.from(data.content, "base64").toString("utf8");
    }
  } catch {
    // File doesn't exist or access denied.
  }
  return null;
}

/** Infer tech stack from root file names. */
function detectStack(fileNames: string[]): string[] {
  const set = new Set(fileNames);
  const tags: string[] = [];

  if (set.has("package.json")) tags.push("JavaScript/TypeScript (Node.js)");
  if (set.has("next.config.js") || set.has("next.config.ts") || set.has("next.config.mjs")) tags.push("Next.js");
  if (set.has("tailwind.config.js") || set.has("tailwind.config.ts") || set.has("tailwind.config.mjs")) tags.push("Tailwind CSS");
  if (set.has("vite.config.js") || set.has("vite.config.ts")) tags.push("Vite");
  if (set.has("astro.config.mjs") || set.has("astro.config.ts")) tags.push("Astro");
  if (set.has("requirements.txt") || set.has("pyproject.toml") || set.has("setup.py")) tags.push("Python");
  if (set.has("Cargo.toml")) tags.push("Rust");
  if (set.has("go.mod")) tags.push("Go");
  if (set.has("pubspec.yaml")) tags.push("Dart/Flutter");
  if (set.has("pom.xml") || set.has("build.gradle")) tags.push("Java");
  if (set.has("docker-compose.yml") || set.has("Dockerfile")) tags.push("Docker");
  if (set.has("prisma")) tags.push("Prisma ORM");

  return tags;
}

/**
 * Fetch a lightweight snapshot of a repository so the AI can ask
 * codebase-aware clarification questions rather than generic ones.
 * Times out gracefully — returns null if GitHub is unreachable.
 */
export async function fetchRepoContext(
  installationId: number,
  repoFullName: string,
  defaultBranch: string,
): Promise<RepoContext | null> {
  try {
    const app = getGitHubApp();
    const octokit = await app.getInstallationOctokit(installationId);
    const { owner, repo } = parseFullName(repoFullName);

    // Root directory listing
    const rootContents = await (async () => {
      try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path: "" });
        if (Array.isArray(data)) return data;
      } catch {}
      return [];
    })();

    const topFiles = rootContents
      .map((f) => f.name)
      .slice(0, 40);

    const techStack = detectStack(topFiles);

    // README snippet (first 1200 chars)
    const readme = await safeGetContent(octokit, owner, repo, "README.md")
      ?? await safeGetContent(octokit, owner, repo, "readme.md")
      ?? await safeGetContent(octokit, owner, repo, "README.mdx");

    const readmeSnippet = readme ? readme.slice(0, 1200) : null;

    // Repo metadata
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });

    return {
      repoFullName,
      defaultBranch,
      description: repoData.description ?? null,
      techStack,
      topFiles: topFiles.slice(0, 20),
      readmeSnippet,
    };
  } catch {
    return null;
  }
}

export function formatRepoContextForPrompt(ctx: RepoContext): string {
  const lines: string[] = [
    `## Target Repository: ${ctx.repoFullName} (branch: ${ctx.defaultBranch})`,
  ];

  if (ctx.description) {
    lines.push(`Repository description: ${ctx.description}`);
  }

  if (ctx.techStack.length > 0) {
    lines.push(`Tech stack detected: ${ctx.techStack.join(", ")}`);
  }

  if (ctx.topFiles.length > 0) {
    lines.push(`Root files: ${ctx.topFiles.join(", ")}`);
  }

  if (ctx.readmeSnippet) {
    lines.push(`\nREADME (excerpt):\n${ctx.readmeSnippet}`);
  }

  return lines.join("\n");
}
