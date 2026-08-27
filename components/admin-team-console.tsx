"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Lock, X } from "lucide-react";
import { Badge } from "@/components/ui";

type AdminTeam = {
  id: string;
  name: string;
  motto: string | null;
  projectSummary: string | null;
  lookingFor: string | null;
  requiredMembers: number;
  memberCount: number;
  pendingRequests: number;
  status: string;
  isPublic: boolean;
  leaderName: string;
  leaderEmail: string;
  createdAt: string;
};

export function AdminTeamConsole({ teams }: { teams: AdminTeam[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");

  async function updateTeam(teamId: string, action: "APPROVE" | "REJECT" | "CLOSE" | "ARCHIVE") {
    if (busy) return;
    setBusy(`${teamId}-${action}`);
    setStatus("Updating team…");
    try {
      const response = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update team.");
      setStatus("Team updated.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update team.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Team governance</span>
          <h2>Team requests and public directory</h2>
        </div>
        <Badge tone="orange">{teams.filter((team) => team.status === "PENDING_APPROVAL").length} pending</Badge>
      </div>
      {status && <p className="form-status">{status}</p>}
      <div className="admin-team-grid">
        {teams.map((team) => (
          <article className="team-card admin-team-card" id={`team-${team.id}`} key={team.id}>
            <div className="team-card-top">
              <span className="team-avatar">
                <Lock size={18} />
              </span>
              <div>
                <h3>{team.name}</h3>
                <p>{team.motto ?? "No motto added"}</p>
              </div>
              <Badge tone={team.status === "PUBLIC" ? "green" : team.status === "REJECTED" ? "red" : "orange"}>
                {team.status.replaceAll("_", " ")}
              </Badge>
            </div>
            <p>{team.projectSummary ?? "No project summary added."}</p>
            <small>
              Leader: {team.leaderName} · {team.leaderEmail}
            </small>
            <div className="team-stats-row">
              <span>
                {team.memberCount}/{team.requiredMembers} members
              </span>
              <span>{team.pendingRequests} join requests</span>
              <span>{new Date(team.createdAt).toLocaleDateString("en-IN")}</span>
            </div>
            {team.lookingFor && (
              <div className="team-looking">
                <strong>Looking for</strong>
                <span>{team.lookingFor}</span>
              </div>
            )}
            <div className="request-actions">
              {team.status === "PENDING_APPROVAL" && (
                <>
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => updateTeam(team.id, "REJECT")}
                  >
                    <X size={15} />
                    Reject
                  </button>
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => updateTeam(team.id, "APPROVE")}
                  >
                    <Check size={15} />
                    Approve public team
                  </button>
                </>
              )}
              {team.status === "PUBLIC" && (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => updateTeam(team.id, "CLOSE")}
                >
                  Close public listing
                </button>
              )}
              {team.status !== "ARCHIVED" && (
                <button
                  className="button button-ghost"
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => updateTeam(team.id, "ARCHIVE")}
                >
                  Archive
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
