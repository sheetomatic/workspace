"use server";

import type {
  PlanBillingPeriod,
  SubscriptionPaymentMethod,
  WorkspaceModule,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendSubscriptionInvoiceEmail } from "@/lib/billing/email";
import {
  applyWhatsAppApiClientCustomPlan,
  cancelWhatsAppApiClient,
  syncWhatsAppApiClientsFromPanel,
  upsertWhatsAppApiClient,
} from "@/lib/billing/whatsapp-api-clients";
import {
  cancelMonthlyServiceClient,
  upsertMonthlyServiceClient,
} from "@/lib/billing/monthly-service-clients";
import { parseWhatsAppApiClientSpreadsheet } from "@/lib/billing/whatsapp-api-import";
import { sendWhatsAppApiClientReminder } from "@/lib/billing/whatsapp-api-reminders";
import {
  ensureOnboardingTasks,
  ensureOrganizationBilling,
  generateSubscriptionInvoice,
  markOnboardingTask,
  recordSubscriptionPayment,
  voidSubscriptionInvoice,
} from "@/lib/billing/invoices";
import { billableAddonByModule } from "@/lib/billing/catalog";
import { parseRupeesInput } from "@/lib/billing/money";
import { clampModulesToOrg, mergeAllowedModules } from "@/lib/org-plan-presets";
import { syncOrganizationPlanRecord } from "@/lib/organization-plan";
import { canManageSuperAdmins } from "@/lib/platform";
import { resolveMemberModules } from "@/lib/workspace-modules";

export type BillingActionState = { ok: boolean; message: string };

async function requirePlatformAdmin() {
  const user = await getSessionUser();
  if (!user || !canManageSuperAdmins(user, user.organizationSlug)) {
    return null;
  }
  return user;
}

function revalidateBilling(organizationId?: string) {
  revalidatePath("/app/clients");
  revalidatePath("/app/billing");
  if (organizationId) {
    revalidatePath(`/app/clients/${organizationId}`);
  }
}

export async function updateClientBillingAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can edit client billing." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId) {
    return { ok: false, message: "Workspace not found." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, plan: true, product: true, allowedModules: true, isPrimary: true },
  });
  if (!organization || organization.isPrimary) {
    return { ok: false, message: "Workspace not found." };
  }

  const monthly = parseRupeesInput(String(formData.get("monthlyRate") ?? ""));
  const extra = parseRupeesInput(String(formData.get("extraUserRate") ?? ""));
  const included = Number(formData.get("includedUsers") ?? "");
  const gst = Number(formData.get("gstPercent") ?? "18");
  const billingPeriod = String(formData.get("billingPeriod") ?? "MONTHLY");
  const renewalRaw = String(formData.get("renewalAt") ?? "").trim();

  if (monthly === null || extra === null) {
    return { ok: false, message: "Enter valid rupee amounts." };
  }
  if (!Number.isFinite(included) || included < 0) {
    return { ok: false, message: "Enter included users." };
  }
  if (!Number.isFinite(gst) || gst < 0 || gst > 40) {
    return { ok: false, message: "GST percent must be between 0 and 40." };
  }
  if (billingPeriod !== "MONTHLY" && billingPeriod !== "ANNUAL") {
    return { ok: false, message: "Choose monthly or annual billing." };
  }

  await ensureOrganizationBilling(organization);
  await prisma.organizationBilling.update({
    where: { organizationId },
    data: {
      monthlyRatePaise: monthly,
      extraUserMonthlyPaise: extra,
      includedUsers: Math.round(included),
      gstPercent: Math.round(gst),
      billingEmail: String(formData.get("billingEmail") ?? "").trim() || null,
      billingName: String(formData.get("billingName") ?? "").trim() || null,
      gstin: String(formData.get("gstin") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
    },
  });

  const renewalAt = renewalRaw ? new Date(`${renewalRaw}T00:00:00.000Z`) : undefined;
  await prisma.organization.update({
    where: { id: organizationId },
    data: { billingPeriod: billingPeriod as PlanBillingPeriod },
  });
  await syncOrganizationPlanRecord(organizationId, {
    billingPeriod: billingPeriod as PlanBillingPeriod,
    renewalAt,
  });
  await markOnboardingTask(organizationId, "billing_set", true, user.id);
  await markOnboardingTask(organizationId, "sale_locked", true, user.id);

  revalidateBilling(organizationId);
  return { ok: true, message: "Billing plan saved." };
}

