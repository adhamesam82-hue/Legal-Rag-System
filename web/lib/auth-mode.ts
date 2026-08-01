/**
 * Whether this build talks to Clerk, or runs in the local dev-auth mode.
 *
 * Clerk is the real auth path. Dev mode exists so the app boots before Clerk
 * is configured: ClerkProvider throws without a publishable key, which would
 * otherwise make every page a blank error screen.
 *
 * Mirrors LEGALOS_DEV_AUTH on the API. Both sides must be set for the app to
 * work in this mode -- the API is what actually decides who the caller is.
 */
export const DEV_AUTH_USER =
  process.env.NEXT_PUBLIC_LEGALOS_DEV_AUTH?.trim() || null;

export const CLERK_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null;

/** True when Clerk should be mounted. Clerk wins if both are configured. */
export const USING_CLERK = Boolean(CLERK_PUBLISHABLE_KEY);

/** True when the app is running without real authentication. */
export const USING_DEV_AUTH = !USING_CLERK && Boolean(DEV_AUTH_USER);
