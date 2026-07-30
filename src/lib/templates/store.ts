import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { getPrimaryOrganization } from "@/lib/platform";
import { TEMPLATE_PRODUCT_SEEDS } from "@/lib/templates/seed-products";
import type { TemplateOrderStatus, TemplateProductType } from "@prisma/client";

export async function seedTemplateProducts() {
  for (const product of TEMPLATE_PRODUCT_SEEDS) {
    await prisma.templateProduct.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        name: product.name,
        type: product.type,
        priceInr: product.priceInr,
        description: product.description,
        sortOrder: product.sortOrder,
        thumbnailUrl: product.thumbnailUrl ?? null,
        copyLink: product.copyLink ?? null,
        active: product.active ?? true,
      },
      update: {
        name: product.name,
        type: product.type,
        priceInr: product.priceInr,
        description: product.description,
        sortOrder: product.sortOrder,
        active: product.active ?? true,
        ...(product.thumbnailUrl !== undefined
          ? { thumbnailUrl: product.thumbnailUrl }
          : {}),
        // Always refresh starter product copy link; keep admin edits for others
        ...(product.copyLink
          ? { copyLink: product.copyLink }
          : {}),
      },
    });
  }

  // Only show real catalog products until you add the next ones.
  const liveSlugs = TEMPLATE_PRODUCT_SEEDS.map((p) => p.slug);
  await prisma.templateProduct.updateMany({
    where: { slug: { notIn: liveSlugs } },
    data: { active: false },
  });

  return TEMPLATE_PRODUCT_SEEDS.length;
}

