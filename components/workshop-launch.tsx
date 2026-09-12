"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { eventTimeInput, eventTimeToIso } from "@/lib/domain/event-time";

export function WorkshopLaunch({ id, closesAt }: { id: string; closesAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const opening = String(data.get("opening") ?? "");
      const closing = String(data.get("closing"));
      const response = await fetch(`/api/workshops/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: "PUBLISHED",
          registrationOpenAt: opening ? eventTimeToIso(opening) : new Date().toISOString(),
          registrationCloseAt: eventTimeToIso(closing),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not launch workshop");
      setMessage(opening ? "Registration window saved" : "Registration is open");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not launch workshop");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary>Launch / schedule</summary>
      <form className="launch-controls" onSubmit={submit}>
        <label>
          Open at (IST; leave blank for now)
          <input name="opening" type="datetime-local" />
        </label>
        <label>
          Close at (IST)
          <input name="closing" type="datetime-local" required defaultValue={eventTimeInput(closesAt)} />
        </label>
        <button disabled={busy} className="button button-primary">
          {busy ? "Saving…" : "Launch / schedule"}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
    </details>
  );
}
