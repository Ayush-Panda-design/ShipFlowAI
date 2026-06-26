import { inngest } from "@/features/inngest/client";
import {
  addClarification,
  getFeatureRequest,
  updateFeatureStatus,
  upsertPrd,
} from "@repo/services";
import {
  AI_CREDIT_COSTS,
  consumeFeatureCreditsForJob,
} from "@/features/shipflow/server/feature-credits";
import { generateClarificationQuestions, generatePrdFromRequest } from "./ai";

export const clarifyFeatureRequest = inngest.createFunction(
  {
    id: "clarify-feature-request",
    triggers: [{ event: "shipflow/feature.clarify" }],
  },
  async ({ event }) => {
    const { featureRequestId } = event.data as { featureRequestId: string };
    const feature = await getFeatureRequest(featureRequestId);
    if (!feature) return { ok: false, error: "feature_not_found" };

    const creditFailure = await consumeFeatureCreditsForJob(
      featureRequestId,
      AI_CREDIT_COSTS.clarify,
    );
    if (creditFailure) {
      return {
        ok: false,
        error: creditFailure.code,
        message:
          creditFailure.code === "insufficient_credits"
            ? creditFailure.message
            : undefined,
      };
    }

    await updateFeatureStatus(featureRequestId, "clarifying");

    const questions = await generateClarificationQuestions(
      feature.title,
      feature.description,
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
    if (!feature) return { ok: false, error: "feature_not_found" };

    const creditFailure = await consumeFeatureCreditsForJob(
      featureRequestId,
      AI_CREDIT_COSTS.prd,
    );
    if (creditFailure) {
      return {
        ok: false,
        error: creditFailure.code,
        message:
          creditFailure.code === "insufficient_credits"
            ? creditFailure.message
            : undefined,
      };
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
    await updateFeatureStatus(featureRequestId, "prd_ready");

    return { ok: true };
  },
);