export async function deleteClientBillingPlanAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can delete a billing plan." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  if (!organizationId) {
    return { ok: false, message: "Workspace not found." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isPrimary: true, billing: { select: { id: true } } },
  });
  if (!organization || organization.isPrimary) {
    return { ok: false, message: "Workspace not found." };
  }

  const openInvoice = await prisma.subscriptionInvoice.findFirst({
    where: {
      organizationId,
      status: { in: ["DRAFT", "SENT", "OVERDUE"] },
    },
    select: { number: true },
  });
  if (openInvoice) {
    return {
      ok: false,
      message: `Void or collect ${openInvoice.number} before deleting the plan.`,
    };
  }

  await prisma.organizationBilling.upsert({
    where: { organizationId },
    create: {
      organizationId,
      monthlyRatePaise: 0,
      extraUserMonthlyPaise: 0,
      includedUsers: 0,
    },
    update: {
      monthlyRatePaise: 0,
      extraUserMonthlyPaise: 0,
      includedUsers: 0,
    },
  });

  await syncOrganizationPlanRecord(organizationId, { renewalAt: null });
  await markOnboardingTask(organizationId, "billing_set", false, user.id);

  revalidateBilling(organizationId);
  return { ok: true, message: "Billing plan removed. Invoices already issued stay on the record." };
}

async function syncMembershipModulesToOrg(
  organizationId: string,
  allowedModules: WorkspaceModule[],
) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    select: { id: true, role: true, modules: true },
  });
  for (const membership of memberships) {
    const modules =
      membership.role === "OWNER" || membership.role === "ADMIN"
        ? allowedModules
        : clampModulesToOrg(
            resolveMemberModules(membership.role, membership.modules),
            allowedModules,
          );
    await prisma.membership.update({
      where: { id: membership.id },
      data: { modules },
    });
  }
}

export async function addClientAddonsAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can add client add-ons." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const selected = formData
    .getAll("addon")
    .map((value) => String(value))
    .map((module) => billableAddonByModule(module as WorkspaceModule))
    .filter((addon): addon is NonNullable<typeof addon> => Boolean(addon));

  if (!organizationId || selected.length === 0) {
    return { ok: false, message: "Choose at least one add-on service." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isPrimary: true, allowedModules: true },
  });
  if (!organization || organization.isPrimary) {
    return { ok: false, message: "Workspace not found." };
  }

  const allowedModules = mergeAllowedModules(
    organization.allowedModules,
    ...selected.map((addon) => addon.grantModules),
  );
  await prisma.organization.update({
    where: { id: organizationId },
    data: { allowedModules },
  });
  await syncMembershipModulesToOrg(organizationId, allowedModules);
  revalidateBilling(organizationId);
  return {
    ok: true,
    message: `Added ${selected.map((addon) => addon.label).join(", ")}. Next invoice bills those plan rates.`,
  };
}

export async function removeClientAddonAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can remove a client add-on." };
  }

  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const addon = billableAddonByModule(String(formData.get("module") ?? "") as WorkspaceModule);
  if (!organizationId || !addon) {
    return { ok: false, message: "Add-on not found." };
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, isPrimary: true, allowedModules: true },
  });
  if (!organization || organization.isPrimary) {
    return { ok: false, message: "Workspace not found." };
  }

  const allowedModules = organization.allowedModules.filter((module) => module !== addon.module);
  if (allowedModules.length === 0) {
    return { ok: false, message: "Keep at least one service on the workspace." };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { allowedModules },
  });
  await syncMembershipModulesToOrg(organizationId, allowedModules);
  revalidateBilling(organizationId);
  return { ok: true, message: `${addon.label} removed from this client.` };
}

