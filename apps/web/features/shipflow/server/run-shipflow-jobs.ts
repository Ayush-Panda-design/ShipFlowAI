import {
  AI_CREDIT_COSTS,
  addClarification,
  createTasks,
  getFeatureRequest,
  updateFeatureStatus,
  upsertPrd,
} from "@repo/services";

import { chargeFeatureCreditsForJob } from "@/features/shipflow/server/feature-credits";
import {
  shipflowCreditJobFailure,
  shipflowFeatureNotFound,
  shipflowPrdNotFound,
  type ShipflowJobFailure,
} from "@/features/shipflow/server/job-results";
import {
  generateClarificationQuestions,
  generatePrdFromRequest,
  generateTasksFromPrd,
} from "@/features/shipflow/server/ai";
import {
  findSimilarFeatureRequests,
  formatSimilarFeaturesForClarify,
} from "@/features/shipflow/server/feature-similarity";

function throwOnJobFailure(result: ShipflowJobFailure): never {
  throw new Error(result.message ?? result.error);
}

export async function runClarifyJob(featureRequestId: string) {
  const feature = await getFeatureRequest(featureRequestId);
  if (!feature) {
    throwOnJobFailure(shipflowFeatureNotFound());
  }

  const creditError = await chargeFeatureCreditsForJob(
    feature.project.workspaceId,
    AI_CREDIT_COSTS.clarify,
  );
  if (creditError) {
    throwOnJobFailure(shipflowCreditJobFailure(creditError));
  }

  await updateFeatureStatus(featureRequestId, "clarifying");

  const similar = await findSimilarFeatureRequests(
    feature.projectId,
    feature.title,
    featureRequestId,
  );
  const similarContext = formatSimilarFeaturesForClarify(similar);

  const questions = await generateClarificationQuestions(
    feature.title,
    feature.description,
    { similarFeaturesContext: similarContext },
  );

  await addClarification(featureRequestId, "assistant", questions);
  await updateFeatureStatus(featureRequestId, "draft");

  return { ok: true as const, questions };
}

export async function runPrdJob(featureRequestId: string) {
  const feature = await getFeatureRequest(featureRequestId);
  if (!feature) {
    throwOnJobFailure(shipflowFeatureNotFound());
  }

  const creditError = await chargeFeatureCreditsForJob(
    feature.project.workspaceId,
    AI_CREDIT_COSTS.prd,
  );
  if (creditError) {
    throwOnJobFailure(shipflowCreditJobFailure(creditError));
  }

  await updateFeatureStatus(featureRequestId, "prd_generating");

  const clarifications = feature.clarifications
    .map((c) => `${c.role}: ${c.content}`)
    .join("\n");

  const prd = await generatePrdFromRequest(
    feature.title,
    feature.description,
    clarifications,
  );

  await upsertPrd(featureRequestId, prd);
  await updateFeatureStatus(featureRequestId, "awaiting_prd_approval");

  return { ok: true as const };
}

export async function runTasksJob(featureRequestId: string) {
  const feature = await getFeatureRequest(featureRequestId);
  if (!feature) {
    throwOnJobFailure(shipflowFeatureNotFound());
  }
  if (!feature.prd) {
    throwOnJobFailure(shipflowPrdNotFound());
  }
  if (feature.prd.status !== "approved") {
    throw new Error("Approve the PRD before generating tasks.");
  }
  // Allow retrying from "planning" (stuck job) as well as normal "prd_ready".
  if (feature.status !== "prd_ready" && feature.status !== "planning") {
    throw new Error(`Cannot generate tasks in status "${feature.status}". PRD must be approved first.`);
  }

  const creditError = await chargeFeatureCreditsForJob(
    feature.project.workspaceId,
    AI_CREDIT_COSTS.tasks,
  );
  if (creditError) {
    throwOnJobFailure(shipflowCreditJobFailure(creditError));
  }

  await updateFeatureStatus(featureRequestId, "planning");

  try {
    const tasks = await generateTasksFromPrd(feature.prd.rawMarkdown);
    // Cap at 12 tasks — keeps saves fast and the board manageable.
    const capped = tasks.slice(0, 12);
    await createTasks(featureRequestId, capped);
    await updateFeatureStatus(featureRequestId, "awaiting_plan_approval");
    return { ok: true as const, count: capped.length };
  } catch (error) {
    // Roll back so the user can retry without being stuck on "planning".
    await updateFeatureStatus(featureRequestId, "prd_ready").catch(() => undefined);
    throw error;
  }
}
