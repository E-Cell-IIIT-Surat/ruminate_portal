import { auth } from "@/auth";
import { AuthGate } from "@/components/auth-gate";
import { NotificationList } from "@/components/notification-list";
import { PortalShell } from "@/components/portal-shell";
import { EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { Bell } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) return <AuthGate />;
  const items = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
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
