import { InsufficientCreditsError } from "@repo/services";
import { TRPCError } from "@trpc/server";

export function throwTrpcCreditError(error: unknown): never {
  if (error instanceof InsufficientCreditsError) {
    throw new TRPCError({ code: "FORBIDDEN", message: error.message });
  }

  if (error instanceof Error && error.message.toLowerCase().includes("workspace")) {
    throw new TRPCError({ code: "NOT_FOUND", message: error.message });
  }

  throw error;
}
