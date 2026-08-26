"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { BackButton } from "@/components/back-button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string; status?: number };
  reset: () => void;
}) {
  useEffect(() => {
    // Always log the digest and stack so Vercel Runtime Logs can be correlated
    // with the generic production error screen shown to users.
    console.error("[Ruminate route error]", {
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status,
      digest: error.digest,
      stack: error.stack,
    });

    // A database reset/migration can invalidate an otherwise valid JWT. Do not
    // strand the user on a runtime-error screen in that expected case; send
    // them through the full sign-in page so they can use Google or credentials.
    if (error.code === "UNAUTHORIZED" || error.status === 401 || error.message === "Authentication required") {
      window.location.replace("/signin?reason=session");
    }
  }, [error]);
  return (
    <main className="route-state route-state-error">
      <div className="auth-back">
        <BackButton />
      </div>
      <div className="route-state-icon">
        <AlertTriangle size={25} />
      </div>
      <p className="eyebrow">Temporary interruption</p>
      <h1>That page needs another moment.</h1>
      <p>Something did not load correctly. Try again, or return to your workspace.</p>
      <div className="route-state-actions">
        <button className="button button-primary" onClick={() => reset()}>
          <RotateCcw size={16} /> Try again
        </button>
        <Link href="/dashboard" className="button button-secondary">
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}
