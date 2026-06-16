import Image from "next/image";

const LOGO_PATH = "/brand/sheetomatic-ai-logo.png";

type Props = {
  size?: number;
  showLabel?: boolean;
  className?: string;
};

export function SheetomaticAiMark({
  size = 18,
  showLabel = false,
  className,
}: Props) {
  const rootClass = ["sheetomatic-ai-mark", className].filter(Boolean).join(" ");

  return (
    <span
      className={rootClass}
      role={showLabel ? undefined : "img"}
      aria-label={showLabel ? undefined : "Sheetomatic AI"}
    >
      <Image
        src={LOGO_PATH}
        alt=""
        width={size}
        height={size}
        className="sheetomatic-ai-mark-logo"
        aria-hidden
      />
      {showLabel ? <span className="sheetomatic-ai-mark-label">Sheetomatic AI</span> : null}
    </span>
  );
}
