/**
 * Whether this build talks to Clerk, or runs in the local dev-auth mode.
 *
 * Clerk is the real auth path. Dev mode exists so the app boots before Clerk
 * is configured: ClerkProvider throws without a publishable key, which would
 * otherwise make every page a blank error screen.
 *
 * Mirrors LEGALOS_DEV_AUTH on the API. Both sides must be set for the app to
 * work in this mode -- the API is what actually decides who the caller is.
 *
 * ## Why the key is not simply read from process.env here
 *
 * It used to be, and the failure was invisible from the server's side. Next
 * inlines `process.env.NEXT_PUBLIC_*` into the client bundle **at build time**.
 * The image is built once in CI with no Clerk key -- deliberately, so the same
 * artefact can be promoted from staging to production, where the two Clerk
 * instances differ -- so in the browser this constant was always null while on
 * the server it held the real key from the container's environment.
 *
 * The two halves then disagreed. Server-rendered HTML mounted ClerkProvider and
 * shipped Clerk's script, so sign-in looked like it worked; the hydrated client
 * had USING_CLERK false, so AuthTokenBridge never mounted, api.ts kept its
 * default token getter that returns null, and every API call went out with no
 * Authorization header. Observed on staging as a blanket 403 behind
 * "تعذّر تحميل هذه البيانات" on every data screen.
 *
 * So the key arrives as a prop from the server-rendered layout, which reads the
 * environment at request time, and is published here for the client components
 * that need to branch on it. Same image, either Clerk instance, no rebuild.
 */
export const DEV_AUTH_USER =
  process.env.NEXT_PUBLIC_LEGALOS_DEV_AUTH?.trim() || null;

/**
 * Read at request time on the server; on the client it is whatever the layout
 * passed down, set during Providers' render before any child reads it.
 */
let clerkPublishableKey: string | null =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null;

/** Called from Providers with the value the server read at request time. */
export function setClerkPublishableKey(key: string | null | undefined) {
  const trimmed = key?.trim();
  if (trimmed) {
    clerkPublishableKey = trimmed;
  }
}

export function getClerkPublishableKey(): string | null {
  return clerkPublishableKey;
}

/** True when Clerk should be mounted. Clerk wins if both are configured. */
export function usingClerk(): boolean {
  return Boolean(clerkPublishableKey);
}

/** True when the app is running without real authentication. */
export function usingDevAuth(): boolean {
  return !usingClerk() && Boolean(DEV_AUTH_USER);
}
