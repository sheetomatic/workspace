import Link from "next/link";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export function FmsDescribeProcessLink({ className }: { className?: string }) {
  return (
    <Link
      href="/app/fms/design/new"
      className={["btn-cta btn-primary ws-sf-btn-primary ws-fms-ai-cta", className]
        .filter(Boolean)
        .join(" ")}
    >
      <SheetomaticAiMark variant="icon" sizes="sm" className="ws-fms-ai-btn-mark" />
      Describe process
    </Link>
  );
}
