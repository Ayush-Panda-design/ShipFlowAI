import type { NextRequest } from "next/server";

import { handleAuthProxy } from "@/lib/auth-proxy";

export function proxy(request: NextRequest) {
  return handleAuthProxy(request);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
