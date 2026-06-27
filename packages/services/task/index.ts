import { prisma } from "@repo/database";

export type TaskInput = {
  title: string;
  description?: string;
  priority?: string;
  order?: number;
};

export async function listTasks(featureRequestId: string) {
  return prisma.task.findMany({
    where: { featureRequestId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function createTasks(featureRequestId: string, tasks: TaskInput[]) {
  return prisma.$transaction(
    tasks.map((task, index) =>
      prisma.task.create({
        data: {
          featureRequestId,
          title: task.title,
          description: task.description,
          priority: task.priority ?? "medium",
          order: task.order ?? index,
        },
      }),
    ),
  );
}

export async function updateTaskStatus(taskId: string, status: string) {
  return prisma.task.update({
    where: { id: taskId },
    data: { status },
  });
}

export async function mergeTasks(primaryTaskId: string, secondaryTaskId: string) {
  const [primary, secondary] = await Promise.all([
    prisma.task.findUnique({ where: { id: primaryTaskId } }),
    prisma.task.findUnique({ where: { id: secondaryTaskId } }),
  ]);

  if (!primary || !secondary) {
    throw new Error("Task not found");
  }

  if (primary.featureRequestId !== secondary.featureRequestId) {
    throw new Error("Tasks must belong to the same feature to merge");
  }

  const mergedTitle = `${primary.title} + ${secondary.title}`;
  const mergedDescription = [primary.description, secondary.description]
    .filter(Boolean)
    .join("\n\n---\n\n");

  return prisma.$transaction([
    prisma.task.update({
      where: { id: primaryTaskId },
      data: {
        title: mergedTitle.slice(0, 500),
        description: mergedDescription || primary.description,
      },
    }),
    prisma.task.delete({ where: { id: secondaryTaskId } }),
  ]);
}

export async function splitTask(
  taskId: string,
  parts: Array<{ title: string; description?: string }>,
) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    throw new Error("Task not found");
  }

  if (parts.length < 2) {
    throw new Error("Split requires at least two subtasks");
  }

  const baseOrder = task.order;

  return prisma.$transaction([
    prisma.task.delete({ where: { id: taskId } }),
    ...parts.map((part, index) =>
      prisma.task.create({
        data: {
          featureRequestId: task.featureRequestId,
          title: part.title.trim(),
          description: part.description?.trim() || task.description,
          status: task.status,
          priority: task.priority,
          order: baseOrder + index,
        },
      }),
    ),
  ]);
}

export async function listKanbanTasks(projectId: string) {
  return prisma.task.findMany({
    where: { featureRequest: { projectId } },
    include: {
      featureRequest: { select: { id: true, title: true, status: true } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}
