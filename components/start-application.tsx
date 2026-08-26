"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";

export function StartApplication({ programId }: { programId: string }) {
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`/api/programs/${programId}/applications`, { method: "POST" })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!active) return;
        if (!response.ok) {
          setError(result.error ?? "Unable to start application");
          return;
        }
        // A hard navigation guarantees the new application data is fetched
        // after the POST succeeds.
        window.location.replace(`/applications/${result.application.id}`);
      })
      .catch(() => active && setError("Unable to reach the server"));
    return () => {
      active = false;
    };
  }, [programId]);
  return (
    <main className="auth-screen">
      <div className="auth-back">
        <BackButton fallback="/programs" />
      </div>
      <div className="auth-card">
        <span className="auth-icon spinning">
          <LoaderCircle />
        </span>
        <h1>{error ? "Could not start application" : "Preparing your application"}</h1>
        <p>{error || "Creating a secure draft with the program's current form version…"}</p>
        {error && (
          <Link className="button button-secondary" href="/programs">
            Back to programs
          </Link>
        )}
      </div>
    </main>
  );
}
