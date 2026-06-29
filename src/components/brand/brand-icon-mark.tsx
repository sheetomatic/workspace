import Image from "next/image";

type BrandIconMarkProps = {
  size?: number;
  priority?: boolean;
  /** Use "light" on dark backgrounds (login panel, footer). */
  theme?: "light" | "dark";
};

export function BrandIconMark({
  size = 26,
  priority = false,
  theme = "dark",
}: BrandIconMarkProps) {
  const src =
    theme === "light"
      ? "/images/sheetomatic-icon-light.svg"
      : "/images/sheetomatic-icon.svg";

  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      width={size}
      height={size}
      priority={priority}
    />
  );
}
