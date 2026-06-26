import { prisma } from "@/lib/db";

export type SimilarFeature = {
  id: string;
  title: string;
  status: string;
};

/** Rule-based check for likely duplicate / existing features in the same project. */
export async function findSimilarFeatureRequests(
  projectId: string,
  title: string,
  excludeFeatureRequestId?: string,
): Promise<SimilarFeature[]> {
  const normalized = title.trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  const candidates = await prisma.featureRequest.findMany({
    where: {
      projectId,
      ...(excludeFeatureRequestId
        ? { id: { not: excludeFeatureRequestId } }
        : {}),
      status: { notIn: ["rejected", "duplicate", "shipped"] },
    },
    select: { id: true, title: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return candidates.filter((feature) => {
    const other = feature.title.trim().toLowerCase();
    if (other === normalized) {
      return true;
    }

    if (other.includes(normalized) || normalized.includes(other)) {
      return true;
    }

    const words = normalized.split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) {
      return false;
    }

    const matches = words.filter((word) => other.includes(word));
    return matches.length >= Math.min(2, words.length);
  });
}

export function formatSimilarFeaturesForClarify(
  similar: SimilarFeature[],
): string {
  if (similar.length === 0) {
    return "";
  }

  const lines = similar.map(
    (f) => `- "${f.title}" (status: ${f.status}, id: ${f.id})`,
  );

  return [
    "Similar features already exist in this project:",
    ...lines,
    "",
    "If this request duplicates an existing feature, educate the user and suggest using or extending the existing work instead of building anew.",
  ].join("\n");
}
