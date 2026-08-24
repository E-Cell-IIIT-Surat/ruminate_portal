"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the boundary quiet in production while preserving a useful local trace.
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);
  return (
    <main className="route-state route-state-error">
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
