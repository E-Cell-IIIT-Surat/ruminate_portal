import { auth } from "@/auth";
import { db } from "@/lib/db";
import { forbidden, unauthorized } from "@/lib/errors";
import { permissions, type PermissionKey } from "@/lib/permissions";
import { canEditSubmitted } from "@/lib/domain/program";
import { AppError } from "@/lib/errors";
import { canAccessApplication } from "@/lib/domain/access";
import { superAdminEmails } from "@/lib/env";

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
      email: true,
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
  const grants = new Set<PermissionKey>(
    user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key as PermissionKey)),
  );
  const isGlobalAdmin = superAdminEmails().has(user.email.toLowerCase());
  if (isGlobalAdmin) {
    roles.add("SUPER_ADMIN");
    permissions.forEach((permission) => grants.add(permission));
  }
  const managedProgramIds = new Set(user.programManagerFor.map(({ programId }) => programId));
  return { ...user, roles, grants, managedProgramIds, isSuperAdmin: roles.has("SUPER_ADMIN") || isGlobalAdmin };
}

/**
 * Server-rendered pages can still receive a JWT after a database was changed,
 * reset, or migrated. In that case the session's user id no longer exists.
 * Treat only that expected stale-session case as unauthenticated; database
 * connectivity and query failures must continue to surface to the error
 * boundary instead of being silently downgraded to a login state.
 */
export async function userAuthorizationOrNull(userId: string) {
  try {
    return await userAuthorization(userId);
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") return null;
    throw error;
  }
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
      editOverrideUntil: true,
      program: { select: { allowsEditAfterSubmit: true, editDeadline: true } },
      reviewerAssignments: { where: { reviewerId: current.id }, select: { id: true } },
    },
  });
  if (!application) throw forbidden();
  const owns = application.userId === current.id;
  const manages = authorization.isSuperAdmin || authorization.managedProgramIds.has(application.programId);
  const assigned = application.reviewerAssignments.length > 0;
  const allowed = canAccessApplication(mode, { owns, manages, assigned });
  if (!allowed) throw forbidden();
  if (
    mode === "edit" &&
    !["DRAFT", "CHANGES_REQUESTED"].includes(application.status) &&
    !canEditSubmitted(application.program, application.editOverrideUntil)
  )
    throw new AppError("This application can no longer be edited", 409, "EDIT_LOCKED");
  return { current, authorization, application, owns, manages, assigned };
}
