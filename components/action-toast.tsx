"use client";

import { AlertCircle, X } from "lucide-react";

export function ActionToast({ message, onDismiss }: { message: string; onDismiss(): void }) {
  if (!message) return null;
  return (
    <div className="action-toast" role="alert" aria-live="assertive">
      <AlertCircle size={20} aria-hidden="true" />
      <p>{message}</p>
      <button type="button" aria-label="Dismiss notification" onClick={onDismiss}>
        <X size={18} />
      </button>
    </div>
  );
}
