import NextAuth, { type NextAuthConfig } from "next-auth";
import { customFetch } from "@auth/core";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { RoleName } from "@prisma/client";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { ensureUserRoles } from "@/lib/services/bootstrap";
import { compare } from "bcrypt-ts";
import { superAdminEmails } from "@/lib/env";

// Explicitly read environment variables for the server runtime
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authSecret = process.env.AUTH_SECRET?.trim();
const isProduction = process.env.NODE_ENV === "production";

const googleFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const endpoint = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const started = Date.now();

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (process.env.AUTH_DEBUG === "true") {
      console.log("[auth][google] response", { endpoint, status: response.status, ms: Date.now() - started });
    }
    return response;
  } catch (error) {
    console.error("[auth][google] request failed", {
      endpoint,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

if (isProduction && (!googleClientId || !googleClientSecret)) {
  throw new Error("Production authentication configuration is missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET.");
}
if (isProduction && !authSecret) {
  throw new Error("Production authentication configuration is missing AUTH_SECRET.");
}

const rolePriority: RoleName[] = [
  "SUPER_ADMIN",
  "PROGRAM_MANAGER",
  "REVIEWER",
  "FACULTY_REVIEWER",
  "CONTENT_MANAGER",
  "PARTICIPANT",
];

async function getPrimaryRole(userId: string): Promise<RoleName> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user?.email && superAdminEmails().has(user.email.toLowerCase())) return "SUPER_ADMIN";
  const assignments = await db.userRole.findMany({
    where: { userId },
    select: { role: { select: { name: true } } },
  });
  const assigned = new Set(assignments.map(({ role }) => role.name));
  return rolePriority.find((role) => assigned.has(role)) ?? "PARTICIPANT";
}

export const authConfig = {
  basePath: "/api/auth",
  debug: process.env.AUTH_DEBUG === "true",
  secret: authSecret ?? "ruminate-local-development-secret-not-for-production",
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: googleClientId ?? "",
      clientSecret: googleClientSecret ?? "",
      // Keep the authorization endpoint explicit. This avoids an extra OIDC
      // discovery request while token/userinfo requests still use Google's
      // standard OAuth endpoints during the callback.
      authorization: {
        url: "https://accounts.google.com/o/oauth2/v2/auth",
        params: { scope: "openid email profile" },
      },
      token: "https://oauth2.googleapis.com/token",
      userinfo: "https://openidconnect.googleapis.com/v1/userinfo",
      checks: ["state"],
      [customFetch]: googleFetch,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          throw new Error("No password found for this account. Try signing in with Google.");
        }

        const isPasswordValid = await compare(credentials.password as string, user.passwordHash);

        if (!isPasswordValid) throw new Error("Invalid credentials");

        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ user }) {
      // During an OAuth sign-in, `user.id` can still be the provider profile
      // id because Auth.js has not created the local User row yet. Check an
      // existing account by email and leave role assignment to the Auth.js
      // createUser/signIn events, which receive the real database user id.
      if (user.email) {
        const account = await db.user.findUnique({
          where: { email: user.email },
          select: { id: true, archivedAt: true },
        });

        if (account?.archivedAt) {
          console.warn("auth.signin.denied", { userId: account.id, reason: "account_disabled" });
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = await getPrimaryRole(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as RoleName | undefined) ?? "PARTICIPANT";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await ensureUserRoles(user);
    },
    async signIn({ user }) {
      await ensureUserRoles(user);
    },
  },
  // Vercel terminates TLS in front of the Node runtime. Auth.js must trust the
  // forwarded host when constructing OAuth callback URLs.
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleName;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
