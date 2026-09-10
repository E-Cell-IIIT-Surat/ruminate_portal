"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDialogFocus } from "@/components/use-dialog-focus";
import { portalIcons, type NavItem } from "@/components/portal-nav";
import { activeNavHref } from "@/lib/domain/navigation";

export function MobilePortalNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const panelRef = useDialogFocus(open, () => setOpen(false));
  const activeHref = activeNavHref(items, pathname, new URLSearchParams(searchParams.toString()));

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
          <nav ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" className="mobile-portal-panel" id="mobile-portal-menu" aria-label="Portal navigation">
            <button className="button button-secondary" type="button" onClick={() => setOpen(false)}>
              <X size={18} aria-hidden="true" /> Close menu
            </button>
            {items.map(([label, href, iconName]) => {
              const Icon = portalIcons[iconName];
              const active = href === activeHref;
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
