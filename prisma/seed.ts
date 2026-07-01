import { randomUUID } from "crypto";
import {
  MetricTone,
  OrganizationStatus,
  OrgPlan,
  PrismaClient,
  Role,
  TaskDepartment,
  TaskFrequency,
  TaskPriority,
  TaskStatus,
  WorkspaceLinkType,
  WorkspaceModule,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedHingoraniCases } from "./seed-hingorani";
import { seedBciDemo } from "./seed-bci-demo";
import { DEFAULT_BCI_ORG_MODULES } from "../src/lib/workspace-addons.shared";
import { WORKSPACE_MODULES } from "../src/lib/workspace-modules";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

const SUPER_ADMIN = {
  email: "founder@sheetomatic.com",
  name: "Sheetomatic Founder",
  password: process.env.SUPER_ADMIN_PASSWORD ?? "Kalmi@123#",
};

type SeedUser = {
  email: string;
  name: string;
  role: Role;
  orgSlug: string;
  staffCode?: string;
  modules?: WorkspaceModule[];
};

const demoPhones: Record<string, string> = {
  "staff@acme.demo": "919685788980",
  "manager@acme.demo": "919685788980",
};

const memberProfiles: Record<
  string,
  { department: TaskDepartment; designation: string }
> = {
  "owner@acme.demo": { department: TaskDepartment.ADMIN, designation: "Owner" },
  "manager@acme.demo": {
    department: TaskDepartment.OPERATIONS,
    designation: "Operations Manager",
  },
  "staff@acme.demo": {
    department: TaskDepartment.SALES,
    designation: "Sales Executive",
  },
  "viewer@acme.demo": {
    department: TaskDepartment.ACCOUNTS,
    designation: "Accounts Viewer",
  },
  "owner@bakery.demo": {
    department: TaskDepartment.ADMIN,
    designation: "Bakery Owner",
  },
  "admin@hingorani.demo": {
    department: TaskDepartment.ADMIN,
    designation: "Firm Admin",
  },
  "manager@hingorani.demo": {
    department: TaskDepartment.OPERATIONS,
    designation: "Operations Manager",
  },
  "shyam@hingorani.demo": {
    department: TaskDepartment.OPERATIONS,
    designation: "Court desk",
  },
  "mt@hingorani.demo": {
    department: TaskDepartment.OPERATIONS,
    designation: "Section 2 doer",
  },
  "rp@hingorani.demo": {
    department: TaskDepartment.OPERATIONS,
    designation: "Medical desk",
  },
};

const seedUsers: SeedUser[] = [
  {
    email: "owner@acme.demo",
    name: "Ravi Owner",
    role: Role.OWNER,
    orgSlug: "acme-manufacturing",
  },
  {
    email: "manager@acme.demo",
    name: "Priya Manager",
    role: Role.MANAGER,
    orgSlug: "acme-manufacturing",
  },
  {
    email: "staff@acme.demo",
    name: "Amit Staff",
    role: Role.STAFF,
    orgSlug: "acme-manufacturing",
  },
  {
    email: "viewer@acme.demo",
    name: "Neha Viewer",
    role: Role.VIEWER,
    orgSlug: "acme-manufacturing",
  },
  {
    email: "owner@bakery.demo",
    name: "Sunil Bakery Owner",
    role: Role.OWNER,
    orgSlug: "sunrise-bakery",
  },
  {
    email: "admin@hingorani.demo",
    name: "Hingorani Admin",
    role: Role.ADMIN,
    orgSlug: "hingorani",
    modules: [WorkspaceModule.CASES],
  },
  {
    email: "manager@hingorani.demo",
    name: "Office Manager",
    role: Role.MANAGER,
    orgSlug: "hingorani",
    modules: [WorkspaceModule.CASES],
  },
  {
    email: "shyam@hingorani.demo",
    name: "Shyam Kumar",
    role: Role.STAFF,
    orgSlug: "hingorani",
    staffCode: "SHYAM",
    modules: [WorkspaceModule.CASES],
  },
  {
    email: "mt@hingorani.demo",
    name: "MT Desk",
    role: Role.STAFF,
    orgSlug: "hingorani",
    staffCode: "MT",
    modules: [WorkspaceModule.CASES],
  },
  {
    email: "rp@hingorani.demo",
    name: "RP Desk",
    role: Role.STAFF,
    orgSlug: "hingorani",
    staffCode: "RP",
    modules: [WorkspaceModule.CASES],
  },
];

