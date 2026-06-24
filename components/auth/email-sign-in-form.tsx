"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signInWithEmail } from "@/lib/actions/auth";
import { resolveCallbackUrl } from "@/lib/auth-proxy";

function EmailSignInFormContent() {
  const searchParams = useSearchParams();
  const callbackUrl = resolveCallbackUrl(searchParams.get("callbackUrl"));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    setError(null);

    startTransition(async () => {
      try {
        await signInWithEmail(
          String(formData.get("email") ?? ""),
          String(formData.get("password") ?? ""),
          callbackUrl
        );
      } catch {
        setError("Invalid email or password.");
      }
    });
  };

  return (
    <form action={handleSubmit} className="w-full">
      <FieldSet>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Signing in..." : "Sign in with email"}
          </Button>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}

export function EmailSignInForm() {
  return (
    <Suspense fallback={<div className="h-40 w-full animate-pulse rounded-2xl bg-muted" />}>
      <EmailSignInFormContent />
    </Suspense>
  );
}
