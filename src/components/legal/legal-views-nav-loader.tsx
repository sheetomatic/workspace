import { LegalViewsNav } from "@/components/legal/legal-views-nav";
import { getLegalViewNavCounts } from "@/lib/legal-cases/view-queries";
import type { SessionUser } from "@/lib/auth";

export async function LegalViewsNavLoader({ user }: { user: SessionUser }) {
  const counts = await getLegalViewNavCounts(user);
  return <LegalViewsNav counts={counts} />;
}
