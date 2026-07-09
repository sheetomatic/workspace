import "server-only";
import { randomBytes } from "node:crypto";

import { buildDispatchPublicUrl as buildDispatchSlipPublicUrl } from "@/lib/leads/dispatch-public-url";

export function createDispatchShareToken() {
  return randomBytes(24).toString("base64url");
}

export { buildDispatchSlipPublicUrl };
