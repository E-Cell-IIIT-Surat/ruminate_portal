export const permissions = [
  "program:create",
  "program:update",
  "program:archive",
  "form:manage",
  "application:view",
  "application:update-status",
  "application:export",
  "review:view-assigned",
  "review:submit",
  "reviewer:assign",
  "announcement:create",
  "user:manage",
  "role:manage",
  "audit:view",
] as const;

export type PermissionKey = (typeof permissions)[number];

export const rolePermissionMap = {
  PARTICIPANT: [] as PermissionKey[],
  REVIEWER: ["review:view-assigned", "review:submit"],
  FACULTY_REVIEWER: ["review:view-assigned", "review:submit"],
  CONTENT_MANAGER: ["announcement:create"],
  PROGRAM_MANAGER: [
    "program:update",
    "form:manage",
    "application:view",
    "application:update-status",
    "application:export",
    "reviewer:assign",
    "announcement:create",
  ],
  SUPER_ADMIN: [...permissions],
} satisfies Record<string, PermissionKey[]>;
