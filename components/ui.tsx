import Link from "next/link";
import { Info, type LucideIcon } from "lucide-react";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link href={href} className={`button button-${variant} ${className}`}>
      {children}
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "orange" | "green" | "blue" | "red";
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Metric({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}

/** Small, keyboard-accessible contextual help popover used on operational pages. */
export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="info-tip">
      <button className="info-tip-trigger" type="button" aria-label={label}>
        <Info size={15} />
      </button>
      <span className="info-tip-content" role="tooltip">
        {children}
      </span>
    </span>
  );
}
