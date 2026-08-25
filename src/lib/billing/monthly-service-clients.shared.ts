export type MonthlyServiceClientRow = {
  id: string;
  inboundLeadId: string | null;
  name: string;
  company: string | null;
  phone: string;
  phoneLabel: string;
  email: string | null;
  category: string;
  categoryLabel: string;
  monthlyRatePaise: number;
  monthlyRateLabel: string;
  startedAt: Date;
  startedLabel: string;
  nextDueAt: Date;
  nextDueLabel: string;
  daysLeft: number;
  daysLeftLabel: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  workNote: string | null;
  notes: string | null;
  dueSoon: boolean;
};

export type MonthlyServiceLeadOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  category: string;
  assignedToId: string | null;
  status: string;
};

export type MonthlyServiceAssigneeOption = {
  id: string;
  name: string;
};
