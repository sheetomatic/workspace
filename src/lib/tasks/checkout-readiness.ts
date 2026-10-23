import "server-only";
import { verifiedTasksCheckoutSeller } from "@/lib/templates/checkout";
import { templateGatewayReady } from "@/lib/templates/gateway";

export async function tasksCheckoutReady() {
  if (!templateGatewayReady()) return false;
  try {
    await verifiedTasksCheckoutSeller();
    return true;
  } catch {
    return false;
  }
}
