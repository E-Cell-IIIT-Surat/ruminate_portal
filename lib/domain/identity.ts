/** An email allowlist is not proof of ownership. Explicit DB roles are separate. */
export function hasVerifiedEmailAccess(
  user: { email: string; emailVerified: Date | null },
  allowlist: ReadonlySet<string>,
) {
  return Boolean(user.emailVerified) && allowlist.has(user.email.trim().toLowerCase());
}
