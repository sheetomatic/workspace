/** HR workspace + services marketing - inspired by enterprise HCM patterns (e.g. Darwinbox). */

export const hrModuleOverview = {
  eyebrow: "HR on Sheetomatic",
  title: "Attendance, field teams, payroll-ready data, and hiring - in your workspace",
  lead:
    "Two focused modules for MSMEs: Attendance & Leave with payroll inputs, and Field Executive Tracking as a separate module. Plus hiring and document workflows for HR.",
  darwinboxNote:
    "Enterprise HCM platforms combine time tracking, leave, payroll, and recruitment on one mobile-first stack. Sheetomatic brings the same ideas to Indian MSMEs with WhatsApp-ready ops and Google Sheets export.",
};

export const attendanceLeaveModule = {
  id: "attendance-leave",
  name: "Attendance & Leave",
  tagline: "Payroll-ready time tracking",
  href: "/app/hr/attendance",
  workspacePath: "/app/hr/attendance",
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

export const fieldTrackingModule = {
  id: "field-tracking",
  name: "Field Executive Tracking",
  tagline: "Separate module for sales & service teams",
  href: "/app/hr/field",
  workspacePath: "/app/hr/field",
  features: [
    "Live geo check-in at client location",
    "Visit plan vs actual trail on map (phase 2)",
    "Client name, purpose, and activity notes",
    "Separate from office attendance - field-only KPIs",
    "Manager dashboard for today's field team",
    "Export to Google Sheets / MIS",
  ],
  darwinboxParity: [
    "Field force geo check-in",
    "Visit logging for distributed teams",
    "Manager visibility on team whereabouts",
  ],
};

export const hrHiringModule = {
  id: "hiring",
  name: "Hiring & documentation",
  tagline: "Recruit to onboard in workspace",
  href: "/app/hr/hiring",
  workspacePath: "/app/hr/hiring",
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

export const hrServicesSection = {
  eyebrow: "HR modules",
  title: "Workforce modules built for Indian MSMEs",
  subcopy:
    "Start with attendance and leave, add field tracking when you have feet-on-street teams, and use hiring when HR needs a simple ATS - all inside Sheetomatic workspace.",
};
