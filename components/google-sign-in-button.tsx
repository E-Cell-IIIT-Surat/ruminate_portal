"use client";

import { useState } from "react";
import { startGoogleOAuth } from "@/lib/client-auth";

export function GoogleSignInButton({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function startSignIn() {
    setBusy(true);
    setError("");
    try {
      await startGoogleOAuth(callbackUrl);
    } catch (err: unknown) {
      setBusy(false);
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in could not be started. Check the OAuth redirect URL and try again.",
      );
    }
  }

  return (
    <div>
      <button className="button button-primary" type="button" onClick={startSignIn} disabled={busy} aria-busy={busy}>
        <span className="google-g" aria-hidden="true">
          G
        </span>
        {busy ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {error && (
        <small className="auth-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
