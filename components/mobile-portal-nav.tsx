"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { portalIcons, type NavItem } from "@/components/portal-nav";

export function MobilePortalNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="mobile-portal-nav">
      <button
        type="button"
        className="mobile-portal-menu-button"
        aria-label={open ? "Close portal navigation" : "Open portal navigation"}
        aria-expanded={open}
        aria-controls="mobile-portal-menu"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>
      {open && (
        <>
          <button
            className="mobile-portal-scrim"
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <nav className="mobile-portal-panel" id="mobile-portal-menu" aria-label="Portal navigation">
            {items.map(([label, href, iconName]) => {
              const Icon = portalIcons[iconName];
              const [targetPath, targetQuery] = href.split("?");
              const pathMatches = pathname === targetPath || pathname.startsWith(`${targetPath}/`);
              const queryMatches = targetQuery
                ? new URLSearchParams(targetQuery).get("view") === searchParams.get("view")
                : !["/reviewer"].includes(targetPath) || !searchParams.get("view");
              const active = pathMatches && queryMatches;
              return (
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  className={active ? "active" : undefined}
                  aria-current={active ? "page" : undefined}
                  key={href}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </>
      )}
    </div>
  );
}
