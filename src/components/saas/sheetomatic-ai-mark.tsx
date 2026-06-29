import type { CSSProperties } from "react";

const LOCKUP_PATH = "/brand/sheetomatic-ai-logo.png";
const ICON_PATH = "/brand/sheetomatic-ai-icon.png";
const ICON_ON_DARK_PATH = "/images/sheetomatic-icon-light.svg";
/** Natural lockup aspect ratio (1536x1024). */
const LOCKUP_ASPECT = 1.5;

export type SheetomaticAiMarkSize = "sm" | "md" | "lg";

const LOCKUP_SIZE_MAP: Record<SheetomaticAiMarkSize, number> = {
  sm: 20,
  md: 28,
  lg: 32,
};

const ICON_SIZE_MAP: Record<SheetomaticAiMarkSize, number> = {
  sm: 16,
  md: 28,
  lg: 36,
};

type Props = {
  /** `icon` = square mark only; `lockup` = full Sheetomatic AI wordmark image. */
  variant?: "icon" | "lockup";
  sizes?: SheetomaticAiMarkSize;
  size?: number;
  showLabel?: boolean;
  /** White icon for primary / dark buttons (also set via `ws-fms-ai-btn-mark` class). */
  onDark?: boolean;
  className?: string;
};

function resolveHeight(
  variant: "icon" | "lockup",
  sizes: SheetomaticAiMarkSize | undefined,
  size: number | undefined,
) {
  if (size !== undefined) {
    return size;
  }
  const map = variant === "icon" ? ICON_SIZE_MAP : LOCKUP_SIZE_MAP;
  return map[sizes ?? "md"];
}

export function SheetomaticAiMark({
  variant = "icon",
  sizes,
  size,
  showLabel = false,
  onDark = false,
  className,
}: Props) {
  const height = resolveHeight(variant, sizes, size);
  const width =
    variant === "icon" ? height : Math.round(height * LOCKUP_ASPECT);
  const onDarkSurface =
    onDark || Boolean(className?.includes("ws-fms-ai-btn-mark"));
  const iconSrc =
    variant === "icon"
      ? onDarkSurface
        ? ICON_ON_DARK_PATH
        : ICON_PATH
      : LOCKUP_PATH;
  const rootClass = [
    "sheetomatic-ai-mark",
    variant === "icon" ? "sheetomatic-ai-mark--icon" : "sheetomatic-ai-mark--lockup",
    onDarkSurface ? "sheetomatic-ai-mark--on-dark" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const logo = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      alt=""
      aria-hidden
      className="sheetomatic-ai-mark-logo"
      height={height}
      src={iconSrc}
      width={width}
    />
  );

  return (
    <span
      className={rootClass}
      style={
        {
          "--sheetomatic-ai-mark-height": `${height}px`,
          "--sheetomatic-ai-mark-width": `${width}px`,
        } as CSSProperties
      }
      role="img"
      aria-label="Sheetomatic AI"
      title="Sheetomatic AI"
    >
      {onDarkSurface ? logo : <span className="sheetomatic-ai-mark-wrap">{logo}</span>}
      {showLabel ? (
        <span className="sheetomatic-ai-mark-label">Sheetomatic AI</span>
      ) : null}
    </span>
  );
}
