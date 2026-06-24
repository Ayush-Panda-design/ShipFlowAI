import { handleGitHubWebhook } from "@/features/github/server/webhook-handler";

export async function POST(request: Request) {
  return handleGitHubWebhook(request);
}
