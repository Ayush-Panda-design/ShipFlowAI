import type { ReviewContext } from "@/features/reviews/types/structured-review";
import { prisma } from "@/lib/db";

export async function loadReviewContext(
  featureRequestId: string | null
): Promise<ReviewContext> {
  if (!featureRequestId) {
    return {
      featureRequestId: null,
      featureTitle: null,
      prd: null,
      tasks: [],
    };
  }

  const feature = await prisma.featureRequest.findUnique({
    where: { id: featureRequestId },
    select: {
      id: true,
      title: true,
      prd: {
        select: {
          problemStatement: true,
          goals: true,
          nonGoals: true,
          userStories: true,
          acceptanceCriteria: true,
          edgeCases: true,
        },
      },
      tasks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          title: true,
          description: true,
          status: true,
        },
      },
    },
  });

  if (!feature) {
    return {
      featureRequestId: null,
      featureTitle: null,
      prd: null,
      tasks: [],
    };
  }

  return {
    featureRequestId: feature.id,
    featureTitle: feature.title,
    prd: feature.prd,
    tasks: feature.tasks,
  };
}
