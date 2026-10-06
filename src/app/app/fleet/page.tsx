import { FleetDashboard } from "@/components/fleet/fleet-dashboard";
import { getFleetBoard } from "@/lib/fleet/board";
import { requireSession } from "@/lib/require-session";
import "@/components/fleet/fleet-dashboard.css";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  const user = await requireSession("MANAGER");
  const board = await getFleetBoard(user.organizationId);
  return <FleetDashboard initial={board} />;
}
