import { inngest } from "@/features/inngest/client";
import {
  createTasks,
  getFeatureRequest,
  updateFeatureStatus,
} from "@repo/services";
import {
  AI_CREDIT_COSTS,
  consumeFeatureCreditsForJob,
} from "@/features/shipflow/server/feature-credits";
import { generateTasksFromPrd } from "./ai";

export const generateTasks = inngest.createFunction(
  {
    id: "generate-tasks",
    triggers: [{ event: "shipflow/tasks.generate" }],
  },
  async ({ event }) => {
    const { featureRequestId } = event.data as { featureRequestId: string };
    const feature = await getFeatureRequest(featureRequestId);
    if (!feature?.prd) return { ok: false, error: "prd_not_found" };

    const creditFailure = await consumeFeatureCreditsForJob(
      featureRequestId,
      AI_CREDIT_COSTS.tasks,
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

    await updateFeatureStatus(featureRequestId, "planning");

    const tasks = await generateTasksFromPrd(feature.prd.rawMarkdown);
    await createTasks(featureRequestId, tasks);
    await updateFeatureStatus(featureRequestId, "in_development");

    return { ok: true, count: tasks.length };
  },
);
