import { redirect } from "next/navigation";

export default function AuditAlias() {
  redirect("/admin/audit-logs");
}
