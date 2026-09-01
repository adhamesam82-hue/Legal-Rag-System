import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isPathEnabled } from "@/lib/features";

// clerkMiddleware() throws without a publishable key, which would turn every
// route into a 500 before Clerk is configured. Falling through keeps the app
// usable in the local dev-auth mode; see lib/auth-mode.ts.
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

// Everything except these needs a session. clerkMiddleware() on its own only
// makes auth *available* -- without an explicit protect(), a signed-out visitor
// reaches the app shell and sees API 403s instead of the sign-in screen.
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  // Invitation links are opened by people who have no session yet, by design.
  "/invite(.*)",
  // The marketing page is the origin's front door: it has to answer a visitor
  // who has never signed in. Without these two the root rewrites straight to
  // /_not-found and the public face of the product is a 404.
  "/",
  "/ar",
  "/landing(.*)",
]);

// A gated screen must not be reachable by typing its URL. Hiding it from the
// nav is a presentation choice; this is the one that actually holds -- and it
// runs before auth, so a signed-out visitor to a hidden route gets the same
// 404 as a signed-in one rather than a sign-in page that leads nowhere.
// See lib/features.ts.
function notFoundIfDisabled(request: NextRequest) {
  return isPathEnabled(request.nextUrl.pathname)
    ? null
    : NextResponse.rewrite(new URL("/_not-found", request.url));
}

export default hasClerk
  ? clerkMiddleware(
      async (auth, request) => {
        const gated = notFoundIfDisabled(request);
        if (gated) return gated;
        if (!isPublicRoute(request)) {
          await auth.protect();
        }
      },
      // Where auth.protect() sends a signed-out visitor. Passing it here, and
      // not only to ClerkProvider, because the redirect is decided in this
      // middleware -- the provider's props never reach it.
      //
      // Left to its defaults, Clerk resolves the destination from
      // NEXT_PUBLIC_CLERK_SIGN_IN_URL, which is inlined at build time and is
      // absent from an image built once for both environments. What remained
      // was the hosted Account Portal on accounts.<domain>: a second origin,
      // provisioned outside this repository, which on 1 September 2026 did not
      // resolve at all -- so /dashboard sent visitors nowhere. Where it could
      // not resolve a destination, the same call answered 404 instead, which
      // reads as a missing page rather than a missing session.
      { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
    )
  : (request: NextRequest) => notFoundIfDisabled(request) ?? NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
