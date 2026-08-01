import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// clerkMiddleware() throws without a publishable key, which would turn every
// route into a 500 before Clerk is configured. Falling through keeps the app
// usable in the local dev-auth mode; see lib/auth-mode.ts.
const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim());

export default hasClerk ? clerkMiddleware() : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
