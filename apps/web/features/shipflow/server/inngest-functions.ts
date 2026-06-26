import { inngest } from "@/features/inngest/client";
import {
  AI_CREDIT_COSTS,
  addClarification,
  getFeatureRequest,
  updateFeatureStatus,
  upsertPrd,
} from "@repo/services";
import { chargeFeatureCreditsForJob } from "@/features/shipflow/server/feature-credits";
import {
  shipflowCreditJobFailure,
  shipflowFeatureNotFound,
} from "@/features/shipflow/server/job-results";
import { generateClarificationQuestions, generatePrdFromRequest } from "./ai";
import {
  findSimilarFeatureRequests,
  formatSimilarFeaturesForClarify,
} from "./feature-similarity";

/** Deducts AI_CREDIT_COSTS.clarify / .prd via chargeFeatureCreditsForJob before AI work. */
export const clarifyFeatureRequest = inngest.createFunction(
  {
    id: "clarify-feature-request",
    triggers: [{ event: "shipflow/feature.clarify" }],
  },
  async ({ event }) => {
    const { featureRequestId } = event.data as { featureRequestId: string };
    const feature = await getFeatureRequest(featureRequestId);
    if (!feature) return shipflowFeatureNotFound();

    const creditError = await chargeFeatureCreditsForJob(
      feature.project.workspaceId,
      AI_CREDIT_COSTS.clarify,
    );
    if (creditError) return shipflowCreditJobFailure(creditError);

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
      similarContext,
    );

    await addClarification(featureRequestId, "assistant", questions);

    return { ok: true, questions };
  },
);

export const generatePrd = inngest.createFunction(
  {
    id: "generate-prd",
    triggers: [{ event: "shipflow/prd.generate" }],
  },
  async ({ event }) => {
    const { featureRequestId } = event.data as { featureRequestId: string };
    const feature = await getFeatureRequest(featureRequestId);
    if (!feature) return shipflowFeatureNotFound();

    const creditError = await chargeFeatureCreditsForJob(
      feature.project.workspaceId,
      AI_CREDIT_COSTS.prd,
    );
    if (creditError) return shipflowCreditJobFailure(creditError);

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
    await updateFeatureStatus(featureRequestId, "prd_ready");

    return { ok: true };
  },
);
