export type GitHubRepo = {
  id: number;
  name: string;
  fullName: string;
  visibility: "public" | "private";
  defaultBranch: string;
  updatedAt: string;
  language: string | null;
  stars: number;
};

export type GitHubReposPage = {
  repos: GitHubRepo[];
  hasMore: boolean;
  totalCount: number;
};
