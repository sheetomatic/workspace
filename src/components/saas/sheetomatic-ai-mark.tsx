import type { CSSProperties } from "react";
import Image from "next/image";

const LOGO_PATH = "/brand/sheetomatic-ai-logo.png";
/** Natural logo aspect ratio (1536x1024). */
const LOGO_ASPECT = 1.5;

export type SheetomaticAiMarkSize = "sm" | "md" | "lg";

const SIZE_MAP: Record<SheetomaticAiMarkSize, number> = {
  sm: 20,
  md: 28,
  lg: 32,
};

type Props = {
  /** Preset size for common contexts. Defaults to `md` (28px height). */
  sizes?: SheetomaticAiMarkSize;
  /** Explicit height in px; overrides `sizes` when set. */
  size?: number;
  showLabel?: boolean;
  className?: string;
};

function resolveHeight(sizes: SheetomaticAiMarkSize | undefined, size: number | undefined) {
  if (size !== undefined) {
    return size;
  }
  return SIZE_MAP[sizes ?? "md"];
}

export function SheetomaticAiMark({
  sizes,
  size,
  showLabel = false,
  className,
}: Props) {
  const height = resolveHeight(sizes, size);
  const width = Math.round(height * LOGO_ASPECT);
  const rootClass = ["sheetomatic-ai-mark", className].filter(Boolean).join(" ");

  return (
    <span
      className={rootClass}
      style={
        {
          "--sheetomatic-ai-mark-height": `${height}px`,
          "--sheetomatic-ai-mark-width": `${width}px`,
        } as CSSProperties
      }
      role={showLabel ? undefined : "img"}
      aria-label={showLabel ? undefined : "Sheetomatic AI"}
    >
      <Image
        src={LOGO_PATH}
        alt=""
        width={width}
        height={height}
        className="sheetomatic-ai-mark-logo"
        aria-hidden
      />
      {showLabel ? <span className="sheetomatic-ai-mark-label">Sheetomatic AI</span> : null}
    </span>
  );
}
