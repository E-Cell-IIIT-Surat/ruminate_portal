"use client";

import {
  Bell,
  BarChart3,
  Blocks,
  BookOpenCheck,
  ClipboardList,
  FileCheck2,
  Gauge,
  Lightbulb,
  Megaphone,
  Rocket,
  Settings,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

export type NavItem = readonly [string, string, keyof typeof portalIcons];

export const portalIcons = {
  Bell,
  BarChart3,
  Blocks,
  BookOpenCheck,
  ClipboardList,
  FileCheck2,
  Gauge,
  Lightbulb,
  Megaphone,
  Rocket,
  Settings,
  ShieldCheck,
  UsersRound,
} satisfies Record<string, LucideIcon>;

export function PortalNav({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <nav aria-label="Portal navigation">
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
  );
}
