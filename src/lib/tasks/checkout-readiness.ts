import "server-only";
import { connection } from "next/server";
import { verifiedTasksCheckoutSeller } from "@/lib/templates/checkout";
import { templateGatewayReady } from "@/lib/templates/gateway";

export async function tasksCheckoutReady() {
  await connection();
  if (!templateGatewayReady()) return false;
  try {
    await verifiedTasksCheckoutSeller();
    return true;
  } catch {
    return false;
  }
}
