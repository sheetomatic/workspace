/**
 * HR demo data for Acme Manufacturing: salaries, employee profiles,
 * leave balances, current-month attendance, pending leave, and a draft payroll run.
 * Run: npm run db:seed-acme-hr
 */
import { existsSync, readFileSync } from "fs";
import type {
  AttendanceDayStatus,
  EmploymentType,
  PrismaClient,
  WorkspaceModule,
} from "@prisma/client";
import { PrismaClient as PrismaClientCtor } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const ORG_SLUG = "acme-manufacturing";

const HR_MODULES: WorkspaceModule[] = [
  "TASKS",
  "FMS",
  "HR",
  "IMS",
  "APPROVALS",
  "REPORTS",
];

const SALARIES: Record<string, number> = {
  "owner@acme.demo": 150000,
  "manager@acme.demo": 85000,
  "staff@acme.demo": 45000,
};

const PROFILE_SEED: Record<
  string,
  {
    code: string;
    designation: string;
    employmentType: EmploymentType;
    phone: string;
    pan: string;
    aadhaar: string;
    bankName: string;
    bankAccountNumber: string;
    ifsc: string;
    pfApplicable: boolean;
    uan: string;
    esiApplicable: boolean;
    esiNumber?: string;
    tdsMonthly: number;
  }
> = {
  "owner@acme.demo": {
    code: "ACM-001",
    designation: "Owner / Director",
    employmentType: "FULL_TIME",
    phone: "+91 98100 10001",
    pan: "AABCO1234D",
    aadhaar: "123456789012",
    bankName: "HDFC Bank",
    bankAccountNumber: "50100123456701",
    ifsc: "HDFC0001234",
    pfApplicable: true,
    uan: "100012345678",
    esiApplicable: false,
    tdsMonthly: 5000,
  },
  "manager@acme.demo": {
    code: "ACM-002",
    designation: "Plant Manager",
    employmentType: "FULL_TIME",
    phone: "+91 98100 10002",
    pan: "BBBPM5678E",
    aadhaar: "234567890123",
    bankName: "ICICI Bank",
    bankAccountNumber: "001234567890",
    ifsc: "ICIC0000456",
    pfApplicable: true,
    uan: "100023456789",
    esiApplicable: false,
    tdsMonthly: 2500,
  },
  "staff@acme.demo": {
    code: "ACM-003",
    designation: "Production Executive",
    employmentType: "FULL_TIME",
    phone: "+91 98100 10003",
    pan: "CCCPS9012F",
    aadhaar: "345678901234",
    bankName: "SBI",
    bankAccountNumber: "31234567890",
    ifsc: "SBIN0000789",
    pfApplicable: true,
    uan: "100034567890",
    esiApplicable: true,
    esiNumber: "ESI-ACME-003",
    tdsMonthly: 500,
  },
};

function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) {
      continue;
    }
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) {
        continue;
      }
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function utcNoon(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0, 0));
}

function weekdaysInMonthSoFar(now = new Date()): Date[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const today = now.getUTCDate();
  const dates: Date[] = [];
  for (let day = 1; day <= today; day += 1) {
    const d = utcNoon(year, month, day);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      dates.push(d);
    }
  }
  return dates;
}

function statusForDay(index: number, email: string): AttendanceDayStatus {
  if (email === "staff@acme.demo" && index % 7 === 3) {
    return "ABSENT";
  }
  if (email === "manager@acme.demo" && index % 9 === 5) {
    return "HALF_DAY";
  }
  if (index % 11 === 8) {
    return "ABSENT";
  }
  return "PRESENT";
}

function deriveComponents(gross: number) {
  const basic = Math.round(gross * 0.5 * 100) / 100;
  const hra = Math.round(basic * 0.4 * 100) / 100;
  const specialAllowance = Math.round((gross - basic - hra) * 100) / 100;
  return { basic, hra, specialAllowance };
}

async function ensureHrModule(
  prisma: PrismaClient,
  _organizationId: string,
  membershipId: string,
  role: string,
) {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { modules: true },
  });
  if (!membership) {
    return;
  }
  const next = new Set(membership.modules);
  for (const mod of HR_MODULES) {
    if (role === "VIEWER") {
      continue;
    }
    next.add(mod);
  }
  if (role !== "VIEWER" && !next.has("HR")) {
    next.add("HR");
  }
  await prisma.membership.update({
    where: { id: membershipId },
    data: { modules: [...next] },
  });
}

