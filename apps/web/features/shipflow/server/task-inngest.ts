import { inngest } from "@/features/inngest/client";
import {
  AI_CREDIT_COSTS,
  createTasks,
  getFeatureRequest,
  updateFeatureStatus,
} from "@repo/services";
import {
  chargeFeatureCreditsForJob,
  type FeatureJobCreditError,
} from "@/features/shipflow/server/feature-credits";
import { shipflowJobFailure } from "@/features/shipflow/server/job-results";
import { generateTasksFromPrd } from "./ai";

export const generateTasks = inngest.createFunction(
  {
    id: "generate-tasks",
    triggers: [{ event: "shipflow/tasks.generate" }],
  },
  async ({ event }) => {
    const { featureRequestId } = event.data as { featureRequestId: string };
    const feature = await getFeatureRequest(featureRequestId);
    if (!feature) {
      return shipflowJobFailure("feature_not_found", "Feature request not found.");
    }
    if (!feature.prd) {
      return shipflowJobFailure("prd_not_found", "PRD not found for this feature.");
    }

    const creditError = await chargeFeatureCreditsForJob(
      feature.project.workspaceId,
      AI_CREDIT_COSTS.tasks,
    );
    if (creditError) {
      return shipflowJobFailure(creditError.error, creditError.message);
    }

    await updateFeatureStatus(featureRequestId, "planning");

    const tasks = await generateTasksFromPrd(feature.prd.rawMarkdown);
    await createTasks(featureRequestId, tasks);
    await updateFeatureStatus(featureRequestId, "in_development");

    return { ok: true, count: tasks.length };
  },
);
