import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  XIcon,
} from "./social-brand-icons";
import { socialLinks } from "@/app/page-content";

const iconByNetwork = {
  LinkedIn: LinkedInIcon,
  Facebook: FacebookIcon,
  Instagram: InstagramIcon,
  X: XIcon,
} as const;

export function SocialLinks({
  className = "",
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "footer";
}) {
  return (
    <div
      className={`social-links ${variant === "footer" ? "social-links-footer" : ""} ${className}`.trim()}
      role="list"
    >
      {socialLinks.map((link) => {
        const Icon = iconByNetwork[link.name];
        return (
          <a
            className={`social-link social-link-${link.name.toLowerCase()}`}
            href={link.href}
            key={link.name}
            rel="noopener noreferrer"
            target="_blank"
            aria-label={link.label}
            role="listitem"
          >
            <Icon size={20} />
          </a>
        );
      })}
    </div>
  );
}
