export function canAccessApplication(
  mode: "read" | "edit" | "review",
  facts: { owns: boolean; manages: boolean; assigned: boolean },
) {
  if (mode === "edit") return facts.owns;
  if (mode === "review") return facts.assigned || facts.manages;
  return facts.owns || facts.assigned || facts.manages;
}
