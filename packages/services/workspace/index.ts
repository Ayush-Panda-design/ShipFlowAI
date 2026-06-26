import { prisma } from "@repo/database";
import { getFreePlanAiCredits, isDevCreditsMode, slugify } from "../constants";

export async function listWorkspacesForUser(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    include: {
      members: { where: { userId }, take: 1 },
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getWorkspaceForUser(workspaceId: string, userId: string) {
  return prisma.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      subscription: true,
      projects: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createWorkspace(userId: string, name: string) {
  const baseSlug = slugify(name) || "workspace";
  let slug = baseSlug;
  let suffix = 1;

  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return prisma.workspace.create({
    data: {
      name,
      slug,
      aiCredits: getFreePlanAiCredits(),
      members: { create: { userId, role: "owner" } },
      subscription: { create: { plan: "free", status: "active" } },
    },
    include: { members: true },
  });
}

export async function ensureDefaultWorkspace(userId: string, userName: string) {
  const existing = await listWorkspacesForUser(userId);
  if (existing.length > 0) {
    const workspace = existing[0]!;

    if (isDevCreditsMode() && workspace.plan === "free") {
      return prisma.workspace.update({
        where: { id: workspace.id },
        data: { aiCredits: getFreePlanAiCredits() },
      });
    }

    return workspace;
  }

  return createWorkspace(userId, `${userName.split(" ")[0] ?? "My"}'s Workspace`);
}
