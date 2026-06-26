import type { NextRequest } from "next/server";

import { handleAppProxy } from "@/lib/api-proxy";

export function proxy(request: NextRequest) {
  return handleAppProxy(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/trpc/:path*"],
};
