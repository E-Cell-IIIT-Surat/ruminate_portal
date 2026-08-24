"use client";

import { ArrowLeft, Compass, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="route-state route-state-not-found">
      <span className="route-state-code">404</span>
      <div className="route-state-icon">
        <Compass size={25} />
      </div>
      <p className="eyebrow">Wrong turn</p>
      <h1>This page went off the map.</h1>
      <p>We could not find that destination. The link may be old, or the page may have moved.</p>
      <div className="route-state-actions">
        <Link href="/" className="button button-primary">
          <Home size={16} /> Back home
        </Link>
        <button className="button button-secondary" onClick={() => window.history.back()}>
          <ArrowLeft size={16} /> Go back
        </button>
      </div>
    </main>
  );
}
