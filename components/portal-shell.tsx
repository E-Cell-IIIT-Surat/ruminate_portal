import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { PortalNav } from "@/components/portal-nav";
import { AnnouncementPopover } from "@/components/announcement-popover";
import { db } from "@/lib/db";

const navSets = {
  participant: [
    ["Dashboard", "/dashboard", "Gauge"],
    ["Programs", "/programs", "Blocks"],
    ["Applications", "/applications", "ClipboardList"],
    ["Teams", "/teams", "UsersRound"],
    ["Notifications", "/notifications", "Bell"],
    ["Profile", "/profile", "Settings"],
  ],
  admin: [
    ["Dashboard", "/admin", "Gauge"],
    ["Programs", "/admin/programs", "Blocks"],
    ["Applications", "/admin/applications", "ClipboardList"],
    ["Workshops", "/admin/workshops", "BookOpenCheck"],
    ["Workshop bookings", "/admin/workshops/bookings", "ClipboardList"],
    ["Reviews", "/admin/reviews", "FileCheck2"],
    ["Participants", "/admin/participants", "UsersRound"],
    ["Announcements", "/admin/announcements", "Megaphone"],
    ["UdbhAV", "/admin/udbhav", "Rocket"],
    ["Analytics", "/admin/analytics", "Gauge"],
    ["Users & Roles", "/admin/users", "ShieldCheck"],
    ["Audit Logs", "/admin/audit-logs", "FileCheck2"],
    ["Settings", "/admin/settings", "Settings"],
  ],
  reviewer: [
    ["Dashboard", "/reviewer", "Gauge"],
    ["Pending reviews", "/reviewer?view=pending", "FileCheck2"],
    ["Completed reviews", "/reviewer?view=completed", "ClipboardList"],
    ["UdbhAV reviews", "/reviewer/udbhav", "Rocket"],
  ],
} as const;

export async function PortalShell({
  mode,
  title,
  user,
  children,
}: {
  mode: keyof typeof navSets;
  title: string;
  user?: { id?: string; name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const announcement = user?.id
    ? await db.notification.findFirst({
        where: { userId: user.id, type: "ANNOUNCEMENT", readAt: null },
        select: { id: true, title: true, body: true, href: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : null;
  return (
    <div className="portal-layout">
      <aside className="sidebar">
        <Brand />
        <PortalNav items={navSets[mode]} />
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
          <SignOutButton />
        </header>
        <div className="portal-content">
          {announcement && (
            <AnnouncementPopover item={{ ...announcement, createdAt: announcement.createdAt.toISOString() }} />
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
