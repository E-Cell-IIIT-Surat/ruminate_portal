"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Clock3, Send, UsersRound, X } from "lucide-react";
import { Badge } from "@/components/ui";

type PublicTeam = {
  id: string;
  name: string;
  motto: string | null;
  projectSummary: string | null;
  lookingFor: string | null;
  requiredMembers: number;
  memberCount: number;
  leaderName: string;
  leaderEmail: string;
  isLeader: boolean;
  isMember: boolean;
  requestStatus: string | null;
};

type MyTeam = PublicTeam & {
  status: string;
};

type JoinRequest = {
  id: string;
  teamId: string;
  teamName: string;
  message: string | null;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
};

export function TeamDirectory({
  publicTeams,
  myTeams,
  incomingRequests,
  myRequests,
}: {
  publicTeams: PublicTeam[];
  myTeams: MyTeam[];
  incomingRequests: JoinRequest[];
  myRequests: Array<{ id: string; status: string; message: string | null; teamName: string; createdAt: string }>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busyKey, setBusyKey] = useState("");

  async function submitTeam(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busyKey) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    setBusyKey("team-create");
    setStatus("Sending team request…");
    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          motto: formData.get("motto"),
          projectSummary: formData.get("projectSummary"),
          lookingFor: formData.get("lookingFor"),
          requiredMembers: formData.get("requiredMembers"),
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not request team approval.");
      form.reset();
      setStatus("Team request sent. Admin/professor approval is required before it becomes public.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not request team approval.");
    } finally {
      setBusyKey("");
    }
  }

  async function joinTeam(teamId: string, form: HTMLFormElement) {
    if (busyKey) return;
    const formData = new FormData(form);
    setBusyKey(`join-${teamId}`);
    setStatus("Sending join request…");
    try {
      const response = await fetch(`/api/teams/${teamId}/join-requests`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: formData.get("message") }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not send join request.");
      form.reset();
      setStatus("Join request sent to the team leader.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send join request.");
    } finally {
      setBusyKey("");
    }
  }

  async function decide(teamId: string, requestId: string, action: "ACCEPT" | "REJECT") {
    if (busyKey) return;
    setBusyKey(requestId);
    setStatus(`${action === "ACCEPT" ? "Accepting" : "Rejecting"} request…`);
    try {
      const response = await fetch(`/api/teams/${teamId}/join-requests/${requestId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update request.");
      setStatus(action === "ACCEPT" ? "Member added to the team." : "Join request rejected.");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update request.");
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="team-directory-layout">
      <section className="panel team-request-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Create a public team</span>
            <h2>Request team approval</h2>
          </div>
          <Badge tone="orange">Admin reviewed</Badge>
        </div>
        <form className="team-form" onSubmit={submitTeam}>
          <div className="form-grid">
            <label>
              Team name *
              <input className="input" name="name" required minLength={2} placeholder="Spark Builders" />
            </label>
            <label>
              Members needed *
              <input className="input" name="requiredMembers" required type="number" min={2} max={12} defaultValue={4} />
            </label>
          </div>
          <label>
            Motto *
            <input className="input" name="motto" required minLength={4} placeholder="Build small, solve real." />
          </label>
          <label>
            What are you making? *
            <textarea
              className="textarea"
              name="projectSummary"
              required
              minLength={10}
              placeholder="Explain the idea, project, startup, workshop build, or innovation goal."
            />
          </label>
          <label>
            Who are you looking for? *
            <textarea
              className="textarea"
              name="lookingFor"
              required
              minLength={4}
              placeholder="Example: frontend designer, pitch writer, electronics teammate, finance researcher..."
            />
          </label>
          <button className="button button-primary" disabled={busyKey === "team-create"}>
            <Send size={16} />
            {busyKey === "team-create" ? "Sending…" : "Request team"}
          </button>
        </form>
        {status && <p className="form-status">{status}</p>}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Directory</span>
            <h2>Public teams looking for members</h2>
          </div>
          <Badge tone="green">{publicTeams.length} live</Badge>
        </div>
        {publicTeams.length ? (
          <div className="team-card-grid">
            {publicTeams.map((team) => (
              <article className="team-card" id={`team-${team.id}`} key={team.id}>
                <div className="team-card-top">
                  <span className="team-avatar">
                    <UsersRound size={18} />
                  </span>
                  <div>
                    <h3>{team.name}</h3>
                    <p>{team.motto}</p>
                  </div>
                  <Badge tone={team.memberCount >= team.requiredMembers ? "neutral" : "green"}>
                    {team.memberCount}/{team.requiredMembers}
                  </Badge>
                </div>
                <p>{team.projectSummary}</p>
                <small>
                  Led by {team.leaderName} · {team.leaderEmail}
                </small>
                <div className="team-looking">
                  <strong>Looking for</strong>
                  <span>{team.lookingFor}</span>
                </div>
                {team.isLeader || team.isMember ? (
                  <p className="team-note">You are already part of this team.</p>
                ) : team.requestStatus === "PENDING" ? (
                  <p className="team-note">Your join request is pending with the team leader.</p>
                ) : team.memberCount >= team.requiredMembers ? (
                  <p className="team-note">This team is currently full.</p>
                ) : (
                  <form
                    className="join-request-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      joinTeam(team.id, event.currentTarget);
                    }}
                  >
                    <input className="input" name="message" placeholder="Short message to the leader" />
                    <button className="button button-secondary" disabled={busyKey === `join-${team.id}`}>
                      {busyKey === `join-${team.id}` ? "Sending…" : "Request to join"}
                    </button>
                  </form>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state compact-empty">
            <span className="empty-icon">
              <UsersRound size={22} />
            </span>
            <h3>No public teams yet</h3>
            <p>Approved teams will appear here for everyone to explore and request joining.</p>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Your workspace</span>
            <h2>My teams and requests</h2>
          </div>
        </div>
        <div className="team-split">
          <div className="compact-list">
            {myTeams.length ? (
              myTeams.map((team) => (
                <div key={team.id}>
                  <strong>{team.name}</strong>
                  <small>
                    {team.status.replaceAll("_", " ")} · {team.memberCount}/{team.requiredMembers} members
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">You are not part of any team yet.</p>
            )}
          </div>
          <div className="compact-list">
            {myRequests.length ? (
              myRequests.map((request) => (
                <div key={request.id}>
                  <strong>{request.teamName}</strong>
                  <small>
                    {request.status.replaceAll("_", " ")} · {new Date(request.createdAt).toLocaleString("en-IN")}
                  </small>
                </div>
              ))
            ) : (
              <p className="muted">No outgoing join requests.</p>
            )}
          </div>
        </div>
      </section>

      {incomingRequests.length > 0 && (
        <section className="panel" id="team-requests">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Leader controls</span>
              <h2>Join requests waiting for you</h2>
            </div>
            <Badge tone="orange">{incomingRequests.length} pending</Badge>
          </div>
          <div className="request-list">
            {incomingRequests.map((request) => (
              <article id={`team-${request.teamId}-requests`} key={request.id}>
                <div>
                  <Clock3 size={16} />
                  <strong>{request.requesterName}</strong>
                  <small>
                    {request.requesterEmail} wants to join {request.teamName}
                  </small>
                  {request.message && <p>{request.message}</p>}
                </div>
                <div className="request-actions">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={busyKey === request.id}
                    onClick={() => decide(request.teamId, request.id, "REJECT")}
                  >
                    <X size={15} />
                    Reject
                  </button>
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={busyKey === request.id}
                    onClick={() => decide(request.teamId, request.id, "ACCEPT")}
                  >
                    <Check size={15} />
                    Accept
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
