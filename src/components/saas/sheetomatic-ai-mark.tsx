import type { CSSProperties } from "react";

/** Crisp SVG marks — same growth-bars brand as site/workspace. */
const ICON_PATH = "/images/sheetomatic-icon.svg";
const ICON_ON_DARK_PATH = "/images/sheetomatic-icon-light.svg";
const LOCKUP_PATH = "/images/sheetomatic-ai-lockup.svg";
/** Lockup aspect (168×40). */
const LOCKUP_ASPECT = 4.2;

export type SheetomaticAiMarkSize = "sm" | "md" | "lg";

const LOCKUP_SIZE_MAP: Record<SheetomaticAiMarkSize, number> = {
  sm: 18,
  md: 24,
  lg: 28,
};

const ICON_SIZE_MAP: Record<SheetomaticAiMarkSize, number> = {
  sm: 16,
  md: 22,
  lg: 28,
};

type Props = {
  /** `icon` = square mark only; `lockup` = symbol + sheetomatic AI wordmark. */
  variant?: "icon" | "lockup";
  sizes?: SheetomaticAiMarkSize;
  size?: number;
  showLabel?: boolean;
  /** Brighter icon for primary / dark buttons (also via `ws-fms-ai-btn-mark`). */
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
      {onDarkSurface ? (
        <span className="sheetomatic-ai-mark-wrap sheetomatic-ai-mark-wrap--on-dark">
          {logo}
        </span>
      ) : (
        <span className="sheetomatic-ai-mark-wrap">{logo}</span>
      )}
      {showLabel ? (
        <span className="sheetomatic-ai-mark-label">Sheetomatic AI</span>
      ) : null}
    </span>
  );
}
