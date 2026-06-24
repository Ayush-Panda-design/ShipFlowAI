import { NextRequest, NextResponse } from "next/server";

export const SIGN_IN_PATH = "/sign-in";
export const DEFAULT_POST_AUTH_PATH = "/dashboard";

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
] as const;

const PUBLIC_PATH_PREFIXES = ["/sign-in", "/api/auth"] as const;

const DEFAULT_PROTECTED_PREFIXES = ["/dashboard"] as const;

export function resolveCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = DEFAULT_POST_AUTH_PATH
) {
  if (!callbackUrl) {
    return fallback;
  }

  if (!callbackUrl.startsWith("/") || callbackUrl.startsWith("//")) {
    return fallback;
  }

  if (callbackUrl.startsWith(SIGN_IN_PATH)) {
    return fallback;
  }

  return callbackUrl;
}

export function hasSessionCookie(request: NextRequest) {
  return SESSION_COOKIE_NAMES.some((name) => request.cookies.has(name));
}

export function buildSignInUrl(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const callbackPath = `${pathname}${request.nextUrl.search}`;
  const signInUrl = new URL(SIGN_IN_PATH, request.url);

  if (callbackPath && callbackPath !== "/" && !callbackPath.startsWith(SIGN_IN_PATH)) {
    signInUrl.searchParams.set("callbackUrl", callbackPath);
  }

  return signInUrl;
}

export function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isProtectedPath(
  pathname: string,
  protectedPrefixes: readonly string[] = DEFAULT_PROTECTED_PREFIXES
) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function handleAuthProxy(
  request: NextRequest,
  options?: { protectedPrefixes?: readonly string[] }
) {
  const { pathname } = request.nextUrl;
  const protectedPrefixes =
    options?.protectedPrefixes ?? DEFAULT_PROTECTED_PREFIXES;

  if (isPublicPath(pathname) || !isProtectedPath(pathname, protectedPrefixes)) {
    return NextResponse.next();
  }

  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(buildSignInUrl(request));
}
