import { Brand } from "@/components/brand";
import { SignOutButton } from "@/components/sign-out-button";
import { PortalNav } from "@/components/portal-nav";
import { MobilePortalNav } from "@/components/mobile-portal-nav";
import { AnnouncementPopover } from "@/components/announcement-popover";
import { db } from "@/lib/db";

const navSets = {
  participant: [
    ["Dashboard", "/dashboard", "Gauge"],
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
    ["Teams", "/admin/teams", "UsersRound"],
    ["Announcements", "/admin/announcements", "Megaphone"],
    ["UdbhAV", "/admin/udbhav", "Rocket"],
    ["SSIP", "/admin/ssip", "Lightbulb"],
    ["Analytics", "/admin/analytics", "BarChart3"],
    ["Users & Roles", "/admin/users", "ShieldCheck"],
    ["Audit Logs", "/admin/audit-logs", "FileCheck2"],
    ["Feedback", "/admin/feedback", "Megaphone"],
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
    ? await db.notification
        .findFirst({
          where: { userId: user.id, type: "ANNOUNCEMENT", readAt: null },
          select: { id: true, title: true, body: true, href: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        })
        .catch((error) => {
          console.error("[portal-shell] announcement lookup failed", error);
          return null;
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
          <MobilePortalNav items={navSets[mode]} />
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
