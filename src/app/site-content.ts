export const whatsappPhone = "919685788980";

export const whatsappDisplayNumber = "+91 96857 88980";

export const whatsappTel = "+919685788980";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export const whatsappUrl = buildWhatsAppUrl(
  "Hi Sheetomatic, I want to automate my business workflow.",
);

export const consultationUrl = "https://calendar.app.google/MVmguFeQZpMNDTFo9";

export const graphyStoreUrl = "https://sheetomatic.graphy.com/s/store";

/** YouTube channel: Sheetomatic Videos */
export const youtubeChannelUrl = "https://www.youtube.com/@Sheetomatic";

export const youtubeChannelName = "Sheetomatic Videos";

export const siteBrand = {
  name: "Sheetomatic",
  tagline: "Automation and AI Consultancy",
  headerTagline: "Automation and AI for MSME operations",
  logoSrc: "/images/sheetomatic-logo.svg",
  logoAlt: "Sheetomatic logo",
  footerDescription:
    "Automation and AI consultancy for Indian MSMEs - systems your team will actually use.",
  footerBottomLine: "Sheetomatic · sheetomatic.com",
};

export const finalCtaContent = {
  kicker: "Message us on WhatsApp",
  title: "Turn daily chaos into tasks, MIS, and owner control.",
  text: "WhatsApp us to scope your first automation, MIS build, or AI workflow for your business.",
  buttonLabel: "WhatsApp",
};

export const services = [
  {
    title: "MIS & reporting",
    text: "Monthly MIS, data cleanup, owner dashboards, and management reporting.",
  },
  {
    title: "Google Sheets & Apps Script",
    text: "Formulas, automation, approvals, reminders, and recurring reports.",
  },
  {
    title: "AppSheet business apps",
    text: "CRM, inventory, attendance, field apps, and task systems on Sheets.",
  },
  {
    title: "Looker Studio dashboards",
    text: "Daily control views for sales, stock, collections, and KPIs.",
  },
  {
    title: "WhatsApp API & workflows",
    text: "Official API, templates, inbox, and integrations with your stack.",
  },
  {
    title: "Implementation support",
    text: "Discovery, build, training, and ongoing fixes after go-live.",
  },
];

export const whatsappPageHero = {
  eyebrow: "WhatsApp API Solutions",
  title: "Official WhatsApp API for campaigns, inbox, and automation",
  lead:
    "Bulk templates, team inbox, chatbots, and integrations with Google Sheets, CRM, Tally, Busy, and your operating workflows.",
};
