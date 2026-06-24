import { Webhooks } from "@octokit/webhooks";
import { NextResponse } from "next/server";

import { savePullRequest } from "@/features/reviews/server/save-pull-request";
import {
  REVIEWABLE_PR_ACTIONS,
  type PullRequestWebhookPayload,
  type ReviewablePullRequestAction,
} from "@/features/reviews/types/review";

function isReviewableAction(
  action: string
): action is ReviewablePullRequestAction {
  return REVIEWABLE_PR_ACTIONS.includes(action as ReviewablePullRequestAction);
}

export async function handleGitHubWebhook(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const webhooks = new Webhooks({ secret });
  const isValid = await webhooks.verify(payload, signature);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  let data: PullRequestWebhookPayload;
  try {
    data = JSON.parse(payload) as PullRequestWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (!isReviewableAction(data.action)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    await savePullRequest(data);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[github/webhook] save failed:", error);
    }

    return NextResponse.json(
      { error: "Failed to save pull request" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
