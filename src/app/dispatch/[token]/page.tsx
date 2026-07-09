import { notFound } from "next/navigation";
import { DispatchSlipView } from "@/components/saas/dispatch-slip-view";
import { getDispatchSlipByShareToken } from "@/lib/leads/sales-orders";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicDispatchPage({ params }: PageProps) {
  const { token } = await params;
  const slip = await getDispatchSlipByShareToken(token);
  if (!slip) {
    notFound();
  }

  return <DispatchSlipView slip={slip} />;
}
