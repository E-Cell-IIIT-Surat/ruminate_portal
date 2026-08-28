"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const statuses = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "CHANGES_REQUESTED",
  "SHORTLISTED",
  "ON_HOLD",
  "ACCEPTED",
  "REJECTED",
] as const;

type Status = (typeof statuses)[number];
type Settings = { isOpen: boolean; opensAt: string | null; closesAt: string | null };
type Submission = {
  id: string;
  referenceId: string;
  name: string;
  email: string;
  title: string;
  status: Status;
  estimatedBudget: string | null;
  createdAt: string;
};

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function labelize(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function AdminSSIPConsole({
  initialSettings,
  initialSubmissions,
}: {
  initialSettings: Settings;
  initialSubmissions: Submission[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState({
    isOpen: initialSettings.isOpen,
    opensAt: toLocalInput(initialSettings.opensAt),
    closesAt: toLocalInput(initialSettings.closesAt),
  });
  const [submissions, setSubmissions] = useState(initialSubmissions);
  const [message, setMessage] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function saveSettings() {
    if (savingSettings) return;
    setSavingSettings(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/ssip/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          isOpen: settings.isOpen,
          opensAt: settings.opensAt ? new Date(settings.opensAt).toISOString() : null,
          closesAt: settings.closesAt ? new Date(settings.closesAt).toISOString() : null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not save SSIP settings");
      setMessage(settings.isOpen ? "SSIP submissions are now open." : "SSIP submissions are now closed.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save SSIP settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function updateStatus(id: string, status: Status) {
    if (savingId) return;
    setSavingId(id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/ssip/submissions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update status");
      setSubmissions((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
      setMessage("SSIP status updated and the participant was notified.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update status.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="ssip-admin-console">
      <section className="panel ssip-admin-settings">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Submission window</p>
            <h2>Control SSIP applications</h2>
          </div>
          <span className={`badge ${settings.isOpen ? "badge-green" : "badge-orange"}`}>
            {settings.isOpen ? "OPEN" : "CLOSED"}
          </span>
        </div>
        <p className="muted">When closed, the public form refuses submissions even if someone has an old link.</p>
        <div className="ssip-admin-settings-grid">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={settings.isOpen}
              onChange={(event) => setSettings((current) => ({ ...current, isOpen: event.target.checked }))}
            />
            <span>Accept new SSIP submissions</span>
          </label>
          <label className="ssip-field">
            <span>Opens at</span>
            <input
              type="datetime-local"
              value={settings.opensAt}
              onChange={(event) => setSettings((current) => ({ ...current, opensAt: event.target.value }))}
            />
          </label>
          <label className="ssip-field">
            <span>Closes at</span>
            <input
              type="datetime-local"
              value={settings.closesAt}
              onChange={(event) => setSettings((current) => ({ ...current, closesAt: event.target.value }))}
            />
          </label>
        </div>
        <button className="button button-primary" type="button" onClick={saveSettings} disabled={savingSettings}>
          {savingSettings ? "Saving…" : "Save SSIP settings"}
        </button>
        {message && (
          <p className="form-status" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Idea pipeline</p>
            <h2>Submitted SSIP ideas</h2>
          </div>
          <span>{submissions.length} records</span>
        </div>
        {submissions.length === 0 ? (
          <div className="empty-state compact-empty">
            <h3>No SSIP submissions yet</h3>
            <p>Ideas will appear here once the submission window is open.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Participant</th>
                  <th>Idea</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.referenceId}</strong>
                    </td>
                    <td>
                      {item.name}
                      <br />
                      <small>{item.email}</small>
                    </td>
                    <td>{item.title}</td>
                    <td>{item.estimatedBudget ? `₹${item.estimatedBudget}` : "—"}</td>
                    <td>
                      <select
                        aria-label={`Update status for ${item.referenceId}`}
                        value={item.status}
                        disabled={savingId === item.id}
                        onChange={(event) => updateStatus(item.id, event.target.value as Status)}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {labelize(status)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{new Date(item.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