const organizations = [
  {
    name: "Sheetomatic Technologies",
    slug: "sheetomatic-technologies",
    industry: "Automation & AI consultancy",
    status: OrganizationStatus.ACTIVE,
    isPrimary: true,
    plan: OrgPlan.ENTERPRISE,
    allowedModules: [...WORKSPACE_MODULES],
  },
  {
    name: "Acme Manufacturing",
    slug: "acme-manufacturing",
    industry: "Manufacturing",
    status: OrganizationStatus.ACTIVE,
    isPrimary: false,
  },
  {
    name: "Sunrise Bakery",
    slug: "sunrise-bakery",
    industry: "Food & retail",
    status: OrganizationStatus.ONBOARDING,
    isPrimary: false,
  },
  {
    name: "Hingorani Law Firm",
    slug: "hingorani",
    industry: "Law firm — MACT operations",
    status: OrganizationStatus.ACTIVE,
    isPrimary: false,
  },
];

const workspaceLinks: Record<
  string,
  { type: WorkspaceLinkType; label: string; url: string; sortOrder: number }[]
> = {
  "acme-manufacturing": [
    {
      type: WorkspaceLinkType.GOOGLE_SHEET,
      label: "Daily sales & collections",
      url: "https://docs.google.com/spreadsheets/",
      sortOrder: 0,
    },
    {
      type: WorkspaceLinkType.LOOKER_STUDIO,
      label: "Owner MIS dashboard",
      url: "https://lookerstudio.google.com/",
      sortOrder: 1,
    },
    {
      type: WorkspaceLinkType.APPSHEET,
      label: "Field dispatch app",
      url: "https://www.appsheet.com/",
      sortOrder: 2,
    },
    {
      type: WorkspaceLinkType.WHATSAPP,
      label: "Payment follow-up templates",
      url: "https://business.whatsapp.com/",
      sortOrder: 3,
    },
  ],
  "sunrise-bakery": [
    {
      type: WorkspaceLinkType.GOOGLE_SHEET,
      label: "Outlet stock register",
      url: "https://docs.google.com/spreadsheets/",
      sortOrder: 0,
    },
    {
      type: WorkspaceLinkType.GOOGLE_FORM,
      label: "Daily wastage capture",
      url: "https://docs.google.com/forms/",
      sortOrder: 1,
    },
  ],
  "sheetomatic-technologies": [
    {
      type: WorkspaceLinkType.GOOGLE_SHEET,
      label: "Platform operations tracker",
      url: "https://docs.google.com/spreadsheets/",
      sortOrder: 0,
    },
    {
      type: WorkspaceLinkType.LOOKER_STUDIO,
      label: "Client portfolio dashboard",
      url: "https://lookerstudio.google.com/",
      sortOrder: 1,
    },
    {
      type: WorkspaceLinkType.GOOGLE_FORM,
      label: "Lead capture form",
      url: "https://forms.gle/KWSDZty3x4vkgbwX6",
      sortOrder: 2,
    },
  ],
};

