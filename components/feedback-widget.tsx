"use client";

import { MessageSquare, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useDialogFocus } from "@/components/use-dialog-focus";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("BUG");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const dialogRef = useDialogFocus(open, () => setOpen(false));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending" || status === "sent") return;
    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type, message, pagePath: pathname }),
      });
      if (!response.ok) throw new Error("feedback failed");
      setMessage("");
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        className="feedback-tab"
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
        }}
        aria-label="Send feedback"
      >
        <MessageSquare size={16} /> Feedback
      </button>
      {open && (
        <div
          className="feedback-backdrop"
          role="presentation"
          onClick={(event) => event.target === event.currentTarget && setOpen(false)}
        >
          <section
            ref={dialogRef}
            tabIndex={-1}
            className="feedback-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-title"
          >
            <button
              className="icon-button feedback-close"
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback form"
            >
              <X size={18} />
            </button>
            <p className="eyebrow">Help us improve</p>
            <h2 id="feedback-title">Help shape Ruminate.</h2>
            <p>Your message goes directly to the Ruminate team.</p>
            <form onSubmit={submit}>
              <label>
                Type
                <select value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="BUG">Bug</option>
                  <option value="SUGGESTION">Suggestion</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label>
                Message
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="What should we know?"
                  rows={5}
                />
              </label>
              {status === "sent" && (
                <p className="form-success" role="status">
                  Thanks — your feedback was sent.
                </p>
              )}
              {status === "error" && (
                <p className="auth-error" role="alert">
                  Could not send feedback. Please try again.
                </p>
              )}
              <button
                className="button button-primary"
                type="submit"
                disabled={status === "sending" || status === "sent"}
              >
                <Send size={15} />
                {status === "sending" ? "Sending…" : status === "sent" ? "Feedback received" : "Send feedback"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