export async function listActiveTemplateProducts(type?: TemplateProductType) {
  return prisma.templateProduct.findMany({
    where: {
      active: true,
      ...(type ? { type } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      type: true,
      priceInr: true,
      description: true,
      thumbnailUrl: true,
      // copyLink intentionally omitted from public list
    },
  });
}

export async function listAllTemplateProducts() {
  return prisma.templateProduct.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listTemplateOrders(status?: TemplateOrderStatus) {
  return prisma.templateOrder.findMany({
    where: status ? { status } : undefined,
    include: {
      product: {
        select: { id: true, name: true, type: true, priceInr: true, copyLink: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function listPendingTemplateOrdersForLead(inboundLeadId: string) {
  return prisma.templateOrder.findMany({
    where: {
      inboundLeadId,
      status: { in: ["PENDING", "PAYMENT_RECEIVED"] },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          type: true,
          priceInr: true,
          thumbnailUrl: true,
          copyLink: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function mapPendingTemplateOrdersByLeadIds(leadIds: string[]) {
  const ids = [...new Set(leadIds.filter(Boolean))];
  if (ids.length === 0) {
    return new Map<
      string,
      Array<{
        id: string;
        status: TemplateOrderStatus;
        customerEmail: string;
        paymentRef: string | null;
        productName: string;
        priceInr: number;
      }>
    >();
  }

  const rows = await prisma.templateOrder.findMany({
    where: {
      inboundLeadId: { in: ids },
      status: { in: ["PENDING", "PAYMENT_RECEIVED"] },
    },
    include: {
      product: { select: { name: true, priceInr: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const map = new Map<
    string,
    Array<{
      id: string;
      status: TemplateOrderStatus;
      customerEmail: string;
      paymentRef: string | null;
      productName: string;
      priceInr: number;
    }>
  >();

  for (const row of rows) {
    if (!row.inboundLeadId) continue;
    const list = map.get(row.inboundLeadId) ?? [];
    list.push({
      id: row.id,
      status: row.status,
      customerEmail: row.customerEmail,
      paymentRef: row.paymentRef,
      productName: row.product.name,
      priceInr: row.product.priceInr,
    });
    map.set(row.inboundLeadId, list);
  }
  return map;
}

export async function createTemplateOrder(input: {
  productId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string;
  city?: string;
  requirement?: string;
  paymentRef?: string;
  notes?: string;
}) {
  const phone = input.customerPhone.trim();
  if (!phone) {
    throw new Error("Phone / WhatsApp is required.");
  }

  const product = await prisma.templateProduct.findFirst({
    where: { id: input.productId, active: true },
    select: { id: true, name: true, type: true, priceInr: true, slug: true },
  });
  if (!product) {
    throw new Error("Template not found or inactive.");
  }

  const org = await getPrimaryOrganization();
  if (!org) {
    throw new Error("Primary workspace is not configured.");
  }

  const order = await prisma.templateOrder.create({
    data: {
      productId: product.id,
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerPhone: phone,
      company: input.company?.trim() || null,
      city: input.city?.trim() || null,
      requirement: input.requirement?.trim() || null,
      paymentRef: input.paymentRef?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "PENDING",
    },
  });

  const requirement =
    input.requirement?.trim() ||
    `Template purchase: ${product.name} (₹${product.priceInr})`;

  const ingest = await ingestInboundLead({
    organizationId: org.id,
    channel: "API",
    externalId: `template-order:${order.id}`,
    name: input.customerName.trim(),
    phone,
    email: input.customerEmail.trim().toLowerCase(),
    company: input.company?.trim() || null,
    city: input.city?.trim() || null,
    requirement,
    sourceDetail: `Template store · ${product.slug}`,
    pipeValue: product.priceInr,
    status: "PROPOSAL",
    landingPage: "/templates",
    campaign: "template-store",
    createFmsJob: false,
    rawPayload: {
      templateOrderId: order.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      priceInr: product.priceInr,
      paymentRef: input.paymentRef?.trim() || null,
    },
  });

  const leadId = ingest.lead?.id ?? null;
  if (leadId) {
    await prisma.templateOrder.update({
      where: { id: order.id },
      data: { inboundLeadId: leadId },
    });
  }

  return prisma.templateOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      product: { select: { name: true, type: true, priceInr: true, slug: true } },
    },
  });
}

function buildCopyEmail(params: {
  customerName: string;
  productName: string;
  productType: TemplateProductType;
  copyLink: string;
}) {
  const kind =
    params.productType === "APPSHEET"
      ? "AppSheet"
      : params.productType === "SHEETS"
        ? "Google Sheets"
        : "Excel";

  const isMakeACopy = /\/copy\/?(\?|$)/i.test(params.copyLink);

  const steps =
    params.productType === "APPSHEET"
      ? [
          "1. Open the AppSheet copy link below while signed into your Google account.",
          "2. Click Copy app (or follow the prompts to create your own copy).",
          "3. Open your copy and connect your Google account if asked.",
        ]
      : isMakeACopy
        ? [
            "1. Open the Make a copy link below while signed into Google.",
            "2. Click Make a copy and save it to your Drive.",
            "3. Use your private copy — do not request edit access on the master file.",
          ]
        : [
            "1. Open the template link below while signed into Google.",
            "2. Use File → Make a copy to save it to your Drive.",
            "3. Do not request edit access on the master file.",
          ];

  return {
    subject: `Your ${kind} template is ready: ${params.productName}`,
    text: [
      `Hello ${params.customerName},`,
      ``,
      `Payment confirmed. Here is your ${kind} template:`,
      ``,
      params.productName,
      ``,
      isMakeACopy ? `Make a copy link:` : `Copy / access link:`,
      params.copyLink,
      ``,
      `How to use:`,
      ...steps,
      ``,
      `License: private use only (not for resale or redistribution).`,
      ``,
      `Need help? Reply to this email or WhatsApp us.`,
      ``,
      `— Smart Office Templates / Sheetomatic`,
    ].join("\n"),
  };
}

/**
 * Human confirms payment → auto email with copy link → mark fulfilled if email sent.
 */
export async function markTemplatePaymentReceived(params: {
  orderId: string;
  actorUserId: string;
}) {
  const order = await prisma.templateOrder.findUnique({
    where: { id: params.orderId },
    include: { product: true },
  });

  if (!order) {
    return { ok: false as const, message: "Order not found." };
  }
  if (order.status === "CANCELLED") {
    return { ok: false as const, message: "Order is cancelled." };
  }
  if (order.status === "FULFILLED" && order.fulfillmentEmailSentAt) {
    return { ok: true as const, message: "Already fulfilled and emailed." };
  }
  if (!order.product.copyLink?.trim()) {
    return {
      ok: false as const,
      message: "Add the Sheets/AppSheet copy link on the product before confirming payment.",
    };
  }

  const now = new Date();
  await prisma.templateOrder.update({
    where: { id: order.id },
    data: {
      status: "PAYMENT_RECEIVED",
      paymentReceivedAt: order.paymentReceivedAt ?? now,
      paymentReceivedById: params.actorUserId,
    },
  });

  const email = buildCopyEmail({
    customerName: order.customerName,
    productName: order.product.name,
    productType: order.product.type,
    copyLink: order.product.copyLink.trim(),
  });

  const sendResult = await sendPlainEmail({
    toEmail: order.customerEmail,
    subject: email.subject,
    text: email.text,
  });

  if (!sendResult.sent) {
    const reason =
      sendResult.reason === "not_configured"
        ? "Email is not configured (RESEND_API_KEY / TASK_EMAIL_FROM)."
        : `Email API error: ${sendResult.detail ?? "unknown"}`;
    return {
      ok: false as const,
      message: `Payment marked received, but email failed. ${reason}`,
    };
  }

  await prisma.templateOrder.update({
    where: { id: order.id },
    data: {
      status: "FULFILLED",
      fulfillmentEmailSentAt: now,
      fulfilledAt: now,
    },
  });

  return {
    ok: true as const,
    message: `Payment confirmed. Make a copy link emailed to ${order.customerEmail}.`,
    order,
  };
}

/**
 * CRM → Leads: confirm UPI for a template order linked to this lead, email copy link,
 * and record the receipt on the lead.
 */
export async function confirmTemplatePaymentForLead(params: {
  leadId: string;
  organizationId: string;
  actorUserId: string;
  orderId?: string;
}) {
  const order = await prisma.templateOrder.findFirst({
    where: {
      inboundLeadId: params.leadId,
      ...(params.orderId ? { id: params.orderId } : {}),
      status: { in: ["PENDING", "PAYMENT_RECEIVED"] },
    },
    include: { product: true },
    orderBy: { createdAt: "desc" },
  });

  if (!order) {
    return {
      ok: false as const,
      message: "No pending template order linked to this lead.",
    };
  }

  const result = await markTemplatePaymentReceived({
    orderId: order.id,
    actorUserId: params.actorUserId,
  });

  if (!result.ok && result.message !== "Already fulfilled and emailed.") {
    // Still allow CRM receipt if email partially failed after PAYMENT_RECEIVED
    if (!result.message.includes("email failed")) {
      return result;
    }
  }

  const lead = await prisma.inboundLead.findFirst({
    where: { id: params.leadId, organizationId: params.organizationId },
    select: { id: true },
  });
  if (lead) {
    await prisma.inboundLeadPayment.create({
      data: {
        organizationId: params.organizationId,
        leadId: lead.id,
        paymentType: "FULL",
        receivedAmount: order.product.priceInr,
        receivedDate: new Date(),
        paymentMethod: "UPI",
        notes: `Template store · ${order.product.name}${order.paymentRef ? ` · Ref ${order.paymentRef}` : ""}`,
      },
    });
    await prisma.inboundLead.update({
      where: { id: lead.id },
      data: { status: "PAYMENT" },
    });
    await prisma.inboundLeadActivity.create({
      data: {
        organizationId: params.organizationId,
        leadId: lead.id,
        type: "PAYMENT",
        body: `Template payment confirmed · ${order.product.name} · ₹${order.product.priceInr.toLocaleString("en-IN")} · copy link emailed`,
        createdByUserId: params.actorUserId,
      },
    });
  }

  return {
    ok: true as const,
    message:
      result.ok
        ? result.message
        : `CRM payment recorded. ${result.message}`,
    orderId: order.id,
    priceInr: order.product.priceInr,
    productName: order.product.name,
  };
}

export async function upsertTemplateProduct(input: {
  id?: string;
  slug: string;
  name: string;
  type: TemplateProductType;
  priceInr: number;
  description?: string;
  thumbnailUrl?: string;
  copyLink?: string;
  active?: boolean;
  sortOrder?: number;
}) {
  const data = {
    slug: input.slug.trim().toLowerCase(),
    name: input.name.trim(),
    type: input.type,
    priceInr: input.priceInr,
    description: input.description?.trim() || null,
    thumbnailUrl: input.thumbnailUrl?.trim() || null,
    copyLink: input.copyLink?.trim() || null,
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
  };

  if (input.id) {
    return prisma.templateProduct.update({ where: { id: input.id }, data });
  }

  return prisma.templateProduct.upsert({
    where: { slug: data.slug },
    create: data,
    update: data,
  });
}
