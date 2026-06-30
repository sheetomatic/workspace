export const termsIndexPage = {
  eyebrow: "Legal",
  title: "Terms & conditions",
  lead: "Please read the terms that apply to Sheetomatic services, products, and subscriptions.",
  sections: [
    {
      href: "/terms/whatsapp-api",
      title: "WhatsApp API subscription",
      text: "Unofficial WhatsApp API integration, Google Sheets setup, annual charges, and recharge plans.",
    },
    {
      href: "/terms/services",
      title: "Professional services",
      text: "Development, training, MIS, automation projects, proposals, and payment terms.",
    },
  ],
} as const;

export const whatsappApiTermsPage = {
  eyebrow: "WhatsApp API",
  title: "Terms and conditions — Unofficial WhatsApp API",
  updated: "June 2026",
  sections: [
    {
      title: "FREE API",
      paragraphs: [
        "Sheetomatic provides direct integration with WhatsApp messaging APIs for sending messages from Google Sheets and connected automations.",
        "The FREE API tier refers to message-sending capability through our integration layer. Platform usage, setup, and annual maintenance may still apply as per your selected plan.",
      ],
    },
    {
      title: "Google Sheets integration & setup",
      paragraphs: [
        "Google Sheets API integration requires a one-time setup fee starting from INR 3,000. The final amount depends on sheet structure, number of templates, triggers, and testing required.",
        "Client must provide admin access to the Google account and WhatsApp number used for integration.",
      ],
    },
    {
      title: "Annual charges",
      paragraphs: [
        "Annual platform charges of INR 1,499 apply for API access and maintenance unless otherwise agreed in writing.",
        "Recharge plans (credits or unlimited) are billed separately as per the selected duration.",
      ],
    },
    {
      title: "Service limitations",
      paragraphs: [
        "This is an unofficial WhatsApp API integration. Meta may change policies or block numbers that violate their terms.",
        "Sheetomatic is not liable for message delivery failures caused by WhatsApp, Meta, or internet outages.",
        "Client is responsible for opt-in consent and compliant use of WhatsApp messaging.",
      ],
    },
    {
      title: "Payments & refunds",
      paragraphs: [
        "Setup and subscription fees are non-refundable once work has started, except where required by law.",
        "Advance payment is required before scheduling integration work.",
      ],
    },
  ],
} as const;

export const servicesTermsPage = {
  eyebrow: "Services",
  title: "Terms and conditions — Professional services",
  updated: "June 2026",
  sections: [
    {
      title: "Quotations & proposals",
      paragraphs: [
        "All proposals and invoices issued by Sheetomatic are valid for 15 days unless extended in writing.",
        "Scope is limited to line items in the approved quotation. Additional requests are quoted separately.",
      ],
    },
    {
      title: "Payment terms",
      paragraphs: [
        "50% advance is required to confirm the order. Balance is due on delivery or go-live as stated on the quotation.",
        "GST is charged extra where applicable. Payments accepted via bank transfer or UPI.",
      ],
    },
    {
      title: "Client responsibilities",
      paragraphs: [
        "Timely access to accounts, data, and stakeholders required for delivery.",
        "Delays caused by missing inputs may extend timelines without penalty to Sheetomatic.",
      ],
    },
    {
      title: "Intellectual property",
      paragraphs: [
        "Upon full payment, client receives rights to custom deliverables created for their project.",
        "Sheetomatic retains rights to reusable frameworks, libraries, and internal tools.",
      ],
    },
    {
      title: "Limitation of liability",
      paragraphs: [
        "Sheetomatic liability is limited to fees paid for the specific engagement.",
        "We are not liable for indirect, consequential, or lost-profit damages.",
      ],
    },
  ],
} as const;