export async function generateClientInvoiceAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can generate invoices." };
  }
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const prorate = formData.get("prorate") === "on";
  const result = await generateSubscriptionInvoice({
    organizationId,
    prorate,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  if (!result.ok) return result;

  revalidateBilling(organizationId);
  return { ok: true, message: `Invoice ${result.invoice.number} drafted.` };
}

export async function sendClientInvoiceAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can send invoices." };
  }
  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          billing: { select: { billingEmail: true } },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            select: { user: { select: { email: true } } },
          },
        },
      },
    },
  });
  if (!invoice || invoice.status === "VOID") {
    return { ok: false, message: "Invoice not found." };
  }
  const toEmail =
    invoice.organization.billing?.billingEmail ??
    invoice.organization.memberships[0]?.user.email;
  if (!toEmail) {
    return { ok: false, message: "Set a billing email or owner email first." };
  }

  const sent = await sendSubscriptionInvoiceEmail({
    toEmail,
    organizationName: invoice.organization.name,
    invoiceNumber: invoice.number,
    invoiceId: invoice.id,
    totalPaise: invoice.totalPaise,
    dueAt: invoice.dueAt,
    kind: "invoice",
  });

  await prisma.subscriptionInvoice.update({
    where: { id: invoice.id },
    data: {
      status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      sentAt: invoice.sentAt ?? new Date(),
    },
  });
  await markOnboardingTask(invoice.organizationId, "first_invoice", true, user.id);

  revalidateBilling(invoice.organizationId);
  if (!sent.sent) {
    return {
      ok: true,
      message: `Marked ${invoice.number} as sent. Email did not go out (${sent.reason}). Share the billing link.`,
    };
  }
  return { ok: true, message: `Invoice ${invoice.number} emailed to ${toEmail}.` };
}

export async function recordClientPaymentAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can record payments." };
  }
  const amount = parseRupeesInput(String(formData.get("amount") ?? ""));
  if (amount === null || amount <= 0) {
    return { ok: false, message: "Enter the amount received." };
  }
  const method = String(formData.get("method") ?? "UPI") as SubscriptionPaymentMethod;
  if (!["UPI", "BANK", "CASH", "OTHER"].includes(method)) {
    return { ok: false, message: "Choose a payment method." };
  }
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const result = await recordSubscriptionPayment({
    invoiceId: String(formData.get("invoiceId") ?? ""),
    organizationId,
    amountPaise: amount,
    method,
    reference: String(formData.get("reference") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    recordedByUserId: user.id,
  });
  if (!result.ok) return result;
  revalidateBilling(organizationId);
  return {
    ok: true,
    message: result.fullyPaid
      ? "Payment recorded. Invoice paid — workspace is active."
      : "Partial payment recorded.",
  };
}

export async function voidClientInvoiceAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can void invoices." };
  }
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const result = await voidSubscriptionInvoice(
    organizationId,
    String(formData.get("invoiceId") ?? ""),
  );
  if (!result.ok) return result;
  revalidateBilling(organizationId);
  return { ok: true, message: "Invoice voided." };
}

export async function addWhatsAppApiClientAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can add WhatsApp API clients." };
  }

  const result = await upsertWhatsAppApiClient({
    name: String(formData.get("name") ?? ""),
    company: String(formData.get("company") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    planId: String(formData.get("planId") ?? ""),
    planKind: String(formData.get("planKind") ?? "") === "OFFICIAL" ? "OFFICIAL" : "UNOFFICIAL",
    customLabel: String(formData.get("customLabel") ?? ""),
    customAmountRupees: String(formData.get("customAmount") ?? ""),
    customDurationDays: String(formData.get("customDurationDays") ?? ""),
    startedAt: String(formData.get("startedAt") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    creditPoints: Number(formData.get("credits") ?? "") || null,
    createdByUserId: user.id,
  });
  if (!result.ok) return result;

  revalidateBilling();
  return {
    ok: true,
    message: result.merged
      ? `${result.client.name} already had this WhatsApp number — details were merged into that client.`
      : `${result.client.name} added. Auto WhatsApp reminders go out 10, 7, 3, and 1 day before expiry.`,
  };
}

export async function importWhatsAppApiClientsAction(
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can upload WhatsApp API clients." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose a CSV or Excel file to upload." };
  }
  if (!/\.(csv|xlsx|xls)$/i.test(file.name)) {
    return { ok: false, message: "Upload a .csv, .xlsx, or .xls file." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "File must be under 5 MB." };
  }

  const parsed = parseWhatsAppApiClientSpreadsheet(Buffer.from(await file.arrayBuffer()));
  const rows = parsed.rows.slice(0, 1000);
  if (!rows.length) {
    return {
      ok: false,
      message: parsed.errors[0] ?? "No valid client rows found in the file.",
    };
  }

  let created = 0;
  let updated = 0;
  const errors = [...parsed.errors];

  for (const input of rows) {
    const result = await upsertWhatsAppApiClient({
      ...input,
      createdByUserId: user.id,
    });
    if (!result.ok) {
      errors.push(`${input.name}: ${result.message}`);
      continue;
    }
    if (result.merged) updated += 1;
    else created += 1;
  }

  if (created + updated === 0) {
    return {
      ok: false,
      message: errors[0] ?? "Could not import any WhatsApp API clients.",
    };
  }

  revalidateBilling();
  const extra =
    parsed.rows.length > 1000 ? " First 1000 rows were imported." : "";
  const failed = errors.length ? ` ${errors.length} row${errors.length === 1 ? "" : "s"} skipped.` : "";
  return {
    ok: true,
    message: `Uploaded ${created} new and updated ${updated} WhatsApp API client${
      created + updated === 1 ? "" : "s"
    }.${extra}${failed}`,
  };
}

export async function applyWhatsAppApiClientPlanAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can apply a plan." };
  }
  const result = await applyWhatsAppApiClientCustomPlan(String(formData.get("clientId") ?? ""), {
    days: Number(formData.get("days") ?? ""),
    credits: Number(formData.get("credits") ?? ""),
  });
  if (!result.ok) return result;
  revalidateBilling();
  return { ok: true, message: `${result.client.name}: ${result.message}` };
}

export async function remindWhatsAppApiClientAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can send reminders." };
  }
  const result = await sendWhatsAppApiClientReminder(String(formData.get("clientId") ?? ""));
  if (!result.ok) return result;
  revalidateBilling();
  const via = [
    result.whatsappSent ? "WhatsApp" : null,
    result.emailSent ? "email" : null,
  ].filter(Boolean);
  return { ok: true, message: `Reminder sent on ${via.join(" and ")}.` };
}

export async function cancelWhatsAppApiClientAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can cancel a client." };
  }
  const result = await cancelWhatsAppApiClient(String(formData.get("clientId") ?? ""));
  if (!result.ok) return result;
  revalidateBilling();
  return { ok: true, message: "WhatsApp API client cancelled. Reminders stopped." };
}

export async function syncWhatsAppApiClientsFromPanelAction(): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can sync the panel." };
  }
  const result = await syncWhatsAppApiClientsFromPanel(user.id);
  if (!result.ok) return { ok: false, message: result.error };
  revalidateBilling();
  return { ok: true, message: result.message };
}


export async function toggleOnboardingTaskAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can update the checklist." };
  }
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const completed = formData.get("completed") === "1";
  if (!organizationId || !key) {
    return { ok: false, message: "Checklist item not found." };
  }
  await ensureOnboardingTasks(organizationId);
  await markOnboardingTask(organizationId, key, completed, user.id);
  revalidateBilling(organizationId);
  return { ok: true, message: completed ? "Step marked done." : "Step reopened." };
}

export async function addMonthlyServiceClientAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can add monthly clients." };
  }
  const result = await upsertMonthlyServiceClient({
    organizationId: user.organizationId,
    createdByUserId: user.id,
    input: {
      inboundLeadId: String(formData.get("inboundLeadId") ?? ""),
      name: String(formData.get("name") ?? ""),
      company: String(formData.get("company") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      category: String(formData.get("category") ?? "TRAINING_GWS"),
      monthlyRateRupees: String(formData.get("monthlyRate") ?? ""),
      startedAt: String(formData.get("startedAt") ?? ""),
      assignedToId: String(formData.get("assignedToId") ?? ""),
      workNote: String(formData.get("workNote") ?? ""),
      notes: String(formData.get("notes") ?? ""),
    },
  });
  if (!result.ok) return result;
  revalidateBilling();
  return {
    ok: true,
    message: result.merged
      ? "Updated the existing monthly client from this lead or number."
      : "Monthly client added. Work is assigned on the lead.",
  };
}

export async function cancelMonthlyServiceClientAction(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const user = await requirePlatformAdmin();
  if (!user) {
    return { ok: false, message: "Only Sheetomatic super admins can stop a monthly client." };
  }
  const result = await cancelMonthlyServiceClient({
    organizationId: user.organizationId,
    id: String(formData.get("clientId") ?? ""),
  });
  if (!result.ok) return result;
  revalidateBilling();
  return { ok: true, message: "Monthly client stopped." };
}
