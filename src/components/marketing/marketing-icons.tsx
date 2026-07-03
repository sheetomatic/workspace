type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

function iconProps({
  size = 20,
  className,
  strokeWidth = 2,
}: IconProps) {
  return {
    width: size,
    height: size,
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function ArrowRightIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function BookOpenIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}

export function BriefcaseIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </svg>
  );
}

export function CalendarCheckIcon(props: IconProps) {
  const attrs = iconProps({ ...props, strokeWidth: props.strokeWidth ?? 2.25 });
  return (
    <svg {...attrs}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps) {
  const attrs = iconProps({ ...props, strokeWidth: props.strokeWidth ?? 2.25 });
  return (
    <svg {...attrs}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export function LayoutDashboardIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export function MailIcon(props: IconProps) {
  const attrs = iconProps({ ...props, strokeWidth: props.strokeWidth ?? 2.25 });
  return (
    <svg {...attrs}>
      <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
      <rect x="2" y="4" width="20" height="16" rx="2" />
    </svg>
  );
}

export function MessageCircleIcon(props: IconProps) {
  const attrs = iconProps({ ...props, strokeWidth: props.strokeWidth ?? 2.25 });
  return (
    <svg {...attrs}>
      <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
    </svg>
  );
}

export function WhatsAppIcon(props: IconProps) {
  const {
    size = 20,
    className,
  } = props;
  return (
    <svg
      aria-hidden
      className={className}
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      style={{ stroke: "none" }}
    >
      <path d="M12.04 2c-5.52 0-10 4.46-10 9.96 0 1.76.46 3.48 1.33 4.99L2 22l5.2-1.36a10.06 10.06 0 0 0 4.81 1.23h.04c5.51 0 9.99-4.47 9.99-9.97A9.9 9.9 0 0 0 19.1 4.93 10.03 10.03 0 0 0 12.04 2Zm0 18.19h-.03a8.34 8.34 0 0 1-4.25-1.17l-.31-.18-3.08.81.82-3-.2-.31a8.27 8.27 0 0 1-1.28-4.38 8.36 8.36 0 0 1 14.29-5.9 8.2 8.2 0 0 1 2.45 5.89 8.35 8.35 0 0 1-8.41 8.24Zm4.58-6.24c-.25-.12-1.47-.72-1.7-.8-.22-.08-.38-.12-.54.12-.16.23-.62.8-.76.96-.14.16-.28.18-.52.06-.25-.12-1.03-.38-1.96-1.22-.72-.64-1.21-1.44-1.35-1.68-.14-.24-.02-.37.1-.49.11-.11.25-.28.38-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.41-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.33.98 2.49c.12.16 1.68 2.57 4.08 3.6.57.25 1.02.4 1.37.51.58.18 1.11.15 1.53.09.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.07-.1-.24-.16-.48-.28Z" />
    </svg>
  );
}

export function PackageIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <path d="m7.5 4.27 9 5.15" />
    </svg>
  );
}

export function PhoneIcon(props: IconProps) {
  const attrs = iconProps({ ...props, strokeWidth: props.strokeWidth ?? 2.25 });
  return (
    <svg {...attrs}>
      <path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" />
    </svg>
  );
}

export function UserRoundIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <circle cx="12" cy="8" r="5" />
      <path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  );
}

export function WrenchIcon(props: IconProps) {
  const attrs = iconProps(props);
  return (
    <svg {...attrs}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
