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
    <ul
      className={`social-links ${variant === "footer" ? "social-links-footer" : ""} ${className}`.trim()}
    >
      {socialLinks.map((link) => {
        const Icon = iconByNetwork[link.name];
        return (
          <li key={link.name}>
            <a
              className={`social-link social-link-${link.name.toLowerCase()}`}
              href={link.href}
              rel="noopener noreferrer"
              target="_blank"
              aria-label={link.label}
            >
              <Icon size={20} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
