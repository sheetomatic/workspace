import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";

/** Employee PF contribution — 12% of Basic (EPF Act). */
export const PF_EMPLOYEE_RATE = 0.12;

/** Employee ESI contribution — 0.75% of gross wages (ESIC). */
export const ESI_EMPLOYEE_RATE = 0.0075;

export type SalarySlipLineItem = {
  key: string;
  label: string;
  amount: number;
};

export type SalarySlipData = {
  lineId: string;
  runId: string;
  organization: {
    name: string;
    /** Same Organization.logoUrl field used by invoices / quotations. */
    logoUrl: string | null;
  };
  employee: {
    userId: string;
    name: string;
    email: string;
    employeeCode: string | null;
    designation: string | null;
    department: string | null;
    panMasked: string | null;
    uan: string | null;
    pfNumber: string | null;
    esiNumber: string | null;
    bankName: string | null;
    bankAccountMasked: string | null;
    ifsc: string | null;
  };
  period: {
    start: string;
    end: string;
    label: string;
  };
  attendance: {
    presentDays: number;
    leaveDays: number;
    absentDays: number;
    halfDays: number;
    payableDays: number;
    workingDays: number;
  };
  monthlySalary: number;
  earnings: SalarySlipLineItem[];
  deductions: SalarySlipLineItem[];
  totals: {
    grossEarnings: number;
    totalDeductions: number;
    netPay: number;
  };
  /** Documented statutory / product assumptions for the slip footer. */
  assumptions: string[];
  notes: string | null;
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function maskPan(pan: string | null | undefined): string | null {
  if (!pan || pan.length < 4) {
    return pan ?? null;
  }
  return `${pan.slice(0, 2)}****${pan.slice(-2)}`;
}

function maskAccount(account: string | null | undefined): string | null {
  if (!account) {
    return null;
  }
  const digits = account.replace(/\s/g, "");
  if (digits.length <= 4) {
    return "****";
  }
  return `${"*".repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

export type SalaryComponentProfile = {
  basic?: number | null;
  hra?: number | null;
  specialAllowance?: number | null;
  pfApplicable?: boolean | null;
  esiApplicable?: boolean | null;
  tdsMonthly?: number | null;
};

/**
 * Derive monthly CTC components.
 * Prefer stored basic/hra/special; else Basic 50% of CTC, HRA 40% of Basic, Special = rest.
 */
export function deriveSalaryComponents(
  monthlySalary: number,
  profile?: Pick<
    SalaryComponentProfile,
    "basic" | "hra" | "specialAllowance"
  > | null,
) {
  const ctc = Math.max(monthlySalary, 0);
  const basic =
    profile?.basic != null && profile.basic > 0
      ? Number(profile.basic)
      : round2(ctc * 0.5);
  const hra =
    profile?.hra != null && profile.hra > 0
      ? Number(profile.hra)
      : round2(basic * 0.4);
  let special =
    profile?.specialAllowance != null && profile.specialAllowance >= 0
      ? Number(profile.specialAllowance)
      : round2(Math.max(ctc - basic - hra, 0));
  // If stored components undershoot CTC, fold remainder into special.
  if (
    profile?.basic == null &&
    profile?.hra == null &&
    profile?.specialAllowance == null
  ) {
    special = round2(Math.max(ctc - basic - hra, 0));
  }
  return { basic, hra, specialAllowance: special };
}

/**
 * Single source of truth for earnings split + statutory deductions + net.
 * Used by payroll generation (persist deductions/net) and salary slip (display).
 */
export function computePayrollPayAmounts(params: {
  monthlySalary: number;
  earnedSalary: number;
  payableDays: number;
  workingDays: number;
  profile?: SalaryComponentProfile | null;
}): {
  earnings: SalarySlipLineItem[];
  deductions: SalarySlipLineItem[];
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  assumptions: string[];
} {
  const monthlySalary = Math.max(params.monthlySalary, 0);
  const earnedSalary = round2(Math.max(params.earnedSalary, 0));
  const workingDays = Math.max(params.workingDays, 1);
  const payableDays = Math.max(params.payableDays, 0);
  const ratio =
    monthlySalary > 0 ? earnedSalary / monthlySalary : payableDays / workingDays;

  const components = deriveSalaryComponents(monthlySalary, params.profile);
  const earnedBasic = round2(components.basic * ratio);
  const earnedHra = round2(components.hra * ratio);
  const earnedSpecial = round2(components.specialAllowance * ratio);
  // Align gross to payroll earned (absorb rounding into special).
  const componentSum = earnedBasic + earnedHra + earnedSpecial;
  const specialAdjusted = round2(earnedSpecial + (earnedSalary - componentSum));

  const earnings: SalarySlipLineItem[] = [
    { key: "basic", label: "Basic", amount: earnedBasic },
    { key: "hra", label: "HRA", amount: earnedHra },
    {
      key: "special",
      label: "Special Allowance",
      amount: Math.max(specialAdjusted, 0),
    },
  ];

  const grossEarnings = round2(
    earnings.reduce((sum, row) => sum + row.amount, 0),
  );

  const deductions: SalarySlipLineItem[] = [];
  const assumptions: string[] = [
    "Earnings prorated from monthly CTC by payable ÷ working days (matches payroll earned salary).",
    "Default CTC split when components unset: Basic 50% of CTC, HRA 40% of Basic, Special = remainder.",
  ];

  if (params.profile?.pfApplicable) {
    const pf = round2(earnedBasic * PF_EMPLOYEE_RATE);
    deductions.push({ key: "pf", label: "Provident Fund (Employee)", amount: pf });
    assumptions.push(
      `PF employee contribution ${PF_EMPLOYEE_RATE * 100}% of Basic (EPF).`,
    );
  }

  if (params.profile?.esiApplicable) {
    const esi = round2(grossEarnings * ESI_EMPLOYEE_RATE);
    deductions.push({
      key: "esi",
      label: "ESI (Employee)",
      amount: esi,
    });
    assumptions.push(
      `ESI employee contribution ${ESI_EMPLOYEE_RATE * 100}% of gross earnings (ESIC).`,
    );
  }

  const tdsMonthly =
    params.profile?.tdsMonthly != null ? Number(params.profile.tdsMonthly) : 0;
  if (tdsMonthly > 0) {
    const tds = round2(tdsMonthly * (payableDays / workingDays));
    deductions.push({ key: "tds", label: "TDS", amount: tds });
    assumptions.push(
      "TDS = configured monthly TDS × (payable days ÷ working days).",
    );
  }

  const totalDeductions = round2(
    deductions.reduce((sum, row) => sum + row.amount, 0),
  );
  const netPay = round2(grossEarnings - totalDeductions);

  return {
    earnings,
    deductions,
    grossEarnings,
    totalDeductions,
    netPay,
    assumptions,
  };
}

export function canViewSalarySlip(params: {
  role: Role;
  viewerUserId: string;
  lineUserId: string;
}) {
  if (hasMinimumRole(params.role, "ADMIN")) {
    return true;
  }
  return params.viewerUserId === params.lineUserId;
}

/**
 * Build a printable salary slip for a payroll line.
 * ACL: caller must enforce ADMIN+ or self via canViewSalarySlip before/after.
 */
export async function getSalarySlipData(
  organizationId: string,
  lineId: string,
  viewer?: { userId: string; role: Role },
): Promise<SalarySlipData | null> {
  const line = await prisma.payrollLine.findFirst({
    where: { id: lineId, organizationId },
    include: {
      payrollRun: {
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          organization: { select: { name: true, logoUrl: true } },
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!line) {
    return null;
  }

  if (
    viewer &&
    !canViewSalarySlip({
      role: viewer.role,
      viewerUserId: viewer.userId,
      lineUserId: line.userId,
    })
  ) {
    return null;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: line.userId,
        organizationId,
      },
    },
    select: {
      designation: true,
      department: true,
      employeeProfile: {
        select: {
          employeeCode: true,
          pan: true,
          basic: true,
          hra: true,
          specialAllowance: true,
          pfApplicable: true,
          pfNumber: true,
          uan: true,
          esiApplicable: true,
          esiNumber: true,
          tdsMonthly: true,
          bankName: true,
          bankAccountNumber: true,
          ifsc: true,
        },
      },
    },
  });

  const profile = membership?.employeeProfile;
  const monthlySalary = Number(line.monthlySalary);
  const earnedSalary = Number(line.earnedSalary);
  const workingDays = Number(line.workingDays) || 1;
  const payableDays = Number(line.payableDays);

  const pay = computePayrollPayAmounts({
    monthlySalary,
    earnedSalary,
    payableDays,
    workingDays,
    profile: {
      basic: profile?.basic != null ? Number(profile.basic) : null,
      hra: profile?.hra != null ? Number(profile.hra) : null,
      specialAllowance:
        profile?.specialAllowance != null
          ? Number(profile.specialAllowance)
          : null,
      pfApplicable: profile?.pfApplicable ?? false,
      esiApplicable: profile?.esiApplicable ?? false,
      tdsMonthly:
        profile?.tdsMonthly != null ? Number(profile.tdsMonthly) : null,
    },
  });

  // Prefer persisted PayrollLine totals when they already reflect statutory
  // deductions (post-fix runs). Fall back to shared helper for legacy lines
  // that stored deductions=0 / net=earned while PF/ESI/TDS apply.
  const storedDeductions = Number(line.deductions);
  const storedNet = Number(line.netPay);
  const storedLooksLegacy =
    storedDeductions === 0 &&
    Math.abs(storedNet - earnedSalary) < 0.005 &&
    pay.totalDeductions > 0;
  const totalDeductions = storedLooksLegacy
    ? pay.totalDeductions
    : round2(storedDeductions);
  const netPay = storedLooksLegacy ? pay.netPay : round2(storedNet);
  const earnings = pay.earnings;
  const deductions = pay.deductions;
  const assumptions = pay.assumptions;
  const grossEarnings = pay.grossEarnings;

  const start = ymd(line.payrollRun.periodStart);
  const end = ymd(line.payrollRun.periodEnd);
  const periodLabel = new Date(line.payrollRun.periodStart).toLocaleDateString(
    "en-IN",
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  return {
    lineId: line.id,
    runId: line.payrollRun.id,
    organization: {
      name: line.payrollRun.organization.name,
      logoUrl: line.payrollRun.organization.logoUrl,
    },
    employee: {
      userId: line.user.id,
      name: line.user.name ?? line.user.email,
      email: line.user.email,
      employeeCode: profile?.employeeCode ?? null,
      designation: membership?.designation ?? null,
      department: membership?.department ?? null,
      panMasked: maskPan(profile?.pan),
      uan: profile?.uan ?? null,
      pfNumber: profile?.pfNumber ?? null,
      esiNumber: profile?.esiNumber ?? null,
      bankName: profile?.bankName ?? null,
      bankAccountMasked: maskAccount(profile?.bankAccountNumber),
      ifsc: profile?.ifsc ?? null,
    },
    period: { start, end, label: periodLabel },
    attendance: {
      presentDays: Number(line.presentDays),
      leaveDays: Number(line.leaveDays),
      absentDays: Number(line.absentDays),
      halfDays: Number(line.halfDays),
      payableDays,
      workingDays,
    },
    monthlySalary,
    earnings,
    deductions,
    totals: {
      grossEarnings,
      totalDeductions,
      netPay,
    },
    assumptions,
    notes: line.notes,
  };
}

/** Resolve slip by payroll run + employee userId. */
export async function getSalarySlipDataByRunUser(
  organizationId: string,
  payrollRunId: string,
  userId: string,
  viewer?: { userId: string; role: Role },
): Promise<SalarySlipData | null> {
  const line = await prisma.payrollLine.findFirst({
    where: { organizationId, payrollRunId, userId },
    select: { id: true },
  });
  if (!line) {
    return null;
  }
  return getSalarySlipData(organizationId, line.id, viewer);
}

