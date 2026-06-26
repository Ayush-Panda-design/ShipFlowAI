import { headers } from "next/headers";

import { getServerSession } from "@/lib/auth-session";

export async function createWebTrpcContext() {
  const session = await getServerSession();

  return { userId: session?.user?.id ?? null };
}
