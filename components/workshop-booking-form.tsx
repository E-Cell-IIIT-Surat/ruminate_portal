"use client";

import { FormEvent, useState } from "react";

type BookingFormProps = { className?: string; workshopId?: string; workshopName?: string };

export function WorkshopBookingForm({ className = "", workshopId, workshopName }: BookingFormProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/workshops/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(new FormData(form).entries()),
          workshopId: workshopId || "financial-literacy",
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; booking?: { name?: string } };
      if (!response.ok) throw new Error(result.error ?? "Unable to reserve your seat");
      setMessage(
        `Thanks${result.booking?.name ? `, ${result.booking.name}` : ""}. Your booking request for ${workshopName ?? "the workshop"} was received.`,
      );
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reserve your seat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={`workshop-booking-form ${className}`.trim()} onSubmit={submit}>
      <div className="form-grid-two">
        <label>
          Full name *
          <input name="name" required maxLength={120} placeholder="Your full name" />
        </label>
        <label>
          Email address *
          <input name="email" required type="email" maxLength={255} placeholder="you@example.com" />
        </label>
        <label>
          Phone number *
          <input name="phone" required type="tel" maxLength={25} placeholder="+91 98765 43210" />
        </label>
        <label>
          Batch *
          <input name="batch" required maxLength={80} placeholder="B.Tech / MBA / PhD" />
        </label>
        <label>
          Academic year *
          <input name="year" required inputMode="numeric" pattern="20\d{2}" maxLength={4} placeholder="2026" />
        </label>
        <label>
          Student ID
          <input name="studentId" maxLength={80} placeholder="Optional" />
        </label>
      </div>
      <label>
        Department / programme
        <input name="department" maxLength={120} placeholder="Computer Science, ECE, Management…" />
      </label>
      <label>
        Why would you like to attend?
        <textarea name="reason" rows={3} maxLength={1000} placeholder="Tell us what you hope to learn…" />
      </label>
      <button className="button" type="submit" disabled={busy}>
        {busy ? "Reserving seat…" : "Reserve my seat"}
      </button>
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
