"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import Link from "next/link";

export function StartApplication({ programId }: { programId: string }) {
  const router = useRouter();
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
        router.replace(`/applications/${result.application.id}`);
      })
      .catch(() => active && setError("Unable to reach the server"));
    return () => {
      active = false;
    };
  }, [programId, router]);
  return (
    <main className="auth-screen">
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
