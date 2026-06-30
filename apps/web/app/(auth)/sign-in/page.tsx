import Link from "next/link";

import { EmailSignInForm } from "@/components/auth/email-sign-in-form";
import { GithubSignInForm } from "@/components/auth/github-sign-in-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { redirectIfAuthenticated } from "@/lib/auth-session";
import { resolveCallbackUrl } from "@/lib/auth-proxy";
import { getOAuthErrorMessage } from "@/lib/auth-oauth-errors";

type SignInPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    error_description?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl, error, error_description } = await searchParams;
  const safeCallbackUrl = resolveCallbackUrl(callbackUrl);
  const oauthError = getOAuthErrorMessage(error, error_description);

  await redirectIfAuthenticated(safeCallbackUrl);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle>Sign in</CardTitle>
        <CardDescription className="text-left sm:text-center">
          <span className="block">
            <strong>GitHub</strong> — full access: repos, pull requests, and AI reviews.
          </span>
          <span className="mt-2 block text-muted-foreground">
            <strong>Email</strong> — planning only: features, requirements, tasks, and approvals.
            Connect GitHub later from the dashboard Get started guide.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {oauthError ? (
          <div
            className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            <p>{oauthError}</p>
            <p className="text-xs text-destructive/80">
              Using a different GitHub account? Sign out at github.com first, or
              use a private/incognito window so GitHub does not reuse your other
              login.
            </p>
          </div>
        ) : null}
        <GithubSignInForm />
        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">or</span>
          <Separator className="flex-1" />
        </div>
        <EmailSignInForm />
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/sign-up" className="underline-offset-4 hover:underline">
            Sign up
          </Link>
          {" · "}
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
