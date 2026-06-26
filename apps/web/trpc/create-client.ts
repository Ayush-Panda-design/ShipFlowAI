import { httpLink } from "@repo/trpc/client";

function getTrpcUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Default: same-origin handler at /api/trpc (no cross-origin CORS).
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/trpc`;
  }

  return "http://localhost:3000/api/trpc";
}

export const createTRPCHttpBatchClientClient = () => {
  return httpLink({
    url: getTrpcUrl(),
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
      });
    },
  });
};
