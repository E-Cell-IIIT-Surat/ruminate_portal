import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { NotificationList } from "@/components/notification-list";
import { PortalShell } from "@/components/portal-shell";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { hasDatabaseConfig } from "@/lib/env";
import { Bell } from "lucide-react";
import type { Session } from "next-auth";

export const dynamic = "force-dynamic";

function notificationsQuery(userId: string) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export default async function NotificationsPage() {
  if (!hasDatabaseConfig()) return <AuthGate title="Portal setup required" />;
  let session: Session | null;
  try {
    session = await auth();
  } catch (error) {
    console.error("[notifications] authentication check failed", error);
    return (
      <AuthGate title="Notifications temporarily unavailable" body="The live auth service could not be reached." />
    );
  }
  if (!session?.user) return <AuthGate />;
  let items: Awaited<ReturnType<typeof notificationsQuery>> = [];
  try {
    items = await notificationsQuery(session.user.id);
  } catch (error) {
    console.error("[notifications] database read failed", error);
    return (
      <AuthGate
        title="Notifications temporarily unavailable"
        body="The portal could not read notifications from the production database."
      />
    );
  }
  return (
    <PortalShell mode="participant" title="Participant portal" user={session.user}>
      <PageHeader eyebrow="Updates" title="Notifications" description="Application, review, and program updates." />
      {items.length ? (
        <NotificationList
          items={items.map((item) => ({
            ...item,
            readAt: item.readAt?.toISOString() ?? null,
            createdAt: item.createdAt.toISOString(),
          }))}
        />
      ) : (
        <div className="panel">
          <EmptyState icon={Bell} title="No notifications" body="Important updates will appear here." />
        </div>
      )}
    </PortalShell>
  );
}
