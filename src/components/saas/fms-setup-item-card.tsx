import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
  const showChevron = !trailing && !secondaryAction;

  return (
    <li className="ws-fms-setup-item">
      <div className="ws-fms-setup-item-card">
        <Link href={href} className="ws-fms-setup-item-main">
          <div className="ws-fms-setup-item-body">
            <strong className="ws-fms-setup-item-title">{title}</strong>
            {subtitle ? (
              <div className="ws-fms-setup-item-sub">{subtitle}</div>
            ) : null}
          </div>
          {trailing ? (
            <div className="ws-fms-setup-item-trailing">{trailing}</div>
          ) : null}
        </Link>
        <div className="ws-fms-setup-item-rail">
          {badges}
          {secondaryAction ? (
            <div className="ws-fms-setup-item-action">{secondaryAction}</div>
          ) : null}
          {showChevron ? (
            <Link
              href={href}
              className="ws-fms-setup-item-chevron"
              aria-label={`Open ${title}`}
            >
              <ChevronRight size={18} aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
