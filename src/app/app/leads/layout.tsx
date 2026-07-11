import { requireSession } from "@/lib/require-session";

export default async function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession(undefined, { module: "CRM" });
  return <div className="ws-module-layout-main">{children}</div>;
}
