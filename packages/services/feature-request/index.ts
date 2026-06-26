import { prisma } from "@repo/database";

export async function listFeatureRequests(projectId: string) {
  return prisma.featureRequest.findMany({
    where: { projectId },
    include: {
      prd: { select: { id: true, status: true } },
      _count: { select: { tasks: true, pullRequests: true, aiReviews: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getFeatureRequest(id: string) {
  return prisma.featureRequest.findUnique({
    where: { id },
    include: {
      project: { include: { workspace: true } },
      clarifications: { orderBy: { createdAt: "asc" } },
      prd: true,
      tasks: { orderBy: [{ status: "asc" }, { order: "asc" }] },
      pullRequests: { orderBy: { updatedAt: "desc" } },
      aiReviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          pullRequest: {
            select: {
              repoFullName: true,
              prNumber: true,
              title: true,
            },
          },
        },
      },
      approvals: { orderBy: { createdAt: "desc" }, include: { reviewer: { select: { name: true, email: true } } } },
    },
  });
}

export async function createFeatureRequest(input: {
  projectId: string;
  title: string;
  description: string;
  source?: string;
  createdById?: string;
}) {
  return prisma.featureRequest.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      source: input.source ?? "manual",
      createdById: input.createdById,
      status: "draft",
    },
  });
}

export async function updateFeatureStatus(id: string, status: string) {
  return prisma.featureRequest.update({
    where: { id },
    data: { status },
  });
}

export async function addClarification(
  featureRequestId: string,
  role: "user" | "assistant",
  content: string,
) {
  return prisma.clarificationMessage.create({
    data: { featureRequestId, role, content },
  });
}
