import Link from "next/link";
import {
  CalendarCheckIcon,
  GlobeIcon,
  MailIcon,
  MessageCircleIcon,
  PhoneIcon,
} from "@/components/marketing/marketing-icons";
import {
  buildWhatsAppUrl,
  consultationUrl,
  whatsappDisplayNumber,
  whatsappUrl,
} from "@/app/site-content";
import type { ReactNode } from "react";

export type MarketingButtonVariant = "primary" | "secondary" | "whatsapp";

export function marketingButtonClass(
  variant: MarketingButtonVariant = "primary",
  extra = "",
) {
  const base = {
    primary: "btn-cta btn-primary",
    secondary: "btn-cta btn-secondary",
    whatsapp: "btn-cta btn-whatsapp",
  }[variant];
  return extra ? `${base} ${extra}`.trim() : base;
}

export function ConsultTodayButton({
  className = "",
  label = "Consult Today",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <a
      className={marketingButtonClass("primary", `consult-today-btn ${className}`.trim())}
      href={consultationUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="btn-cta-icon-wrap" aria-hidden>
        <CalendarCheckIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </a>
  );
}

export function CallButton({
  tel,
  label,
  className = "",
}: {
  tel: string;
  label: string;
  className?: string;
}) {
  return (
    <a className={marketingButtonClass("secondary", className)} href={`tel:${tel}`}>
      <span className="btn-cta-icon-wrap" aria-hidden>
        <PhoneIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </a>
  );
}

export function EmailButton({
  email,
  className = "",
  label,
}: {
  email: string;
  className?: string;
  label?: string;
}) {
  return (
    <a
      className={marketingButtonClass("secondary", className)}
      href={`mailto:${email}`}
    >
      <span className="btn-cta-icon-wrap" aria-hidden>
        <MailIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
      </span>
      <span>{label ?? email}</span>
    </a>
  );
}

export function WebsiteButton({
  href,
  className = "",
  label,
}: {
  href: string;
  className?: string;
  label: string;
}) {
  return (
    <a
      className={marketingButtonClass("secondary", className)}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="btn-cta-icon-wrap" aria-hidden>
        <GlobeIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </a>
  );
}

export function WhatsAppButton({
  className = "",
  label = whatsappDisplayNumber,
  message,
}: {
  className?: string;
  label?: string;
  message?: string;
}) {
  const href = message ? buildWhatsAppUrl(message) : whatsappUrl;

  return (
    <a
      className={marketingButtonClass("whatsapp", className)}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="btn-cta-icon-wrap" aria-hidden>
        <MessageCircleIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </a>
  );
}

export function ContactLinkButton({
  className = "",
  label = "Contact",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      className={marketingButtonClass("secondary", `contact-link-btn ${className}`.trim())}
      href="/contact"
    >
      <span className="btn-cta-icon-wrap" aria-hidden>
        <PhoneIcon className="btn-cta-icon" size={18} strokeWidth={2.25} />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export function MarketingLinkButton({
  href,
  variant = "secondary",
  className = "",
  children,
}: {
  href: string;
  variant?: MarketingButtonVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link className={marketingButtonClass(variant, className)} href={href}>
      {children}
    </Link>
  );
}
