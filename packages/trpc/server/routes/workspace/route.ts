import { z } from "zod";
import {
  createWorkspace,
  ensureDefaultWorkspace,
  getWorkspaceForUser,
  inviteWorkspaceMember,
  listActivityEvents,
  listWorkspaceInvites,
  listWorkspaceMembers,
  listWorkspacesForUser,
} from "@repo/services";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../../trpc";

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return listWorkspacesForUser(ctx.userId);
  }),

  ensureDefault: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ensureDefaultWorkspace(ctx.userId, input.name);
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      return createWorkspace(ctx.userId, input.name);
    }),

  get: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceForUser(input.workspaceId, ctx.userId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      return workspace;
    }),

  listActivity: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceForUser(input.workspaceId, ctx.userId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }
      const events = await listActivityEvents(input.workspaceId);
      return events.map((event) => {
        let pullRequestId: string | null = null;
        if (event.metadata) {
          try {
            const parsed = JSON.parse(event.metadata) as {
              pullRequestId?: string;
            };
            pullRequestId = parsed.pullRequestId ?? null;
          } catch {
            pullRequestId = null;
          }
        }

        return {
          ...event,
          createdAt: event.createdAt.toISOString(),
          pullRequestId,
        };
      });
    }),

  listMembers: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceForUser(input.workspaceId, ctx.userId);
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const members = await listWorkspaceMembers(input.workspaceId);
      return members.map((member) => ({
        id: member.id,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt.toISOString(),
      }));
    }),

  listInvites: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceForUser(input.workspaceId, ctx.userId);
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const invites = await listWorkspaceInvites(input.workspaceId);
      return invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      }));
    }),

  inviteMember: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        email: z.string().email(),
        role: z.enum(["member", "owner"]).default("member"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceForUser(input.workspaceId, ctx.userId);
      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const baseUrl =
        process.env.BETTER_AUTH_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim() ||
        "http://localhost:3000";

      return inviteWorkspaceMember({
        workspaceId: input.workspaceId,
        invitedById: ctx.userId,
        email: input.email,
        role: input.role,
        appBaseUrl: baseUrl,
      });
    }),
});
