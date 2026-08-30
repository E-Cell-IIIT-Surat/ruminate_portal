// "use client";

// import { ShieldCheck, Sparkles } from "lucide-react";
// import { signIn } from "next-auth/react";
// import { useRouter } from "next/navigation";
// import { useState } from "react";
// import { Brand } from "@/components/brand";
// import { SparkField } from "@/components/spark-field";
// import { startGoogleOAuth } from "@/lib/client-auth";

// export default function SignInPage() {
//   const router = useRouter();
//   const [isLogin, setIsLogin] = useState(true);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(() => {
//     if (typeof window === "undefined") return "";
//     const searchParams = new URLSearchParams(window.location.search);
//     if (searchParams.get("reason") === "session") return "Your session is no longer valid. Please sign in again.";
//     const oauthError = searchParams.get("error");
//     if (!oauthError) return "";
//     return oauthError === "Configuration"
//       ? "Google OAuth is not configured for this URL. Add https://portal.ecelliiitsurat.in/api/auth/callback/google to the Google OAuth client, then restart the server."
//       : `Google sign-in failed (${oauthError}). Please try again.`;
//   });
//   const [formData, setFormData] = useState({ name: "", email: "", password: "" });
//   const handleChange = (event: React.ChangeEvent<HTMLInputElement>) =>
//     setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

//   async function handleGoogleSignIn() {
//     setIsLoading(true);
//     setError("");
//     try {
//       await startGoogleOAuth("/dashboard");
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : "Google sign-in could not be started. Please try again.");
//       setIsLoading(false);
//     }
//   }

