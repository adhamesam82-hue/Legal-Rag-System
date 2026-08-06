import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

export default hasClerk
  ? clerkMiddleware(async (auth, request) => {
      if (!isPublicRoute(request)) {
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
