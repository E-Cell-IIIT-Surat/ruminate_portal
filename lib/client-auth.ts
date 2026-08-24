/**
 * Starts an Auth.js OAuth flow from the browser.
 *
 * Vinext's Worker runtime does not always preserve the redirect response used
 * by `next-auth/react`'s `signIn` helper. Calling the same Auth.js endpoints
 * explicitly keeps the CSRF cookie, asks for the JSON redirect response, and
 * then performs the browser navigation ourselves.
 */
export async function startGoogleOAuth(callbackUrl = "/dashboard") {
  const providersResponse = await fetch("/api/auth/providers", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const providers = (await providersResponse.json().catch(() => null)) as Record<string, unknown> | null;

  if (!providersResponse.ok || !providers?.google) {
    throw new Error("Google sign-in is not configured on this server.");
  }

  const csrfResponse = await fetch("/api/auth/csrf", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const csrf = (await csrfResponse.json().catch(() => null)) as { csrfToken?: string } | null;
  if (!csrfResponse.ok || !csrf?.csrfToken) {
    throw new Error("The secure sign-in session could not be created. Refresh the page and try again.");
  }

  const response = await fetch("/api/auth/signin/google", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Auth-Return-Redirect": "1",
    },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, callbackUrl }).toString(),
  });

  const result = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!response.ok || !result?.url) {
    throw new Error(
      result?.error
        ? `Google sign-in could not start (${result.error}).`
        : "Google sign-in could not start. Check the OAuth redirect URL and try again.",
    );
  }

  window.location.assign(result.url);
}
