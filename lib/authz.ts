import { auth } from "@/auth";
import { db } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/errors";
import type { PermissionKey } from "@/lib/permissions";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw unauthorized();
  return session.user;
}

export async function userAuthorization(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId, archivedAt: null },
    select: {
      id: true,
      roles: {
        select: {
          role: {
            select: { name: true, permissions: { select: { permission: { select: { key: true } } } } },
          },
        },
      },
      programManagerFor: { select: { programId: true } },
    },
  });
  if (!user) throw unauthorized();
  const roles = new Set(user.roles.map(({ role }) => role.name));
  const grants = new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key)));
  const managedProgramIds = new Set(user.programManagerFor.map(({ programId }) => programId));
  return { ...user, roles, grants, managedProgramIds, isSuperAdmin: roles.has("SUPER_ADMIN") };
}

export async function requirePermission(permission: PermissionKey, programId?: string) {
  const current = await requireUser();
  const authorization = await userAuthorization(current.id);
  if (!authorization.grants.has(permission)) throw forbidden();
  if (programId && !authorization.isSuperAdmin && !authorization.managedProgramIds.has(programId)) throw forbidden();
  return authorization;
}

export async function requireApplicationAccess(applicationId: string, mode: "read" | "edit" | "review" = "read") {
  const current = await requireUser();
  const authorization = await userAuthorization(current.id);
  const application = await db.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
      programId: true,
      status: true,
      reviewerAssignments: { where: { reviewerId: current.id }, select: { id: true } },
    },
  });
  if (!application) throw forbidden();
  const owns = application.userId === current.id;
  const manages = authorization.isSuperAdmin || authorization.managedProgramIds.has(application.programId);
  const assigned = application.reviewerAssignments.length > 0;
  const allowed =
    mode === "edit" ? owns || manages : mode === "review" ? assigned || manages : owns || assigned || manages;
  if (!allowed) throw forbidden();
  return { current, authorization, application, owns, manages, assigned };
}
