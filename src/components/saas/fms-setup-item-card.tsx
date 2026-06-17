import Link from "next/link";
import type { ReactNode } from "react";

export function FmsSetupItemCard({
  href,
  title,
  subtitle,
  badges,
  trailing,
  secondaryAction,
}: {
  href: string;
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  trailing?: ReactNode;
  secondaryAction?: ReactNode;
}) {
  return (
    <li className="ws-fms-setup-item">
      <Link href={href} className="ws-fms-setup-item-card">
        <div className="ws-fms-setup-item-body">
          <strong className="ws-fms-setup-item-title">{title}</strong>
          {subtitle ? <div className="ws-fms-setup-item-sub">{subtitle}</div> : null}
        </div>
        <div className="ws-fms-setup-item-end">
          {badges}
          {trailing ?? <span className="ws-fms-setup-item-open">Open</span>}
        </div>
      </Link>
      {secondaryAction ? (
        <div className="ws-fms-setup-item-secondary">{secondaryAction}</div>
      ) : null}
    </li>
  );
}
