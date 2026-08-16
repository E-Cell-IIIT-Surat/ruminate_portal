import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { ensureUserRoles } from "@/lib/services/bootstrap";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV !== "production" ? "ruminate-local-development-secret-not-for-production" : undefined),
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/signin", error: "/signin" },
  callbacks: {
    async signIn({ user }) {
      if (!user.id) return true;
      const account = await db.user.findUnique({ where: { id: user.id }, select: { archivedAt: true } });
      if (account?.archivedAt) {
        console.warn("auth.signin.denied", { userId: user.id, reason: "account_disabled" });
        return false;
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
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
  trustHost: process.env.AUTH_TRUST_HOST === "true" || process.env.NODE_ENV !== "production",
});

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}
