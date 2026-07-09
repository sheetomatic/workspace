import { requireSession } from "@/lib/require-session";

export default async function SalesOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSession(undefined, { module: "FMS" });
  return <div className="ws-module-layout-main">{children}</div>;
}
