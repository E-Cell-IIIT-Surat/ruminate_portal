import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { superAdminEmails } from "@/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const participant = await db.role.findUnique({ where: { name: "PARTICIPANT" } });
      if (participant) {
        await db.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: participant.id } },
          create: { userId: user.id, roleId: participant.id },
          update: {},
        });
      }
      if (superAdminEmails().has(user.email.toLowerCase())) {
        const admin = await db.role.findUnique({ where: { name: "SUPER_ADMIN" } });
        if (admin) {
          await db.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: admin.id } },
            create: { userId: user.id, roleId: admin.id },
            update: {},
          });
        }
      }
    },
  },
  trustHost: true,
});

declare module "next-auth" {
  interface Session {
    user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  }
}
