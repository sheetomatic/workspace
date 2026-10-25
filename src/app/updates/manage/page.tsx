import type { Metadata } from "next";
import Link from "next/link";
import { WebsiteUpdatesManage } from "@/components/marketing/website-updates-manage";
import { updatesManageSchema } from "@/lib/website-updates-input";
export const metadata: Metadata = { title: "Email update preferences | Sheetomatic", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function UpdatesManagePage({ searchParams }: { searchParams: Promise<{ action?: string; token?: string }> }) {
  const parsed = updatesManageSchema.safeParse(await searchParams);
  if (!parsed.success) return <main style={{ padding: 32 }}><h1>Invalid email preference link</h1><p>Use the full link from your Sheetomatic email.</p><Link href="/">Back to website</Link></main>;
  return <WebsiteUpdatesManage action={parsed.data.action} token={parsed.data.token} />;
}
