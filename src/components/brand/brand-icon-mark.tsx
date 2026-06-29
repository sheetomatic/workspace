import Image from "next/image";
import { siteBrand } from "@/app/site-content";

type BrandIconMarkProps = {
  size?: number;
  priority?: boolean;
  /** Use "light" on dark backgrounds (login panel, footer). Default "dark" for light UI. */
  theme?: "light" | "dark";
};

export function BrandIconMark({
  size = 26,
  priority = false,
  theme = "dark",
}: BrandIconMarkProps) {
  return (
    <Image
      src={theme === "light" ? siteBrand.iconLightSrc : siteBrand.iconSrc}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={priority}
    />
  );
}
