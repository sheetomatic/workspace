import { FleetDriverClient } from "@/components/fleet/fleet-driver-client";
import { requireSession } from "@/lib/require-session";
import "@/components/fleet/fleet-dashboard.css";

export const dynamic = "force-dynamic";

export default async function FleetDriverPage() {
  await requireSession("STAFF");
  return <FleetDriverClient />;
}
