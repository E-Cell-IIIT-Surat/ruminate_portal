"use client";

import { useState } from "react";

export function NotificationList({
  items,
}: {
  items: { id: string; title: string; body: string; href: string | null; readAt: string | null; createdAt: string }[];
}) {
  const [notifications, setNotifications] = useState(items);
  async function markAll() {
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (response.ok)
      setNotifications((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() })));
  }
  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Recent updates</h2>
        <button className="button button-secondary" onClick={markAll}>
          Mark all read
        </button>
      </div>
      <div className="compact-list">
        {notifications.map((item) => (
          <a key={item.id} href={item.href ?? "/notifications"} className={!item.readAt ? "unread" : ""}>
            <strong>{item.title}</strong>
            <small>
              {item.body} · {new Date(item.createdAt).toLocaleString("en-IN")}
            </small>
          </a>
        ))}
      </div>
    </div>
  );
}
