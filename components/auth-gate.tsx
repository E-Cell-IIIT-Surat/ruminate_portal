import { LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import Link from "next/link";

export function AuthGate({
  title = "Sign in to continue",
  body = "Use your Google account to securely access your Ruminate workspace.",
}: {
  title?: string;
  body?: string;
}) {
  const setupRequired = title.toLowerCase().includes("setup required");
  return (
    <main className="auth-screen">
      <div className="auth-card">
        <Brand />
        <span className="auth-icon">
          <LockKeyhole />
        </span>
        <h1>{title}</h1>
        <p>{body}</p>
        {setupRequired ? (
          <Link className="button button-secondary" href="/">
            Back to homepage
          </Link>
        ) : (
          <GoogleSignInButton />
        )}
        <small>
          {setupRequired
            ? "The interface is available, but protected actions stay disabled until configuration is complete."
            : "Access is protected and scoped to your assigned role."}
        </small>
        {!setupRequired && (
          <Link className="auth-gate-manual-link" href="/signin">
            Use email/password or another account
          </Link>
        )}
      </div>
    </main>
  );
}