export async function seedAcmeHr(prisma: PrismaClient, organizationId: string) {
  const year = new Date().getUTCFullYear();
  const weekdays = weekdaysInMonthSoFar();

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { allowedModules: true },
  });
  if (org) {
    const allowed = new Set(org.allowedModules);
    if (allowed.size === 0 || !allowed.has("HR")) {
      const next =
        allowed.size === 0
          ? (["TASKS", "FMS", "HR", "IMS", "APPROVALS", "REPORTS"] as WorkspaceModule[])
          : ([...allowed, "HR"] as WorkspaceModule[]);
      await prisma.organization.update({
        where: { id: organizationId },
        data: { allowedModules: next },
      });
    }
  }

  await prisma.workspaceHrSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      officeLat: 28.4744,
      officeLng: 77.504,
      geoFenceRadiusM: 250,
      workStartTime: "09:30",
      workEndTime: "18:30",
    },
    update: {},
  });

  // Leave policies for the year (ensureLeaveBalances will prefer these).
  const leavePolicyDefaults: Array<{ leaveType: "CASUAL" | "SICK" | "EARNED" | "UNPAID" | "COMP_OFF"; defaultDays: number }> = [
    { leaveType: "CASUAL", defaultDays: 12 },
    { leaveType: "SICK", defaultDays: 12 },
    { leaveType: "EARNED", defaultDays: 15 },
    { leaveType: "UNPAID", defaultDays: 0 },
    { leaveType: "COMP_OFF", defaultDays: 0 },
  ];
  for (const policy of leavePolicyDefaults) {
    await prisma.leavePolicy.upsert({
      where: {
        organizationId_leaveType_year: {
          organizationId,
          leaveType: policy.leaveType,
          year,
        },
      },
      create: {
        organizationId,
        leaveType: policy.leaveType,
        year,
        defaultDays: policy.defaultDays,
      },
      update: { defaultDays: policy.defaultDays },
    });
  }

  // Org holidays for the calendar year (Republic Day, Independence Day, Diwali approx, Holi approx).
  // Optional = employee may work (PRESENT) or take leave — no forced HOLIDAY attendance.
  const holidays: Array<{ month: number; day: number; name: string; isOptional?: boolean }> = [
    { month: 0, day: 26, name: "Republic Day" },
    { month: 2, day: 14, name: "Holi", isOptional: true },
    { month: 7, day: 15, name: "Independence Day" },
    { month: 9, day: 20, name: "Diwali" },
    { month: 9, day: 2, name: "Gandhi Jayanti" },
    { month: 10, day: 1, name: "Diwali (optional)", isOptional: true },
  ];
  for (const h of holidays) {
    const date = utcNoon(year, h.month, h.day);
    await prisma.hrHoliday.upsert({
      where: {
        organizationId_date: { organizationId, date },
      },
      create: {
        organizationId,
        date,
        name: h.name,
        isOptional: h.isOptional === true,
      },
      update: {
        name: h.name,
        isOptional: h.isOptional === true,
      },
    });
  }

  const memberships = await prisma.membership.findMany({
    where: { organizationId, deactivatedAt: null },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  const joining = utcNoon(year - 1, 3, 1);
  const workingDays = weekdays.length || 1;

  for (const membership of memberships) {
    const email = membership.user.email;
    const salary = SALARIES[email];
    const seedProfile = PROFILE_SEED[email];
    await prisma.membership.update({
      where: { id: membership.id },
      data: {
        ...(salary != null
          ? {
              monthlySalary: new Decimal(salary),
              dateOfJoining: joining,
            }
          : {}),
        ...(seedProfile
          ? {
              designation: seedProfile.designation,
              staffCode: seedProfile.code,
              department: "OPERATIONS",
            }
          : {}),
      },
    });
    await ensureHrModule(prisma, organizationId, membership.id, membership.role);

    if (membership.role === "VIEWER") {
      continue;
    }

    if (seedProfile && salary != null) {
      const comps = deriveComponents(salary);
      await prisma.employeeProfile.upsert({
        where: { membershipId: membership.id },
        create: {
          organizationId,
          membershipId: membership.id,
          userId: membership.userId,
          employeeCode: seedProfile.code,
          employmentType: seedProfile.employmentType,
          status: "ACTIVE",
          onboardingStatus: "COMPLETE",
          educationSummary: "B.Tech / Graduate — Acme seed",
          experienceSummary: "3+ years operations — Acme seed",
          phone: seedProfile.phone,
          emergencyContact: "Family · +91 98000 00000",
          address: "Acme Plant, Greater Noida, UP",
          pan: seedProfile.pan,
          aadhaar: seedProfile.aadhaar,
          aadhaarLast4: seedProfile.aadhaar.slice(-4),
          basic: new Decimal(comps.basic),
          hra: new Decimal(comps.hra),
          specialAllowance: new Decimal(comps.specialAllowance),
          esiApplicable: seedProfile.esiApplicable,
          esiNumber: seedProfile.esiNumber ?? null,
          pfApplicable: seedProfile.pfApplicable,
          uan: seedProfile.uan,
          pfNumber: `PF-${seedProfile.code}`,
          taxRegime: "NEW",
          tdsMonthly: new Decimal(seedProfile.tdsMonthly),
          bankName: seedProfile.bankName,
          bankAccountNumber: seedProfile.bankAccountNumber,
          ifsc: seedProfile.ifsc,
        },
        update: {
          employeeCode: seedProfile.code,
          employmentType: seedProfile.employmentType,
          status: "ACTIVE",
          onboardingStatus: "COMPLETE",
          educationSummary: "B.Tech / Graduate — Acme seed",
          experienceSummary: "3+ years operations — Acme seed",
          phone: seedProfile.phone,
          pan: seedProfile.pan,
          aadhaar: seedProfile.aadhaar,
          aadhaarLast4: seedProfile.aadhaar.slice(-4),
          basic: new Decimal(comps.basic),
          hra: new Decimal(comps.hra),
          specialAllowance: new Decimal(comps.specialAllowance),
          esiApplicable: seedProfile.esiApplicable,
          esiNumber: seedProfile.esiNumber ?? null,
          pfApplicable: seedProfile.pfApplicable,
          uan: seedProfile.uan,
          tdsMonthly: new Decimal(seedProfile.tdsMonthly),
          bankName: seedProfile.bankName,
          bankAccountNumber: seedProfile.bankAccountNumber,
          ifsc: seedProfile.ifsc,
        },
      });
    }

    for (const leaveType of ["CASUAL", "SICK", "EARNED", "UNPAID", "COMP_OFF"] as const) {
      const balanceDays =
        leaveType === "CASUAL" || leaveType === "SICK"
          ? 12
          : leaveType === "EARNED"
            ? 15
            : 0;
      await prisma.leaveBalance.upsert({
        where: {
          organizationId_userId_leaveType_year: {
            organizationId,
            userId: membership.userId,
            leaveType,
            year,
          },
        },
        create: {
          organizationId,
          userId: membership.userId,
          leaveType,
          year,
          balanceDays,
          usedDays: 0,
        },
        update: {
          balanceDays,
        },
      });
    }

    for (let i = 0; i < weekdays.length; i += 1) {
      const workDate = weekdays[i]!;
      const status = statusForDay(i, email);
      await prisma.attendanceRecord.upsert({
        where: {
          organizationId_userId_workDate: {
            organizationId,
            userId: membership.userId,
            workDate,
          },
        },
        create: {
          organizationId,
          userId: membership.userId,
          workDate,
          status,
          method: "WEB",
          checkInAt:
            status === "PRESENT" || status === "HALF_DAY"
              ? new Date(workDate.getTime() + 2 * 60 * 60 * 1000)
              : null,
          notes: "Acme HR seed",
        },
        update: {
          status,
          notes: "Acme HR seed",
        },
      });
    }
  }

  const staff = memberships.find((m) => m.user.email === "staff@acme.demo");
  if (staff) {
    const start = new Date();
    start.setUTCHours(12, 0, 0, 0);
    while (start.getUTCDay() === 0 || start.getUTCDay() === 6) {
      start.setUTCDate(start.getUTCDate() + 1);
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    while (end.getUTCDay() === 0 || end.getUTCDay() === 6) {
      end.setUTCDate(end.getUTCDate() + 1);
    }
    let days = 0;
    const cursor = new Date(start);
    while (cursor <= end) {
      const dow = cursor.getUTCDay();
      if (dow !== 0 && dow !== 6) days += 1;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    const existingPending = await prisma.leaveRequest.findFirst({
      where: {
        organizationId,
        userId: staff.userId,
        status: "PENDING",
        leaveType: "CASUAL",
      },
    });
    if (!existingPending) {
      await prisma.leaveRequest.create({
        data: {
          organizationId,
          userId: staff.userId,
          leaveType: "CASUAL",
          startDate: start,
          endDate: end,
          days: Math.max(days, 1),
          reason: "Family function — Acme HR seed",
          status: "PENDING",
        },
      });
    }

    const existingOd = await prisma.attendanceExceptionRequest.findFirst({
      where: {
        organizationId,
        userId: staff.userId,
        status: "PENDING",
        exceptionType: "OD",
      },
    });
    if (!existingOd) {
      const odStart = new Date(start);
      odStart.setUTCDate(odStart.getUTCDate() + 7);
      while (odStart.getUTCDay() === 0 || odStart.getUTCDay() === 6) {
        odStart.setUTCDate(odStart.getUTCDate() + 1);
      }
      odStart.setUTCHours(12, 0, 0, 0);
      await prisma.attendanceExceptionRequest.create({
        data: {
          organizationId,
          userId: staff.userId,
          exceptionType: "OD",
          startDate: odStart,
          endDate: odStart,
          reason: "Client site visit — Acme HR seed",
          status: "PENDING",
        },
      });
    }

    // Pending OFF_DAY_SWAP (Sunday → next Wednesday)
    const existingSwap = await prisma.hrSwapRequest.findFirst({
      where: {
        organizationId,
        userId: staff.userId,
        status: "PENDING",
        swapType: "OFF_DAY_SWAP",
      },
    });
    if (!existingSwap) {
      const fromOff = new Date();
      fromOff.setUTCHours(12, 0, 0, 0);
      while (fromOff.getUTCDay() !== 0) {
        fromOff.setUTCDate(fromOff.getUTCDate() + 1);
      }
      const toWork = new Date(fromOff);
      toWork.setUTCDate(toWork.getUTCDate() + 3); // Wed
      await prisma.membership.update({
        where: { id: staff.id },
        data: { weeklyOffDay: 0 },
      });
      await prisma.hrSwapRequest.create({
        data: {
          organizationId,
          userId: staff.userId,
          swapType: "OFF_DAY_SWAP",
          fromDate: fromOff,
          toDate: toWork,
          reason: "Family event on Wednesday — Acme HR seed swap",
          status: "PENDING",
        },
      });
    }

    // A few live GPS pings for field board / day trail demos
    const pingCount = await prisma.fieldLocationPing.count({
      where: { organizationId, userId: staff.userId },
    });
    if (pingCount < 3) {
      const base = Date.now();
      const coords = [
        { lat: 28.4744, lng: 77.504, ago: 0 },
        { lat: 28.4751, lng: 77.5052, ago: 45_000 },
        { lat: 28.476, lng: 77.5065, ago: 90_000 },
      ];
      for (const c of coords) {
        await prisma.fieldLocationPing.create({
          data: {
            organizationId,
            userId: staff.userId,
            geoLat: c.lat,
            geoLng: c.lng,
            recordedAt: new Date(base - c.ago),
            accuracyM: 12,
            batteryPct: 78,
            isMockLocation: false,
          },
        });
      }
    }

    // Sample field visit with geofence for staff
    const existingVisit = await prisma.fieldVisit.findFirst({
      where: {
        organizationId,
        assigneeUserId: staff.userId,
        clientName: "Acme Client Site — seed",
      },
    });
    if (!existingVisit) {
      await prisma.fieldVisit.create({
        data: {
          organizationId,
          assigneeUserId: staff.userId,
          clientName: "Acme Client Site — seed",
          locationLabel: "Greater Noida Phase 2",
          purpose: "Demo visit with 150m geofence",
          geoLat: 28.4744,
          geoLng: 77.504,
          radiusM: 150,
          status: "PLANNED",
        },
      });
    }
  }

  // Draft payroll run for salary slip demos (idempotent: one seed run per month start)
  const periodStart = weekdays[0] ?? utcNoon(year, new Date().getUTCMonth(), 1);
  const periodEnd = weekdays[weekdays.length - 1] ?? periodStart;
  const existingRun = await prisma.payrollRun.findFirst({
    where: {
      organizationId,
      periodStart,
      notes: { contains: "Acme HR seed payroll" },
    },
    select: { id: true },
  });

  if (!existingRun && weekdays.length > 0) {
    const lines: Array<{
      userId: string;
      presentDays: number;
      leaveDays: number;
      absentDays: number;
      halfDays: number;
      payableDays: number;
      workingDays: number;
      monthlySalary: Decimal;
      earnedSalary: Decimal;
      deductions: Decimal;
      netPay: Decimal;
      notes: string | null;
    }> = [];

    for (const membership of memberships) {
      const salary = SALARIES[membership.user.email];
      if (salary == null) continue;

      let presentDays = 0;
      let leaveDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let payableDays = 0;
      for (let i = 0; i < weekdays.length; i += 1) {
        const status = statusForDay(i, membership.user.email);
        if (status === "PRESENT") {
          presentDays += 1;
          payableDays += 1;
        } else if (status === "HALF_DAY") {
          halfDays += 1;
          payableDays += 0.5;
        } else if (status === "ABSENT") {
          absentDays += 1;
        } else if (status === "ON_LEAVE") {
          leaveDays += 1;
          payableDays += 1;
        }
      }
      const earned = Math.round((salary / workingDays) * payableDays * 100) / 100;
      lines.push({
        userId: membership.userId,
        presentDays,
        leaveDays,
        absentDays,
        halfDays,
        payableDays,
        workingDays,
        monthlySalary: new Decimal(salary),
        earnedSalary: new Decimal(earned),
        deductions: new Decimal(0),
        netPay: new Decimal(earned),
        notes: "Acme HR seed line",
      });
    }

    if (lines.length > 0) {
      const totalGross = lines.reduce((s, l) => s + Number(l.earnedSalary), 0);
      await prisma.payrollRun.create({
        data: {
          organizationId,
          periodStart,
          periodEnd,
          status: "DRAFT",
          employeeCount: lines.length,
          totalGross: new Decimal(Math.round(totalGross * 100) / 100),
          totalNet: new Decimal(Math.round(totalGross * 100) / 100),
          notes: "Acme HR seed payroll — open a line for salary slip",
          lines: {
            create: lines.map((line) => ({
              organizationId,
              userId: line.userId,
              presentDays: line.presentDays,
              leaveDays: line.leaveDays,
              absentDays: line.absentDays,
              halfDays: line.halfDays,
              payableDays: line.payableDays,
              workingDays: line.workingDays,
              monthlySalary: line.monthlySalary,
              earnedSalary: line.earnedSalary,
              deductions: line.deductions,
              netPay: line.netPay,
              notes: line.notes,
            })),
          },
        },
      });
    }
  }

  // Sync HOLIDAY attendance for non-optional weekday holidays
  const activeMembers = memberships.filter((m) => m.role !== "VIEWER");
  const seededHolidays = await prisma.hrHoliday.findMany({
    where: { organizationId, isOptional: false, date: { gte: utcNoon(year, 0, 1), lte: utcNoon(year, 11, 31) } },
  });
  for (const holiday of seededHolidays) {
    const dow = holiday.date.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    for (const membership of activeMembers) {
      await prisma.attendanceRecord.upsert({
        where: {
          organizationId_userId_workDate: {
            organizationId,
            userId: membership.userId,
            workDate: holiday.date,
          },
        },
        create: {
          organizationId,
          userId: membership.userId,
          workDate: holiday.date,
          status: "HOLIDAY",
          method: "WEB",
          notes: `Holiday: ${holiday.name}`,
        },
        update: {
          status: "HOLIDAY",
          notes: `Holiday: ${holiday.name}`,
        },
      });
    }
  }

  const counts = {
    salaries: await prisma.membership.count({
      where: { organizationId, monthlySalary: { gt: 0 } },
    }),
    profiles: await prisma.employeeProfile.count({ where: { organizationId } }),
    leaveBalances: await prisma.leaveBalance.count({ where: { organizationId, year } }),
    leavePolicies: await prisma.leavePolicy.count({ where: { organizationId, year } }),
    holidays: await prisma.hrHoliday.count({ where: { organizationId } }),
    attendance: await prisma.attendanceRecord.count({
      where: {
        organizationId,
        workDate: { gte: weekdays[0] ?? utcNoon(year, new Date().getUTCMonth(), 1) },
      },
    }),
    pendingLeave: await prisma.leaveRequest.count({
      where: { organizationId, status: "PENDING" },
    }),
    pendingOdWfh: await prisma.attendanceExceptionRequest.count({
      where: { organizationId, status: "PENDING" },
    }),
    pendingSwaps: await prisma.hrSwapRequest.count({
      where: { organizationId, status: "PENDING" },
    }),
    fieldPings: await prisma.fieldLocationPing.count({ where: { organizationId } }),
    payrollRuns: await prisma.payrollRun.count({ where: { organizationId } }),
    payrollLines: await prisma.payrollLine.count({ where: { organizationId } }),
  };

  console.log("Acme HR seed complete:", counts);
  return counts;
}

async function main() {
  loadEnvFiles();
  const prisma = new PrismaClientCtor();

  const org = await prisma.organization.findUnique({
    where: { slug: ORG_SLUG },
  });
  if (!org) {
    throw new Error(`Organization not found: ${ORG_SLUG}. Run npm run db:seed first.`);
  }

  await seedAcmeHr(prisma, org.id);
  await prisma.$disconnect();
}

const isDirectRun = process.argv[1]?.includes("seed-acme-hr");

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