async function seedOperationalData(
  organizationId: string,
  slug: string,
  userIds: Record<string, string>,
) {
  await prisma.workspaceKpi.deleteMany({ where: { organizationId } });
  await prisma.workspaceMetricCard.deleteMany({ where: { organizationId } });
  await prisma.workspaceFollowUp.deleteMany({ where: { organizationId } });
  await prisma.workspacePendingPayment.deleteMany({ where: { organizationId } });
  await prisma.workspaceAttentionItem.deleteMany({ where: { organizationId } });
  await prisma.workspaceApproval.deleteMany({ where: { organizationId } });
  await prisma.delegatedTask.deleteMany({ where: { organizationId } });

  if (slug === "acme-manufacturing") {
    await prisma.workspaceMetricCard.createMany({
      data: [
        { organizationId, label: "Payment Calls", value: "8", sortOrder: 0, minRole: Role.VIEWER },
        { organizationId, label: "Trial Calls", value: "5", sortOrder: 1, minRole: Role.VIEWER },
        { organizationId, label: "Complaint Calls", value: "2", sortOrder: 2, minRole: Role.VIEWER },
        { organizationId, label: "Payment Visits", value: "4", sortOrder: 3, minRole: Role.VIEWER },
        { organizationId, label: "Trial Visits", value: "3", sortOrder: 4, minRole: Role.VIEWER },
        { organizationId, label: "GST Visits", value: "1", sortOrder: 5, minRole: Role.VIEWER },
        {
          organizationId,
          label: "Follow-Ups Required",
          value: "6",
          tone: MetricTone.WARNING,
          sortOrder: 6,
          minRole: Role.STAFF,
        },
        {
          organizationId,
          label: "Overdue Follow-Ups",
          value: "4",
          tone: MetricTone.WARNING,
          sortOrder: 7,
          minRole: Role.STAFF,
        },
        {
          organizationId,
          label: "Today Collection",
          value: "Rs. 25,000",
          tone: MetricTone.SUCCESS,
          sortOrder: 8,
          minRole: Role.MANAGER,
        },
        { organizationId, label: "Current Pending", value: "10", sortOrder: 9, minRole: Role.MANAGER },
        { organizationId, label: "Previous Pending", value: "7", sortOrder: 10, minRole: Role.MANAGER },
        {
          organizationId,
          label: "Closed Units",
          value: "15",
          actionLabel: "View",
          actionHref: "/app/reports",
          sortOrder: 11,
          minRole: Role.VIEWER,
        },
      ],
    });

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    await prisma.workspaceFollowUp.createMany({
      data: [
        {
          organizationId,
          clientName: "ABC Industries",
          followUpAt: today,
          remarks: "Payment discussion",
          assigneeUserId: userIds["staff@acme.demo"],
          sortOrder: 0,
        },
        {
          organizationId,
          clientName: "Metro Retail",
          followUpAt: today,
          remarks: "Trial follow-up call",
          sortOrder: 1,
        },
        {
          organizationId,
          clientName: "Sunrise Traders",
          followUpAt: today,
          remarks: "GST visit confirmation",
          sortOrder: 2,
        },
        {
          organizationId,
          clientName: "Delta Logistics",
          followUpAt: today,
          remarks: "Complaint closure",
          sortOrder: 3,
        },
      ],
    });

    await prisma.workspacePendingPayment.createMany({
      data: [
        {
          organizationId,
          clientName: "ABC Industries",
          amount: "Rs. 15,000",
          dueAt: new Date(today.getTime() + 2 * 86400000),
          sortOrder: 0,
        },
        {
          organizationId,
          clientName: "Metro Retail",
          amount: "Rs. 28,500",
          dueAt: new Date(today.getTime() + 5 * 86400000),
          sortOrder: 1,
        },
        {
          organizationId,
          clientName: "Sunrise Traders",
          amount: "Rs. 9,200",
          dueAt: new Date(today.getTime() + 1 * 86400000),
          sortOrder: 2,
        },
        {
          organizationId,
          clientName: "Delta Logistics",
          amount: "Rs. 42,000",
          dueAt: new Date(today.getTime() + 7 * 86400000),
          sortOrder: 3,
        },
      ],
    });

    await prisma.workspaceKpi.createMany({
      data: [
        {
          organizationId,
          label: "Sales today",
          value: "Rs. 2.4L",
          icon: "trending",
          minRole: Role.VIEWER,
          sortOrder: 0,
        },
        {
          organizationId,
          label: "Payments due",
          value: "Rs. 86K",
          icon: "wallet",
          minRole: Role.MANAGER,
          sortOrder: 1,
        },
        {
          organizationId,
          label: "Follow-ups",
          value: "42",
          icon: "message",
          minRole: Role.STAFF,
          sortOrder: 2,
        },
        {
          organizationId,
          label: "Needs action",
          value: "7",
          icon: "clock",
          minRole: Role.STAFF,
          sortOrder: 3,
        },
      ],
    });

    await prisma.workspaceAttentionItem.createMany({
      data: [
        {
          organizationId,
          title: "Sales orders to validate",
          count: 6,
          minRole: Role.STAFF,
          assigneeUserId: userIds["staff@acme.demo"],
          sortOrder: 0,
        },
        {
          organizationId,
          title: "Payment follow-ups",
          count: 11,
          minRole: Role.MANAGER,
          sortOrder: 1,
        },
        {
          organizationId,
          title: "Dispatch exceptions",
          count: 3,
          minRole: Role.MANAGER,
          sortOrder: 2,
        },
        {
          organizationId,
          title: "MIS sign-off",
          count: 1,
          minRole: Role.OWNER,
          sortOrder: 3,
        },
      ],
    });

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await prisma.workspaceApproval.createMany({
      data: [
        {
          organizationId,
          title: "Discount approval - Order #1842",
          department: "Sales",
          pendingSince: twoHoursAgo,
          minRole: Role.MANAGER,
        },
        {
          organizationId,
          title: "Credit note - Metro Retail",
          department: "Accounts",
          pendingSince: fiveHoursAgo,
          minRole: Role.MANAGER,
        },
        {
          organizationId,
          title: "Dispatch hold - SKU-441",
          department: "Operations",
          pendingSince: oneDayAgo,
          minRole: Role.MANAGER,
        },
      ],
    });

    const staffId = userIds["staff@acme.demo"];
    const managerId = userIds["manager@acme.demo"];
    const ownerId = userIds["owner@acme.demo"];

    const dueToday = new Date();
    dueToday.setHours(17, 0, 0, 0);
    const dueTomorrow = new Date(dueToday);
    dueTomorrow.setDate(dueTomorrow.getDate() + 1);
    const dueOverdue = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const dueNextWeek = new Date(dueToday);
    dueNextWeek.setDate(dueNextWeek.getDate() + 7);
    const weeklySeriesId = randomUUID();

    await prisma.delegatedTask.createMany({
      data: [
        {
          organizationId,
          title: "Follow up quotation #1842",
          instructions:
            "Confirm discount with sales manager before dispatch.",
          assigneeUserId: staffId,
          createdById: managerId,
          priority: TaskPriority.HIGH,
          department: TaskDepartment.SALES,
          dueAt: dueTomorrow,
          status: TaskStatus.PENDING,
        },
        {
          organizationId,
          title: "Metro Retail payment reconciliation",
          instructions: "Match bank entries with sheet row 88-102.",
          assigneeUserId: staffId,
          createdById: managerId,
          priority: TaskPriority.MEDIUM,
          department: TaskDepartment.ACCOUNTS,
          dueAt: dueToday,
          status: TaskStatus.IN_PROGRESS,
        },
        {
          organizationId,
          title: "Dispatch hold - SKU-441",
          instructions: "Check stock and release or escalate to operations.",
          assigneeUserId: staffId,
          createdById: ownerId,
          priority: TaskPriority.HIGH,
          department: TaskDepartment.OPERATIONS,
          dueAt: dueOverdue,
          status: TaskStatus.PENDING,
        },
        {
          organizationId,
          title: "Weekly MIS sign-off",
          assigneeUserId: managerId,
          createdById: ownerId,
          priority: TaskPriority.MEDIUM,
          department: TaskDepartment.ADMIN,
          dueAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      ],
    });

    await prisma.delegatedTask.create({
      data: {
        organizationId,
        title: "Weekly payment follow-up - pending accounts",
        instructions: "Call each pending account and update the collection sheet.",
        assigneeUserId: staffId,
        createdById: managerId,
        priority: TaskPriority.HIGH,
        department: TaskDepartment.ACCOUNTS,
        frequency: TaskFrequency.WEEKLY,
        recurrenceWeeklyDays: "1,3,5",
        isRecurring: true,
        seriesId: weeklySeriesId,
        occurrenceNumber: 1,
        nextOccurrenceAt: dueNextWeek,
        remindViaEmail: true,
        remindViaWhatsApp: true,
        dueAt: dueToday,
        status: TaskStatus.PENDING,
      },
    });
    return;
  }

  if (slug === "sunrise-bakery") {
    await prisma.workspaceMetricCard.createMany({
      data: [
        { organizationId, label: "Outlet sales today", value: "Rs. 48K", sortOrder: 0, minRole: Role.VIEWER },
        { organizationId, label: "Stock count pending", value: "2", tone: MetricTone.WARNING, sortOrder: 1, minRole: Role.STAFF },
        { organizationId, label: "Wastage entries", value: "5", sortOrder: 2, minRole: Role.STAFF },
        {
          organizationId,
          label: "Today Collection",
          value: "Rs. 12,400",
          tone: MetricTone.SUCCESS,
          sortOrder: 3,
          minRole: Role.OWNER,
        },
      ],
    });

    const today = new Date();
    today.setHours(14, 0, 0, 0);

    await prisma.workspaceFollowUp.createMany({
      data: [
        {
          organizationId,
          clientName: "Main outlet",
          followUpAt: today,
          remarks: "Stock reconciliation",
          sortOrder: 0,
        },
      ],
    });

    await prisma.workspacePendingPayment.createMany({
      data: [
        {
          organizationId,
          clientName: "Supplier - Flour Co",
          amount: "Rs. 18,000",
          dueAt: new Date(today.getTime() + 3 * 86400000),
          sortOrder: 0,
        },
      ],
    });

    await prisma.workspaceKpi.createMany({
      data: [
        {
          organizationId,
          label: "Outlet sales today",
          value: "Rs. 48K",
          icon: "trending",
          minRole: Role.VIEWER,
          sortOrder: 0,
        },
        {
          organizationId,
          label: "Wastage entries",
          value: "5",
          icon: "clock",
          minRole: Role.STAFF,
          sortOrder: 1,
        },
      ],
    });

    await prisma.workspaceAttentionItem.createMany({
      data: [
        {
          organizationId,
          title: "Stock count pending",
          count: 2,
          minRole: Role.STAFF,
          sortOrder: 0,
        },
        {
          organizationId,
          title: "Supplier payment reminder",
          count: 1,
          minRole: Role.OWNER,
          sortOrder: 1,
        },
      ],
    });

    await prisma.workspaceApproval.createMany({
      data: [
        {
          organizationId,
          title: "Weekly wastage approval",
          department: "Operations",
          pendingSince: new Date(Date.now() - 3 * 60 * 60 * 1000),
          minRole: Role.OWNER,
        },
      ],
    });

    const ownerId = userIds["owner@bakery.demo"];
    const dueToday = new Date();
    dueToday.setHours(18, 0, 0, 0);

    await prisma.delegatedTask.create({
      data: {
        organizationId,
        title: "End-of-day stock count",
        instructions: "Update outlet register and flag shortages.",
        assigneeUserId: ownerId,
        createdById: ownerId,
        priority: TaskPriority.MEDIUM,
        department: TaskDepartment.OPERATIONS,
        dueAt: dueToday,
        status: TaskStatus.PENDING,
      },
    });
  }
}

async function seedSheetomaticTechnologies(
  organizationId: string,
  founderUserId: string,
) {
  await prisma.workspaceKpi.deleteMany({ where: { organizationId } });
  await prisma.workspaceMetricCard.deleteMany({ where: { organizationId } });
  await prisma.workspaceAttentionItem.deleteMany({ where: { organizationId } });

  await prisma.workspaceMetricCard.createMany({
    data: [
      {
        organizationId,
        label: "Active client workspaces",
        value: "2",
        sortOrder: 0,
        minRole: Role.VIEWER,
      },
      {
        organizationId,
        label: "Platform admins",
        value: "1",
        sortOrder: 1,
        minRole: Role.ADMIN,
      },
      {
        organizationId,
        label: "Open implementations",
        value: "3",
        tone: MetricTone.WARNING,
        sortOrder: 2,
        minRole: Role.MANAGER,
      },
    ],
  });

  await prisma.workspaceKpi.createMany({
    data: [
      {
        organizationId,
        label: "Client workspaces",
        value: "2",
        icon: "trending",
        minRole: Role.VIEWER,
        sortOrder: 0,
      },
      {
        organizationId,
        label: "Needs review",
        value: "1",
        icon: "clock",
        minRole: Role.ADMIN,
        sortOrder: 1,
      },
    ],
  });

  await prisma.workspaceAttentionItem.createMany({
    data: [
      {
        organizationId,
        title: "New super admin requests",
        count: 0,
        minRole: Role.OWNER,
        assigneeUserId: founderUserId,
        sortOrder: 0,
      },
      {
        organizationId,
        title: "Client onboarding queue",
        count: 1,
        minRole: Role.MANAGER,
        sortOrder: 1,
      },
    ],
  });

  await prisma.workspaceWhatsAppSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      businessPhone: "919685788980",
      redlavaPhoneId: process.env.REDLAVA_PHONE_ID?.trim() || "1102997926228862",
      botLiveAt: new Date(),
    },
    update: {
      businessPhone: "919685788980",
      redlavaPhoneId: process.env.REDLAVA_PHONE_ID?.trim() || "1102997926228862",
      botLiveAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: founderUserId },
    data: { phone: "919329103106" },
  });
}

