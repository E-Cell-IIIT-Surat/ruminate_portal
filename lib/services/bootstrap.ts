import { db } from "@/lib/db";
import { permissions, rolePermissionMap } from "@/lib/permissions";
import { superAdminEmails } from "@/lib/env";

export async function ensureUserRoles(user: { id?: string; email?: string | null }) {
  if (!user.id || !user.email) return;
  const userId = user.id;
  const email = user.email;

  await db.$transaction(async (tx) => {
    await tx.permission.createMany({
      data: permissions.map((key) => ({ key, description: key.replaceAll(":", " ") })),
      skipDuplicates: true,
    });
    await tx.role.createMany({
      data: Object.keys(rolePermissionMap).map((name) => ({ name: name as never })),
      skipDuplicates: true,
    });

    const [roles, grants] = await Promise.all([
      tx.role.findMany({ select: { id: true, name: true } }),
      tx.permission.findMany({ select: { id: true, key: true } }),
    ]);
    const permissionByKey = new Map(grants.map((grant) => [grant.key, grant.id]));
    for (const role of roles) {
      const keys = rolePermissionMap[role.name];
      if (!keys?.length) continue;
      await tx.rolePermission.createMany({
        data: keys.map((key) => ({ roleId: role.id, permissionId: permissionByKey.get(key)! })),
        skipDuplicates: true,
      });
    }

    const participant = roles.find((role) => role.name === "PARTICIPANT");
    if (participant)
      await tx.userRole.upsert({
        where: { userId_roleId: { userId, roleId: participant.id } },
        create: { userId, roleId: participant.id },
        update: {},
      });

    if (superAdminEmails().has(email.toLowerCase())) {
      const admin = roles.find((role) => role.name === "SUPER_ADMIN");
      if (admin)
        await tx.userRole.upsert({
          where: { userId_roleId: { userId, roleId: admin.id } },
          create: { userId, roleId: admin.id },
          update: {},
        });
    }
  });
}
