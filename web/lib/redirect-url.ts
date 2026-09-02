/**
 * Carries the middleware's `redirect_url` from one auth screen to the next.
 *
 * auth.protect() sends a signed-out visitor to /sign-in?redirect_url=<where
 * they were going>. When that visitor crosses to /sign-up (or back), the
 * destination has to cross with them: an invitation link is the common case,
 * and losing it lands a newly registered lawyer on "create your firm" for a
 * firm they were invited to join.
 *
 * Only same-origin paths are forwarded. A redirect_url that names another
 * host is dropped rather than propagated, so this cannot be turned into an
 * open redirect by editing the query string.
 */
export function withRedirect(path: string, redirectUrl: string | null): string {
  if (!redirectUrl || !redirectUrl.startsWith("/") || redirectUrl.startsWith("//")) {
    return path;
  }
  return `${path}?redirect_url=${encodeURIComponent(redirectUrl)}`;
}
