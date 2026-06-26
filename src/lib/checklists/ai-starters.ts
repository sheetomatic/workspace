export type PcAiStarter = {
  id: string;
  team: string;
  label: string;
  summary: string;
  prompt: string;
};

export const PC_AI_STARTERS: PcAiStarter[] = [
  {
    id: "gst-monthly",
    team: "Accounts",
    label: "GST return filing",
    summary: "Monthly on 5th - accounts doer",
    prompt:
      "Recurring Process Checklist: GST return filing every month on the 5th. Team Accounts. Proof: filing acknowledgement. Remind via email if overdue.",
  },
  {
    id: "bank-recon",
    team: "Accounts",
    label: "Bank reconciliation",
    summary: "Monthly by 3rd - accounts executive",
    prompt:
      "Monthly PC: Bank statement reconciliation by 3rd of month. Accounts team. Proof: signed reconciliation.",
  },
  {
    id: "attendance-weekly",
    team: "HR",
    label: "Attendance audit",
    summary: "Weekly Monday - HR executive",
    prompt:
      "Weekly PC: Review attendance exceptions and leave balances every Monday. HR team.",
  },
  {
    id: "quality-round",
    team: "Quality",
    label: "Quality round",
    summary: "Weekly with photo proof",
    prompt:
      "Weekly quality checklist with photo proof at each checkpoint. Quality team supervisor.",
  },
  {
    id: "store-stock",
    team: "Store",
    label: "Store stock count",
    summary: "Fortnightly cycle count",
    prompt:
      "Fortnightly store stock cycle count PC. Store in-charge. Proof: count sheet photo.",
  },
  {
    id: "plant-pm",
    team: "Maintenance",
    label: "Preventive maintenance",
    summary: "Weekly equipment checks",
    prompt:
      "Weekly preventive maintenance round: generator, HVAC, safety signage. Maintenance supervisor with photo proof.",
  },
];
