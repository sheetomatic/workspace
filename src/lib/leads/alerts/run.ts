import { getLeadNurtureConfig } from "@/lib/leads/nurture/config";
import { triggerLeadNurtureEvent } from "@/lib/leads/nurture/run";
import { listCrmAlertCenterItems } from "@/lib/leads/alerts/evaluate";

const ALERT_SEND_BATCH = 8;

/** Auto-send due CRM commercial alerts (payment / quotation / negotiation). */
export async function runLeadAlertQueue(organizationId: string) {
  const config = await getLeadNurtureConfig(organizationId);
  if (!config.enabled) {
    return { scanned: 0, sent: 0 };
  }

  const items = await listCrmAlertCenterItems(organizationId, {
    limit: 40,
    config,
  });
  const due = items.filter((item) => !item.alreadyMessaged).slice(0, ALERT_SEND_BATCH);

  let sent = 0;
  for (const item of due) {
    const result = await triggerLeadNurtureEvent({
      organizationId,
      leadId: item.leadId,
      event: item.event,
    });
    if (result.sent) {
      sent += 1;
    }
  }

  return { scanned: items.length, sent };
}