//   async function handleManualAuth(event: React.FormEvent<HTMLFormElement>) {
//     event.preventDefault();
//     setIsLoading(true);
//     setError("");
//     try {
//       if (!isLogin) {
//         const response = await fetch("/api/auth/signup", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(formData),
//         });
//         const result = (await response.json().catch(() => ({}))) as { error?: string };
//         if (!response.ok) throw new Error(result.error || "Unable to create your account.");
//       }
//       const result = await signIn("credentials", {
//         redirect: false,
//         email: formData.email,
//         password: formData.password,
//       });
//       if (result?.error) {
//         throw new Error(
//           result.error.includes("No password found")
//             ? "This account uses Google sign-in. Continue with Google above."
//             : "Invalid email or password.",
//         );
//       }
//       router.push("/dashboard");
//       router.refresh();
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : "An unexpected error occurred.");
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   return (
//     <main className="auth-screen auth-screen-branded">
//       <SparkField />
//       <div className="auth-layout">
//         <section className="auth-story">
//           <Brand />
//           <span className="kicker">
//             <Sparkles size={15} /> Ruminate operations platform
//           </span>
//           <h1>{isLogin ? "Ideas move forward when the process does." : "Your next chapter starts with one spark."}</h1>
//           <p className="auth-quote">“The future belongs to those who believe in the beauty of their dreams.”</p>
//           <p>One secure home for SSIP, UdbhAV, workshops, applications, reviews, and outcomes at E-Cell IIIT Surat.</p>
//           <div className="auth-trust">
//             <ShieldCheck size={18} /> Private by design · structured by purpose
//           </div>
//         </section>
//         <section className="auth-card auth-card-form">
//           <div className="auth-card-brand">
//             <Brand compact />
//           </div>
//           <span className="auth-icon">
//             <ShieldCheck size={24} />
//           </span>
//           <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
//           <p>
//             {isLogin
//               ? "Sign in to continue your Ruminate journey."
//               : "Join the workspace and turn your idea into momentum."}
//           </p>
//           {error && (
//             <div className="auth-error" role="alert">
//               {error}
//             </div>
//           )}
//           <button
//             className="button button-google"
//             onClick={handleGoogleSignIn}
//             disabled={isLoading}
//             type="button"
//             aria-busy={isLoading}
//           >
//             <span className="google-g" aria-hidden="true">
//               G
//             </span>{" "}
//             {isLoading ? "Connecting to Google…" : "Continue with Google"}
//           </button>
//           <div className="auth-divider">
//             <span>or continue with email</span>
//           </div>
//           <form onSubmit={handleManualAuth} className="auth-form">
//             {!isLogin && (
//               <label>
//                 Full name
//                 <input
//                   name="name"
//                   required
//                   disabled={isLoading}
//                   placeholder="Your name"
//                   value={formData.name}
//                   onChange={handleChange}
//                 />
//               </label>
//             )}
//             <label>
//               Email address
//               <input
//                 name="email"
//                 type="email"
//                 required
//                 disabled={isLoading}
//                 placeholder="you@example.com"
//                 value={formData.email}
//                 onChange={handleChange}
//               />
//             </label>
//             <label>
//               Password
//               <input
//                 name="password"
//                 type="password"
//                 required
//                 minLength={8}
//                 disabled={isLoading}
//                 placeholder="At least 8 characters"
//                 value={formData.password}
//                 onChange={handleChange}
//               />
//             </label>
//             <button className="button button-primary" type="submit" disabled={isLoading}>
//               {isLoading ? "Processing…" : isLogin ? "Sign in" : "Create account"}
//             </button>
//           </form>
//           <p className="auth-toggle">
//             {isLogin ? "New to Ruminate?" : "Already have an account?"}{" "}
//             <button
//               type="button"
//               onClick={() => {
//                 setIsLogin((value) => !value);
//                 setError("");
//               }}
//             >
//               {isLogin ? "Create an account" : "Sign in instead"}
//             </button>
//           </p>
//         </section>
//       </div>
//     </main>
//   );
// }

"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { Brand } from "@/components/brand";
import { SparkField } from "@/components/spark-field";
import { startGoogleOAuth } from "@/lib/client-auth";

export default function SignInPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  // Read OAuth/session error query params on the client only, after mount,
  // so the server-rendered HTML and the first client render match exactly.
  // Reading window.location.search inside a useState initializer causes a
  // hydration mismatch (React error #418) because the server has no window.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("reason") === "session") {
        setError("Your session is no longer valid. Please sign in again.");
        return;
      }
      const oauthError = searchParams.get("error");
      if (!oauthError) return;
      setError(
        oauthError === "Configuration"
          ? `Google OAuth is not configured for this URL. Add ${window.location.origin}/api/auth/callback/google to the Google OAuth client, then redeploy.`
          : `Google sign-in failed (${oauthError}). Please try again.`,
      );
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));

  function callbackUrl() {
    const value = new URLSearchParams(window.location.search).get("callbackUrl");
    return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }

  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError("");
    try {
      await startGoogleOAuth(callbackUrl());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in could not be started. Please try again.");
      setIsLoading(false);
    }
  }

  async function handleManualAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      if (!isLogin) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(result.error || "Unable to create your account.");
      }
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (result?.error) {
        throw new Error(
          result.error.includes("No password found")
            ? "This account uses Google sign-in. Continue with Google above."
            : "Invalid email or password.",
        );
      }
      router.push(callbackUrl());
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-screen auth-screen-branded">
      <SparkField />
      <div className="auth-back">
        <BackButton />
      </div>
      <div className="auth-layout">
        <section className="auth-story">
          <Brand />
          <span className="kicker">
            <Sparkles size={15} /> Ruminate operations platform
          </span>
          <h1>{isLogin ? "Ideas move forward when the process does." : "Your next chapter starts with one spark."}</h1>
          <p className="auth-quote">
            &quot;The future belongs to those who believe in the beauty of their dreams.&quot;
          </p>
          <p>One secure home for SSIP, UDHBHAV, workshops, applications, reviews, and outcomes at E-Cell IIIT Surat.</p>
          <div className="auth-trust">
            <ShieldCheck size={18} /> Private by design · structured by purpose
          </div>
        </section>
        <section className="auth-card auth-card-form">
          <div className="auth-card-brand">
            <Brand compact />
          </div>
          <span className="auth-icon">
            <ShieldCheck size={24} />
          </span>
          <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p>
            {isLogin
              ? "Sign in to continue your Ruminate journey."
              : "Join the workspace and turn your idea into momentum."}
          </p>
          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}
          <button
            className="button button-google"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            type="button"
            aria-busy={isLoading}
          >
            <span className="google-g" aria-hidden="true">
              G
            </span>{" "}
            {isLoading ? "Connecting to Google…" : "Continue with Google"}
          </button>
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>
          <form onSubmit={handleManualAuth} className="auth-form">
            {!isLogin && (
              <label>
                Full name
                <input
                  name="name"
                  required
                  disabled={isLoading}
                  placeholder="Your name"
                  value={formData.name}
                  onChange={handleChange}
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                disabled={isLoading}
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={8}
                disabled={isLoading}
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={handleChange}
              />
            </label>
            <button className="button button-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Processing…" : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>
          {!isLogin && (
            <p className="auth-legal">
              By creating an account, you agree to our <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </p>
          )}
          <p className="auth-toggle">
            {isLogin ? "New to Ruminate?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setIsLogin((value) => !value);
                setError("");
              }}
            >
              {isLogin ? "Create an account" : "Sign in instead"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}
