"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, ChevronDown } from "lucide-react";
import { useState } from "react";

export function PublicNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() ?? "/";
  const [workshopsOpen, setWorkshopsOpen] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className="public-nav" aria-label="Primary navigation">
      <div
        className="public-nav-menu"
        onMouseEnter={() => setWorkshopsOpen(true)}
        onMouseLeave={() => setWorkshopsOpen(false)}
      >
        <Link
          className={`public-nav-link public-nav-trigger ${active("/financial-literacy-workshop") ? "active" : ""}`}
          href="/financial-literacy-workshop"
          aria-haspopup="menu"
          onFocus={() => setWorkshopsOpen(true)}
        >
          Workshops <ChevronDown size={14} />
        </Link>
        {workshopsOpen && (
          <div className="public-workshop-popover">
            <Link
              href="/financial-literacy-workshop"
              className="public-workshop-banner"
              onClick={() => setWorkshopsOpen(false)}
            >
              <span className="public-workshop-icon">
                <BookOpenCheck size={20} />
              </span>
              <span>
                <strong>Financial Literacy Workshop</strong>
                <small>Learn money basics, save your seat, and build confidence.</small>
              </span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </div>
      <Link className={`public-nav-link ${active("/udbhav") ? "active" : ""}`} href="/udbhav">
        UdbhAV
      </Link>
      <Link className={`public-nav-link ${active("/ssip") ? "active" : ""}`} href="/ssip">
        SSIP
      </Link>
      {!signedIn && (
        <Link className="public-nav-link" href="/signin">
          Sign in
        </Link>
      )}
      <Link className="button button-secondary public-portal-link" href={signedIn ? "/dashboard" : "/signin"}>
        My portal
      </Link>
    </nav>
  );
}
