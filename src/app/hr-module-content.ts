/** HR workspace + services marketing - inspired by enterprise HCM patterns (e.g. Darwinbox). */

export type HrModuleSlug = "attendance-leave" | "field-tracking" | "hiring";

export type HrServicesModule = {
  id: HrModuleSlug;
  name: string;
  tagline: string;
  heroLead: string;
  href: string;
  marketingHref: string;
  workspacePath: string;
  features: string[];
  marketingFeatures: string[];
  processSteps: { step: string; title: string; text: string }[];
  ctaLabel: string;
  whatsappMessage: string;
  darwinboxParity?: string[];
};

export const hrModuleOverview = {
  eyebrow: "HR on Sheetomatic",
  title: "Attendance, field teams, payroll-ready data, and hiring - in your workspace",
  lead:
    "Two focused modules for MSMEs: Attendance & Leave with payroll inputs, and Field Executive Tracking as a separate module. Plus hiring and document workflows for HR.",
  darwinboxNote:
    "Enterprise HCM platforms combine time tracking, leave, payroll, and recruitment on one mobile-first stack. Sheetomatic brings the same ideas to Indian MSMEs with WhatsApp-ready ops and workspace reporting.",
};

export const attendanceLeaveModule: HrServicesModule = {
  id: "attendance-leave",
  name: "Attendance & Leave",
  tagline: "Payroll-ready time tracking",
  heroLead:
    "Geo-fenced check-in, leave approvals, and payroll-ready attendance summaries — built for Indian MSME teams that still run on registers and WhatsApp.",
  href: "/app/hr/attendance",
  marketingHref: "/services/hr/attendance-leave",
  workspacePath: "/app/hr/attendance",
  processSteps: [
    {
      step: "01",
      title: "Scope policies",
      text: "Office radius, shifts, leave types, and who approves — aligned on one call.",
    },
    {
      step: "02",
      title: "Enable & train",
      text: "Geo check-in, leave apply/approve, and manager views in your workspace.",
    },
    {
      step: "03",
      title: "Payroll-ready export",
      text: "Attendance summaries your finance team can trust for salary runs.",
    },
  ],
  marketingFeatures: [
    "Geo-tagged office check-in with radius rules",
    "Leave apply, approve, and balance in one place",
    "Shift-friendly hours with late and early flags",
    "Payroll-ready attendance summaries for salary runs",
  ],
  ctaLabel: "Scope attendance on WhatsApp",
  whatsappMessage:
    "Hi Sheetomatic, I want to scope Attendance & Leave for our team - geo check-in, leave approvals, and payroll-ready summaries.",
  features: [
    "Geo-tagged and geo-fenced check-in (office radius rules)",
    "Facial recognition ready (toggle per org - mobile capture phase next)",
    "Shift-friendly office hours and late/early flags",
    "Leave apply, approve, and balance tracking",
    "Payroll run periods linked to attendance summary",
    "Manager team view and regularization notes",
    "WhatsApp reminders for missing punch (roadmap)",
  ],
  darwinboxParity: [
    "Time & attendance with geo-fencing",
    "Leave policies and approvals",
    "Payroll input from attendance",
    "Employee self-service apply/view balance",
  ],
};

export const fieldTrackingModule: HrServicesModule = {
  id: "field-tracking",
  name: "Field Executive Tracking",
  tagline: "Separate module for sales & service teams",
  heroLead:
    "Client geo check-ins, visit notes, and manager visibility for sales and service teams — separate from office punch, with field-only KPIs.",
  href: "/app/hr/field",
  marketingHref: "/services/hr/field-tracking",
  workspacePath: "/app/hr/field",
  processSteps: [
    {
      step: "01",
      title: "Map field workflow",
      text: "Client visits, check-in rules, and what managers need to see daily.",
    },
    {
      step: "02",
      title: "Roll out to reps",
      text: "Lightweight mobile check-in with client name, purpose, and notes.",
    },
    {
      step: "03",
      title: "Manager dashboards",
      text: "Today's field team on one view — export to Sheets and MIS.",
    },
  ],
  marketingFeatures: [
    "Live geo check-in at each client visit",
    "Client name, purpose, and activity notes",
    "Manager view of today's field team",
    "Separate from office punch - field-only KPIs",
  ],
  ctaLabel: "Scope field tracking on WhatsApp",
  whatsappMessage:
    "Hi Sheetomatic, I want to scope Field Executive Tracking for our sales or service team - client geo check-ins and manager visibility.",
  features: [
    "Live geo check-in at client location",
    "Visit plan vs actual trail on map (phase 2)",
    "Client name, purpose, and activity notes",
    "Separate from office attendance - field-only KPIs",
    "Manager dashboard for today's field team",
    "Export to Executive Meeting (Weekly) / MIS",
  ],
  darwinboxParity: [
    "Field force geo check-in",
    "Visit logging for distributed teams",
    "Manager visibility on team whereabouts",
  ],
};

export const hrHiringModule: HrServicesModule = {
  id: "hiring",
  name: "Hiring & documentation",
  tagline: "Recruit to onboard in workspace",
  heroLead:
    "Job openings, candidate pipeline stages, and document checklists — from applied to hired, with owner assignment and handoff in one workspace.",
  href: "/app/hr/hiring",
  marketingHref: "/services/hr/hiring",
  workspacePath: "/app/hr/hiring",
  processSteps: [
    {
      step: "01",
      title: "Define pipeline",
      text: "Stages, document checklist, and who owns each candidate.",
    },
    {
      step: "02",
      title: "Track interviews",
      text: "Applied → shortlisted → interviewed → offer → hired in one view.",
    },
    {
      step: "03",
      title: "Onboard handoff",
      text: "Documentation complete before the new hire joins the team roster.",
    },
  ],
  marketingFeatures: [
    "Job openings and candidate pipeline stages",
    "Document checklist for resume, ID, and offers",
    "Interview tracking from applied to hired",
    "Owner assignment and handoff per candidate",
  ],
  ctaLabel: "Scope hiring workflow on WhatsApp",
  whatsappMessage:
    "Hi Sheetomatic, I want to scope a simple hiring and documentation workflow for our HR team.",
  features: [
    "Job openings and candidate pipeline stages",
    "Document checklist (resume, ID, offer letter links)",
    "Interview stage tracking (applied to hired)",
    "Owner assignment per candidate",
    "Connect hired candidate to team invite (roadmap)",
    "Policy document sign-off tracking (roadmap)",
  ],
  darwinboxParity: [
    "Applicant tracking basics",
    "Offer and onboarding documentation",
    "Recruitment pipeline visibility",
  ],
};

export const hrWorkspaceModules = [
  attendanceLeaveModule,
  fieldTrackingModule,
  hrHiringModule,
];

export const hrModuleById = Object.fromEntries(
  hrWorkspaceModules.map((mod) => [mod.id, mod]),
) as Record<HrModuleSlug, HrServicesModule>;

export function isHrModuleSlug(slug: string): slug is HrModuleSlug {
  return slug in hrModuleById;
}

export const hrServicesSection = {
  eyebrow: "HR modules",
  title: "Workforce modules built for Indian MSMEs",
  subcopy:
    "Attendance, field visits, and hiring sit in the same Sheetomatic workspace as tasks and MIS. Most owners start with WhatsApp AI and reporting - we enable HR modules once your team is ready.",
  footnote:
    "HR modules are switched on per organization after a short scope call. Need MIS or AI talent on payroll? See our Careers bench.",
  careersHref: "/career",
  careersLabel: "Sheetomatic Careers",
};
