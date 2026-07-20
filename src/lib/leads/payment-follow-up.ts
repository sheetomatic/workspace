import { prisma } from "@/lib/db";
import { formatInr } from "@/lib/leads/categories";
import { leadHasRequiredContact } from "@/lib/leads/contact-validation";

export type PaymentFollowUpClient = {
  id: string;
  name: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  paymentTotal: number;
  paymentReceived: number;
  paymentDue: number;
  paymentLastDate: string | null;
  canSendWhatsApp: boolean;
};

export function computePaymentDue(total: number, received: number) {
  const due = total - received;
  return due > 0 ? Math.round(due * 100) / 100 : 0;
}

export function formatPaymentAmount(amount: number) {
  return formatInr(amount);
}

export function formatPaymentDateLabel(iso: string | null | undefined) {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function listPaymentFollowUpClients(
  organizationId: string,
): Promise<PaymentFollowUpClient[]> {
  const rows = await prisma.inboundLead.findMany({
    where: {
      organizationId,
      paymentFollowUp: true,
      archivedAt: null,
      mergedIntoId: null,
    },
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      status: true,
      paymentTotal: true,
      paymentReceived: true,
      paymentLastDate: true,
    },
    orderBy: [{ paymentLastDate: "asc" }, { updatedAt: "desc" }],
    take: 500,
  });

  return rows.map((row) => {
    const total = Number(row.paymentTotal ?? 0);
    const received = Number(row.paymentReceived ?? 0);
    const due = computePaymentDue(total, received);
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      company: row.company,
      status: row.status,
      paymentTotal: total,
      paymentReceived: received,
      paymentDue: due,
      paymentLastDate: row.paymentLastDate?.toISOString() ?? null,
      canSendWhatsApp: leadHasRequiredContact(row.phone) && due > 0,
    };
  });
}

/** Amount vars for WhatsApp payment follow-up templates. */
export function paymentFollowUpTemplateVars(lead: {
  paymentTotal?: unknown;
  paymentReceived?: unknown;
  paymentLastDate?: Date | null;
}) {
  const total = Number(lead.paymentTotal ?? 0);
  const received = Number(lead.paymentReceived ?? 0);
  const due = computePaymentDue(total, received);
  return {
    totalPayment: total > 0 ? formatPaymentAmount(total) : "—",
    receivedPayment: received > 0 ? formatPaymentAmount(received) : formatPaymentAmount(0),
    duePayment: due > 0 ? formatPaymentAmount(due) : formatPaymentAmount(0),
    lastPaymentDate: formatPaymentDateLabel(
      lead.paymentLastDate?.toISOString() ?? null,
    ),
  };
}
