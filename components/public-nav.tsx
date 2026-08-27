"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

export function PublicNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname() ?? "/";
  const [workshopsOpen, setWorkshopsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);
  const closeMobile = () => setMobileOpen(false);
  return (
    <nav className="public-nav" aria-label="Primary navigation">
      <div className="public-nav-desktop">
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
      </div>
      <button
        className="public-nav-mobile-toggle"
        type="button"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        aria-controls="public-mobile-menu"
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && (
        <div className="public-nav-mobile-panel" id="public-mobile-menu">
          <Link
            className={`public-nav-mobile-link ${active("/financial-literacy-workshop") ? "active" : ""}`}
            href="/financial-literacy-workshop"
            onClick={closeMobile}
          >
            <BookOpenCheck size={18} />
            <span>Workshops</span>
            <ArrowUpRight size={15} />
          </Link>
          <Link className="public-nav-mobile-subitem" href="/financial-literacy-workshop" onClick={closeMobile}>
            Financial Literacy Workshop
          </Link>
          <Link
            className={`public-nav-mobile-link ${active("/udbhav") ? "active" : ""}`}
            href="/udbhav"
            onClick={closeMobile}
          >
            UdbhAV
          </Link>
          <Link
            className={`public-nav-mobile-link ${active("/ssip") ? "active" : ""}`}
            href="/ssip"
            onClick={closeMobile}
          >
            SSIP
          </Link>
          {!signedIn && (
            <Link className="public-nav-mobile-link" href="/signin" onClick={closeMobile}>
              Sign in
            </Link>
          )}
          <Link
            className="button button-secondary public-nav-mobile-portal"
            href={signedIn ? "/dashboard" : "/signin"}
            onClick={closeMobile}
          >
            My portal
          </Link>
        </div>
      )}
    </nav>
  );
}
