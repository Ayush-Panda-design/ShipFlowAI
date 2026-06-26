import { prisma } from "@/lib/db";

type LinkSignals = {
  repoFullName: string;
  branch?: string | null;
  title?: string | null;
  body?: string | null;
};

export type FeatureLinkResult = {
  featureRequestId: string | null;
  projectId: string | null;
  repositoryId: string | null;
};

const FEATURE_ID_PATTERN = /[a-z0-9]{12,}/i;

const FEATURE_ID_EXTRACTORS = [
  /(?:feature|feat|shipflow)\/([a-z0-9]{12,})/i,
  /\[shipflow:([a-z0-9]{12,})\]/i,
  /\[feature:([a-z0-9]{12,})\]/i,
  /shipflow-feature:\s*([a-z0-9]{12,})/i,
  /<!--\s*shipflow:feature:([a-z0-9]{12,})\s*-->/i,
];

export function extractFeatureRequestId(signals: {
  branch?: string | null;
  title?: string | null;
  body?: string | null;
}) {
  const haystack = [signals.branch, signals.title, signals.body]
    .filter((value): value is string => Boolean(value))
    .join("\n");

  for (const pattern of FEATURE_ID_EXTRACTORS) {
    const match = haystack.match(pattern);
    if (match?.[1] && FEATURE_ID_PATTERN.test(match[1])) {
      return match[1];
    }
  }

  return null;
}

export async function resolveFeatureLink(
  input: LinkSignals
): Promise<FeatureLinkResult> {
  const connectedRepo = await prisma.connectedRepository.findFirst({
    where: { repoFullName: input.repoFullName },
    select: { id: true, projectId: true },
  });

  const candidateId = extractFeatureRequestId({
    branch: input.branch,
    title: input.title,
    body: input.body,
  });

  if (!candidateId) {
    return {
      featureRequestId: null,
      projectId: connectedRepo?.projectId ?? null,
      repositoryId: connectedRepo?.id ?? null,
    };
  }

  const feature = await prisma.featureRequest.findUnique({
    where: { id: candidateId },
    select: { id: true, projectId: true },
  });

  if (!feature) {
    return {
      featureRequestId: null,
      projectId: connectedRepo?.projectId ?? null,
      repositoryId: connectedRepo?.id ?? null,
    };
  }

  return {
    featureRequestId: feature.id,
    projectId: connectedRepo?.projectId ?? feature.projectId,
    repositoryId: connectedRepo?.id ?? null,
  };
}
