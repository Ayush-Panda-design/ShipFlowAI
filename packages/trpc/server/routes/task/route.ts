import { z } from "zod";
import {
  listKanbanTasks,
  mergeTasks,
  splitTask,
  updateTaskStatus,
} from "@repo/services";
import { prisma } from "@repo/database";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../trpc";

export const taskRouter = router({
  kanban: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: {
          id: input.projectId,
          workspace: { members: { some: { userId: ctx.userId } } },
        },
      });

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return listKanbanTasks(input.projectId);
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        status: z.enum(["todo", "in_progress", "done"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await prisma.task.findFirst({
        where: {
          id: input.taskId,
          featureRequest: {
            project: {
              workspace: { members: { some: { userId: ctx.userId } } },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return updateTaskStatus(input.taskId, input.status);
    }),

  merge: protectedProcedure
    .input(
      z.object({
        primaryTaskId: z.string(),
        secondaryTaskId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await prisma.task.findFirst({
        where: {
          id: input.primaryTaskId,
          featureRequest: {
            project: {
              workspace: { members: { some: { userId: ctx.userId } } },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      try {
        await mergeTasks(input.primaryTaskId, input.secondaryTaskId);
        return { ok: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Merge failed",
        });
      }
    }),

  split: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        parts: z
          .array(
            z.object({
              title: z.string().min(1).max(300),
              description: z.string().optional(),
            }),
          )
          .min(2)
          .max(8),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await prisma.task.findFirst({
        where: {
          id: input.taskId,
          featureRequest: {
            project: {
              workspace: { members: { some: { userId: ctx.userId } } },
            },
          },
        },
      });

      if (!task) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      try {
        await splitTask(input.taskId, input.parts);
        return { ok: true };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Split failed",
        });
      }
    }),
});
