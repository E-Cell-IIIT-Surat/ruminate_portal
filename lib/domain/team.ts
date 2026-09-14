export function canDeleteTeam(actor: { id: string; canManageUsers: boolean }, leaderId: string) {
  return actor.canManageUsers || actor.id === leaderId;
}
