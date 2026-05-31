import type { RedlavaResellerPhone } from "@/lib/integrations/redlava-reseller";
import {
  getRedlavaResellerWallet,
  listRedlavaResellerCustomers,
} from "@/lib/integrations/redlava-reseller";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

export async function loadSettingsResellerData() {
  const emptyCustomers = {
    ok: false as const,
    error: "Reseller API unavailable.",
    body: {},
    phones: [] as RedlavaResellerPhone[],
    customers: [] as [],
  };
  const emptyWallet = { ok: false as const, error: "Wallet unavailable.", body: {} };

  const [reseller, wallet] = await Promise.all([
    withTimeout(listRedlavaResellerCustomers(), 4000, emptyCustomers),
    withTimeout(getRedlavaResellerWallet(), 4000, emptyWallet),
  ]);

  return { reseller, wallet };
}
