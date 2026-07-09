"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheckIcon,
  GlobeIcon,
  MailIcon,
  PhoneIcon,
  WhatsAppIcon,
} from "@/components/marketing/marketing-icons";
import {
  buildWhatsAppUrl,
  consultationUrl,
  whatsappDisplayNumber,
  whatsappTel,
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
        <WhatsAppIcon className="btn-cta-icon" size={18} strokeWidth={1.7} />
      </span>
      <span>{label}</span>
    </a>
  );
}

export function resolvePageWhatsAppMessage(pathname?: string | null) {
  if (!pathname || pathname === "/") {
    return "Hi Sheetomatic, I want to automate my business workflow.";
  }

  if (pathname.startsWith("/services/flow")) {
    return "Hi Sheetomatic, I want to know more about FMS (Flow Monitoring System) for my business.";
  }
  if (pathname.startsWith("/services/inventory")) {
    return "Hi Sheetomatic, I want to know more about IMS (Inventory Management System) for my business.";
  }
  if (pathname.startsWith("/services/crm")) {
    return "Hi Sheetomatic, I want to know more about your CRM and lead follow-up system for my business.";
  }
  if (pathname.startsWith("/services/tasks")) {
    return "Hi Sheetomatic, I want to know more about your Tasks module and WhatsApp task delegation for my business.";
  }
  if (pathname.startsWith("/services/checklist")) {
    return "Hi Sheetomatic, I want to know more about your Checklist module for daily operations.";
  }
  if (pathname.startsWith("/services/hr")) {
    return "Hi Sheetomatic, I want to know more about your HR and workforce modules for my business.";
  }
  if (pathname.startsWith("/services/mis")) {
    return "Hi Sheetomatic, I want to know more about MIS reports and dashboards for my business.";
  }
  if (pathname.startsWith("/services/whatsapp-ai") || pathname.startsWith("/ai")) {
    return "Hi Sheetomatic, I want to know more about your official WhatsApp API, AI replies, and CRM setup.";
  }
  if (pathname.startsWith("/services/automation")) {
    return "Hi Sheetomatic, I want to know more about custom software and automation for my business.";
  }
  if (pathname.startsWith("/services")) {
    return "Hi Sheetomatic, I want help choosing the right business system for my operations.";
  }
  if (pathname.startsWith("/products")) {
    return "Hi Sheetomatic, I want to know which Sheetomatic product is right for my business.";
  }
  if (pathname.startsWith("/whatsapp-plans")) {
    return "Hi Sheetomatic, I want details about your official and unofficial WhatsApp plans.";
  }
  if (pathname.startsWith("/career")) {
    return "Hi Sheetomatic, I want to apply for opportunities with your team.";
  }
  if (pathname.startsWith("/contact")) {
    return "Hi Sheetomatic, I want to discuss automation for my business.";
  }
  if (pathname.startsWith("/about")) {
    return "Hi Sheetomatic, I want to learn how Sheetomatic can help my business.";
  }

  return "Hi Sheetomatic, I want to know more about your solutions for my business.";
}

export function ContactButtons({
  className = "",
  message,
  whatsappLabel = whatsappDisplayNumber,
  callLabel = "Call now",
  whatsappClassName = "",
  callClassName = "",
}: {
  className?: string;
  message?: string;
  whatsappLabel?: string;
  callLabel?: string;
  whatsappClassName?: string;
  callClassName?: string;
}) {
  const pathname = usePathname();
  const resolvedMessage = message ?? resolvePageWhatsAppMessage(pathname);

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      <WhatsAppButton
        className={whatsappClassName}
        label={whatsappLabel}
        message={resolvedMessage}
      />
      <CallButton
        className={callClassName}
        label={callLabel}
        tel={whatsappTel}
      />
    </div>
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
