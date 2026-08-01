"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Sends an already-authenticated visitor away from an auth page instead of
 * showing the sign-in/sign-up form.
 *
 * Without this, someone with an active session who lands on /sign-in (e.g.
 * because a previous sign-up's post-auth redirect target didn't exist) sees
 * the form, submits it, and gets Clerk's "you're already signed in" error --
 * a dead end that looks like a bug rather than what it is, an already-
 * successful session.
 *
 * Renders nothing while Clerk is resolving the session or a redirect is about
 * to fire, so the form never flashes on screen only to disappear.
 */
export function RedirectIfSignedIn({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace(searchParams.get("redirect_url") || "/dashboard");
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  if (!isLoaded || isSignedIn) return null;
  return <>{children}</>;
}