/** Demo user with memberships in two ACTIVE workspaces (login org-picker E2E). */
async function seedMultiOrgConsultant(passwordHash: string) {
  const consultantEmail = "consultant@demo.sheetomatic.com";
  const user = await prisma.user.upsert({
    where: { email: consultantEmail },
    update: {
      name: "Cross Org Consultant",
      passwordHash,
    },
    create: {
      email: consultantEmail,
      name: "Cross Org Consultant",
      passwordHash,
    },
  });

  const acme = await prisma.organization.findUnique({
    where: { slug: "acme-manufacturing" },
  });
  const hingorani = await prisma.organization.findUnique({
    where: { slug: "hingorani" },
  });

  if (!acme || !hingorani) {
    return;
  }

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: acme.id,
      },
    },
    update: {
      role: Role.MANAGER,
      department: TaskDepartment.OPERATIONS,
      designation: "Operations Consultant",
    },
    create: {
      userId: user.id,
      organizationId: acme.id,
      role: Role.MANAGER,
      department: TaskDepartment.OPERATIONS,
      designation: "Operations Consultant",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: hingorani.id,
      },
    },
    update: {
      role: Role.MANAGER,
      department: TaskDepartment.OPERATIONS,
      designation: "Legal Ops Consultant",
      modules: [WorkspaceModule.CASES],
    },
    create: {
      userId: user.id,
      organizationId: hingorani.id,
      role: Role.MANAGER,
      department: TaskDepartment.OPERATIONS,
      designation: "Legal Ops Consultant",
      modules: [WorkspaceModule.CASES],
    },
  });
}

