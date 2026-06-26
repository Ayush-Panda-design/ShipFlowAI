import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { serverRouter } from "@repo/trpc/server";

import { isSameOriginRequest, sameOriginForbiddenResponse } from "@/lib/same-origin";
import { createWebTrpcContext } from "@/trpc/context";

/** Strip any cross-origin CORS headers — browser clients must use same-origin /api/trpc only. */
function withSameOriginOnlyHeaders(response: Response) {
  const headers = new Headers(response.headers);
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Credentials");
  headers.delete("Access-Control-Allow-Headers");
  headers.delete("Access-Control-Allow-Methods");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    if (!isSameOriginRequest(req)) {
      return sameOriginForbiddenResponse();
    }

    return new Response(null, { status: 204, headers: { Vary: "Origin" } });
  }

  if (!isSameOriginRequest(req)) {
    return sameOriginForbiddenResponse();
  }

  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: serverRouter,
    createContext: createWebTrpcContext,
  });

  return withSameOriginOnlyHeaders(response);
}

export { handler as GET, handler as POST, handler as OPTIONS };
