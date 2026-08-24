"use client";

import { BellRing, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AnnouncementPopover({
  item,
}: {
  item: { id: string; title: string; body: string; href: string | null; createdAt: string };
}) {
  const [open, setOpen] = useState(true);
  async function close() {
    setOpen(false);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: [item.id] }),
    });
  }
  if (!open) return null;
  return (
    <aside className="announcement-popover" role="dialog" aria-label="New announcement">
      <div className="announcement-popover-head">
        <span>
          <BellRing size={16} /> New announcement
        </span>
        <button type="button" aria-label="Dismiss announcement" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <strong>{item.title}</strong>
      <p>{item.body}</p>
      <small>{new Date(item.createdAt).toLocaleString("en-IN")}</small>
      <div className="announcement-popover-actions">
        {item.href && (
          <Link href={item.href} onClick={close}>
            Read update <ExternalLink size={14} />
          </Link>
        )}
        <button type="button" onClick={close}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
