import { Brand } from "@/components/brand";
import {
  Bell,
  Blocks,
  ClipboardList,
  FileCheck2,
  Gauge,
  Megaphone,
  Settings,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

const navSets = {
  participant: [
    ["Dashboard", "/dashboard", Gauge],
    ["Programs", "/programs", Blocks],
    ["Applications", "/applications", ClipboardList],
    ["Teams", "/teams", UsersRound],
    ["Notifications", "/notifications", Bell],
    ["Profile", "/profile", Settings],
  ],
  admin: [
    ["Dashboard", "/admin", Gauge],
    ["Programs", "/admin/programs", Blocks],
    ["Applications", "/admin/applications", ClipboardList],
    ["Reviews", "/admin/reviews", FileCheck2],
    ["Participants", "/admin/participants", UsersRound],
    ["Announcements", "/admin/announcements", Megaphone],
    ["Users & Roles", "/admin/users", ShieldCheck],
    ["Settings", "/admin/settings", Settings],
  ],
  reviewer: [
    ["Dashboard", "/reviewer", Gauge],
    ["Pending reviews", "/reviewer?view=pending", FileCheck2],
    ["Completed reviews", "/reviewer?view=completed", ClipboardList],
  ],
} as const;

export function PortalShell({
  mode,
  title,
  user,
  children,
}: {
  mode: keyof typeof navSets;
  title: string;
  user?: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <Brand />
        <nav aria-label={`${title} navigation`}>
          {navSets[mode].map(([label, href, Icon]) => (
            <Link key={label} href={href}>
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>{(user?.name ?? user?.email ?? "R").slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{user?.name ?? "Ruminate member"}</strong>
            <small>{user?.email ?? title}</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="portal-topbar">
          <Brand compact />
          <span>{title}</span>
          <Link href="/api/auth/signout">Sign out</Link>
        </header>
        <div className="portal-content">{children}</div>
      </main>
    </div>
  );
}
