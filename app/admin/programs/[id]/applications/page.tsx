import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/authz";

export default async function ProgramApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("application:view", id);
  redirect(`/admin/applications?programId=${encodeURIComponent(id)}`);
}