async function seedTeamHierarchy() {
  const acme = await prisma.organization.findUnique({
    where: { slug: "acme-manufacturing" },
  });

  if (!acme) {
    return;
  }

  const memberships = await prisma.membership.findMany({
    where: { organizationId: acme.id },
    include: { user: { select: { email: true } } },
  });

  const byEmail = new Map(
    memberships.map((membership) => [membership.user.email, membership]),
  );

  const owner = byEmail.get("owner@acme.demo");
  const manager = byEmail.get("manager@acme.demo");
  const staff = byEmail.get("staff@acme.demo");
  const viewer = byEmail.get("viewer@acme.demo");

  if (owner) {
    await prisma.membership.update({
      where: { id: owner.id },
      data: { isDepartmentHead: true },
    });
  }

  if (manager && owner) {
    await prisma.membership.update({
      where: { id: manager.id },
      data: {
        reportingManagerId: owner.id,
        isDepartmentHead: true,
      },
    });
  }

  if (staff && manager) {
    await prisma.membership.update({
      where: { id: staff.id },
      data: { reportingManagerId: manager.id },
    });
  }

  if (viewer && manager) {
    await prisma.membership.update({
      where: { id: viewer.id },
      data: { reportingManagerId: manager.id },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userIds: Record<string, string> = {};

  for (const org of organizations) {
    const organization = await prisma.organization.upsert({
      where: { slug: org.slug },
      update: {
        name: org.name,
        industry: org.industry,
        status: org.status,
        isPrimary: org.isPrimary,
        ...("plan" in org && org.plan
          ? { plan: org.plan, allowedModules: org.allowedModules ?? [] }
          : {}),
      },
      create: org,
    });

    const links = workspaceLinks[org.slug] ?? [];
    await prisma.workspaceLink.deleteMany({
      where: { organizationId: organization.id },
    });
    for (const link of links) {
      await prisma.workspaceLink.create({
        data: {
          organizationId: organization.id,
          ...link,
        },
      });
    }
  }

  for (const entry of seedUsers) {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: entry.orgSlug },
    });

    const phone = demoPhones[entry.email];
    const user = await prisma.user.upsert({
      where: { email: entry.email },
      update: {
        name: entry.name,
        passwordHash,
        ...(phone ? { phone } : {}),
      },
      create: {
        email: entry.email,
        name: entry.name,
        passwordHash,
        phone,
      },
    });

    userIds[entry.email] = user.id;

    const profile = memberProfiles[entry.email];

    await prisma.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: {
        role: entry.role,
        staffCode: entry.staffCode ?? null,
        modules: entry.modules ?? [],
        ...(profile
          ? { department: profile.department, designation: profile.designation }
          : {}),
      },
      create: {
        userId: user.id,
        organizationId: organization.id,
        role: entry.role,
        staffCode: entry.staffCode ?? null,
        modules: entry.modules ?? [],
        department: profile?.department ?? TaskDepartment.GENERAL,
        designation: profile?.designation ?? entry.role,
      },
    });
  }

  await seedTeamHierarchy();
  await seedMultiOrgConsultant(passwordHash);

  for (const org of organizations) {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: org.slug },
    });
    await seedOperationalData(organization.id, org.slug, userIds);
  }

  const superAdminHash = await bcrypt.hash(SUPER_ADMIN.password, 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: SUPER_ADMIN.email },
    update: {
      name: SUPER_ADMIN.name,
      passwordHash: superAdminHash,
      isSuperAdmin: true,
    },
    create: {
      email: SUPER_ADMIN.email,
      name: SUPER_ADMIN.name,
      passwordHash: superAdminHash,
      isSuperAdmin: true,
    },
  });

  const primaryOrganization = await prisma.organization.findUniqueOrThrow({
    where: { slug: "sheetomatic-technologies" },
  });

  await prisma.organization.updateMany({
    where: { slug: { not: "sheetomatic-technologies" } },
    data: { isPrimary: false },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: superAdminUser.id,
        organizationId: primaryOrganization.id,
      },
    },
    update: {
      role: Role.OWNER,
      department: TaskDepartment.ADMIN,
      designation: "Founder & Super Admin",
      modules: [...WORKSPACE_MODULES],
    },
    create: {
      userId: superAdminUser.id,
      organizationId: primaryOrganization.id,
      role: Role.OWNER,
      department: TaskDepartment.ADMIN,
      designation: "Founder & Super Admin",
      modules: [...WORKSPACE_MODULES],
    },
  });

  await seedSheetomaticTechnologies(primaryOrganization.id, superAdminUser.id);

  const hingorani = await prisma.organization.findUnique({
    where: { slug: "hingorani" },
  });
  if (hingorani) {
    await seedHingoraniCases(prisma, hingorani.id);
  }

  await seedBciDemo();

  console.log("Seed complete. Demo password for all accounts:", DEMO_PASSWORD);
  console.log("Super admin:", SUPER_ADMIN.email, "@ sheetomatic-technologies");
  console.log("Hingorani cases workspace: admin@hingorani.demo @ hingorani");
  console.log("BCI FMS demo: owner@bci.demo @ bci-demo (password:", DEMO_PASSWORD + ")");
  console.log("Accounts:");
  for (const entry of seedUsers) {
    console.log(`  ${entry.email} (${entry.role} @ ${entry.orgSlug})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
