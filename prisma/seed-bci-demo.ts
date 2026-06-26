/**
 * BCI alumni demo workspace - 3 split FMS + sample jobs for sales demos.
 * Run: npm run db:seed-bci
 */
import { existsSync, readFileSync } from "fs";
import { randomUUID } from "crypto";
import {
  FmsDesignStatus,
  FmsFormFieldType,
  FmsFormStatus,
  FmsInstanceStatus,
  FmsSlaType,
  FmsStepStatus,
  FmsTemplateStatus,
  OrganizationStatus,
  OrgPlan,
  Prisma,
  PrismaClient,
  Role,
  TaskDepartment,
  TaskPriority,
  TaskStatus,
  WorkspaceModule,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_FMS_ALERT_CONFIG } from "../src/lib/fms/constants";
import { flowStepToTemplateStep } from "../src/lib/fms/flow-design";
import type { FmsFlowchartStep } from "../src/lib/fms/flow-design";
import { FMS_WORKFLOW_TEMPLATES } from "../src/lib/fms/workflow-templates";
import {
  allowedModulesForPlan,
  BCI_GROWTH_LIMITS,
  limitsForPlan,
} from "../src/lib/org-plan-presets";

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

loadEnvFiles();

const prisma = new PrismaClient();

const ORG_SLUG = "bci-demo";
const DEMO_PASSWORD = "demo1234";

const PAYMENT_COLLECTION_TEMPLATE = {
  id: "payment-collection",
  department: "accounts" as const,
  name: "Payment Collection",
  description: "Outstanding invoice follow-up through payment received.",
  steps: [
    {
      stepName: "Log Outstanding",
      ownerRoleLabel: "Accounts",
      howInstructions:
        "Record customer, invoice number, outstanding amount, and due date.",
      tatValue: "4",
      tatUnit: "hours" as const,
    },
    {
      stepName: "Collection Follow-up",
      ownerRoleLabel: "Accounts",
      howInstructions:
        "Call customer, note commitment date, and schedule next follow-up.",
      tatValue: "2",
      tatUnit: "days" as const,
    },
    {
      stepName: "Payment Received",
      ownerRoleLabel: "Accounts",
      howInstructions: "Confirm bank credit and close the collection line.",
      tatValue: "1",
      tatUnit: "days" as const,
    },
  ],
};

type BciUserKey = "owner" | "manager" | "sales" | "accounts" | "ops";

type BciUsers = Record<BciUserKey, string>;

type IntakeFieldDef = {
  fieldKey: string;
  label: string;
  fieldType: FmsFormFieldType;
  required?: boolean;
  options?: string[];
  sortOrder: number;
};

const INTAKE_FIELDS: Record<string, IntakeFieldDef[]> = {
  "sales-lead-to-closure": [
    { fieldKey: "lead_name", label: "Lead name", fieldType: "TEXT", required: true, sortOrder: 0 },
    { fieldKey: "contact", label: "Contact number", fieldType: "PHONE", required: true, sortOrder: 1 },
    {
      fieldKey: "source",
      label: "Lead source",
      fieldType: "ENUM",
      required: true,
      options: ["Referral", "IndiaMART", "Walk-in", "Website"],
      sortOrder: 2,
    },
    { fieldKey: "requirement", label: "Requirement", fieldType: "TEXTAREA", sortOrder: 3 },
    { fieldKey: "expected_value", label: "Expected value (?)", fieldType: "NUMBER", sortOrder: 4 },
  ],
  "payment-collection": [
    { fieldKey: "customer", label: "Customer", fieldType: "TEXT", required: true, sortOrder: 0 },
    { fieldKey: "invoice_no", label: "Invoice no.", fieldType: "TEXT", required: true, sortOrder: 1 },
    { fieldKey: "outstanding", label: "Outstanding (?)", fieldType: "NUMBER", required: true, sortOrder: 2 },
    { fieldKey: "due_date", label: "Due date", fieldType: "DATE", required: true, sortOrder: 3 },
  ],
  "packing-to-dispatch": [
    { fieldKey: "order_no", label: "Order no.", fieldType: "TEXT", required: true, sortOrder: 0 },
    { fieldKey: "customer", label: "Customer", fieldType: "TEXT", required: true, sortOrder: 1 },
    { fieldKey: "packed_qty", label: "Packed qty", fieldType: "NUMBER", required: true, sortOrder: 2 },
  ],
};

const OWNER_BY_ROLE: Record<string, BciUserKey> = {
  Sales: "sales",
  "Sales Manager": "manager",
  "Sales Ops": "sales",
  Manager: "manager",
  Accounts: "accounts",
  Founder: "owner",
  Operations: "ops",
  Packing: "ops",
  Logistics: "ops",
  Warehouse: "ops",
};

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function resolveOwnerId(roleLabel: string, users: BciUsers) {
  const key = OWNER_BY_ROLE[roleLabel] ?? "manager";
  return users[key];
}

function workflowStepsToFlowchart(
  template: (typeof FMS_WORKFLOW_TEMPLATES)[number] | typeof PAYMENT_COLLECTION_TEMPLATE,
  users: BciUsers,
): FmsFlowchartStep[] {
  return template.steps.map((step) => ({
    id: randomUUID(),
    stepName: step.stepName,
    ownerUserId: resolveOwnerId(step.ownerRoleLabel, users),
    ownerRoleLabel: step.ownerRoleLabel,
    howInstructions: step.howInstructions,
    tatValue: step.tatValue,
    tatUnit: step.tatUnit,
  }));
}

async function clearBciFmsData(organizationId: string) {
  await prisma.fmsAuditEvent.deleteMany({ where: { organizationId } });
  await prisma.fmsStepAttachment.deleteMany({
    where: { stepState: { instance: { organizationId } } },
  });
  await prisma.fmsStepState.deleteMany({
    where: { instance: { organizationId } },
  });
  await prisma.fmsInstance.deleteMany({ where: { organizationId } });
  await prisma.fmsFormSubmission.deleteMany({ where: { organizationId } });
  await prisma.fmsTemplateStep.deleteMany({
    where: { template: { organizationId } },
  });
  await prisma.fmsTemplate.deleteMany({ where: { organizationId } });
  await prisma.fmsFormField.deleteMany({
    where: { form: { organizationId } },
  });
  await prisma.fmsForm.deleteMany({ where: { organizationId } });
  await prisma.fmsFlowDesign.deleteMany({ where: { organizationId } });
}

async function provisionWorkflow(params: {
  organizationId: string;
  templateId: string;
  template: (typeof FMS_WORKFLOW_TEMPLATES)[number] | typeof PAYMENT_COLLECTION_TEMPLATE;
  users: BciUsers;
  creatorId: string;
}) {
  const flowSteps = workflowStepsToFlowchart(params.template, params.users);
  const templateSteps = flowSteps.map(flowStepToTemplateStep);
  const intakeFields = INTAKE_FIELDS[params.templateId] ?? [];

  const form = await prisma.fmsForm.create({
    data: {
      organizationId: params.organizationId,
      name: params.template.name,
      description: params.template.description,
      status: FmsFormStatus.ACTIVE,
      createdById: params.creatorId,
      fields: {
        create: intakeFields.map((field) => ({
          sortOrder: field.sortOrder,
          label: field.label,
          fieldKey: field.fieldKey,
          fieldType: field.fieldType,
          required: field.required ?? false,
          options: field.options ?? [],
        })),
      },
    },
  });

  const fmsTemplate = await prisma.fmsTemplate.create({
    data: {
      organizationId: params.organizationId,
      formId: form.id,
      name: `${params.template.name} workflow`,
      status: FmsTemplateStatus.ACTIVE,
      holidayDates: [],
      alertConfig: DEFAULT_FMS_ALERT_CONFIG as Prisma.InputJsonValue,
      createdById: params.creatorId,
      steps: {
        create: templateSteps.map((step, index) => ({
          sortOrder: index,
          stepName: step.stepName,
          roleLabel: step.roleLabel,
          instructions: step.instructions,
          defaultOwnerUserId: step.defaultOwnerUserId,
          slaType: step.slaType as FmsSlaType,
          slaConfig: step.slaConfig as Prisma.InputJsonValue,
          allowMarkDone: step.allowMarkDone,
          allowUpload: step.allowUpload,
          allowNotes: step.allowNotes,
          captureFields: step.captureFields,
        })),
      },
    },
    include: { steps: { orderBy: { sortOrder: "asc" } } },
  });

  await prisma.fmsFlowDesign.create({
    data: {
      organizationId: params.organizationId,
      name: params.template.name,
      description: params.template.description,
      status: FmsDesignStatus.APPROVED,
      steps: flowSteps as unknown as Prisma.InputJsonValue,
      holidayDates: [],
      alertConfig: DEFAULT_FMS_ALERT_CONFIG as Prisma.InputJsonValue,
      formId: form.id,
      createdById: params.creatorId,
      approvedById: params.creatorId,
      approvedAt: new Date(),
      submittedAt: daysAgo(7),
    },
  });

  return { form, template: fmsTemplate };
}

type StepScenario =
  | { status: "PENDING" }
  | { status: "IN_PROGRESS"; plannedAt: Date; startedAt?: Date }
  | { status: "DONE"; plannedAt: Date; actualAt: Date; delayMinutes: number | null };

async function createDemoJob(params: {
  organizationId: string;
  template: { id: string; steps: { id: string; defaultOwnerUserId: string | null }[] };
  formId: string;
  submitterId: string;
  referenceLabel: string;
  values: Record<string, unknown>;
  instanceStatus: FmsInstanceStatus;
  stepScenarios: StepScenario[];
}) {
  const submission = await prisma.fmsFormSubmission.create({
    data: {
      organizationId: params.organizationId,
      formId: params.formId,
      submittedById: params.submitterId,
      values: params.values as Prisma.InputJsonValue,
    },
  });

  const instance = await prisma.fmsInstance.create({
    data: {
      organizationId: params.organizationId,
      templateId: params.template.id,
      submissionId: submission.id,
      referenceLabel: params.referenceLabel,
      status: params.instanceStatus,
      stepStates: {
        create: params.template.steps.map((step, index) => {
          const scenario = params.stepScenarios[index] ?? { status: "PENDING" as const };
          if (scenario.status === "PENDING") {
            return {
              stepId: step.id,
              ownerUserId: step.defaultOwnerUserId,
              status: FmsStepStatus.PENDING,
            };
          }
          if (scenario.status === "IN_PROGRESS") {
            return {
              stepId: step.id,
              ownerUserId: step.defaultOwnerUserId,
              status: FmsStepStatus.IN_PROGRESS,
              plannedAt: scenario.plannedAt,
            };
          }
          return {
            stepId: step.id,
            ownerUserId: step.defaultOwnerUserId,
            status: FmsStepStatus.DONE,
            plannedAt: scenario.plannedAt,
            actualAt: scenario.actualAt,
            delayMinutes: scenario.delayMinutes,
            completedByUserId: step.defaultOwnerUserId,
          };
        }),
      },
    },
  });

  return instance;
}

export async function seedBciDemo(client: PrismaClient = prisma) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const organization = await client.organization.upsert({
    where: { slug: ORG_SLUG },
    update: {
      name: "BCI Demo Trading Co.",
      industry: "Trading & distribution (BCI demo)",
      status: OrganizationStatus.ACTIVE,
      plan: OrgPlan.BCI_GROWTH,
      allowedModules: allowedModulesForPlan(OrgPlan.BCI_GROWTH),
      maxMembers: BCI_GROWTH_LIMITS.maxMembers,
      maxFmsTemplates: BCI_GROWTH_LIMITS.maxFmsTemplates,
    },
    create: {
      name: "BCI Demo Trading Co.",
      slug: ORG_SLUG,
      industry: "Trading & distribution (BCI demo)",
      status: OrganizationStatus.ACTIVE,
      isPrimary: false,
      plan: OrgPlan.BCI_GROWTH,
      allowedModules: allowedModulesForPlan(OrgPlan.BCI_GROWTH),
      maxMembers: limitsForPlan(OrgPlan.BCI_GROWTH).maxMembers,
      maxFmsTemplates: limitsForPlan(OrgPlan.BCI_GROWTH).maxFmsTemplates,
    },
  });

  const userDefs: Array<{
    key: BciUserKey;
    email: string;
    name: string;
    role: Role;
    department: TaskDepartment;
    designation: string;
    modules: WorkspaceModule[];
  }> = [
    {
      key: "owner",
      email: "owner@bci.demo",
      name: "Rajesh Owner",
      role: Role.OWNER,
      department: TaskDepartment.ADMIN,
      designation: "Founder",
      modules: ["TASKS", "FMS", "IMS", "REPORTS", "APPROVALS"],
    },
    {
      key: "manager",
      email: "manager@bci.demo",
      name: "Priya Manager",
      role: Role.MANAGER,
      department: TaskDepartment.OPERATIONS,
      designation: "Operations Manager",
      modules: ["TASKS", "FMS", "IMS", "REPORTS", "APPROVALS"],
    },
    {
      key: "sales",
      email: "sales@bci.demo",
      name: "Amit Sales",
      role: Role.STAFF,
      department: TaskDepartment.SALES,
      designation: "Sales Executive",
      modules: ["TASKS", "FMS"],
    },
    {
      key: "accounts",
      email: "accounts@bci.demo",
      name: "Neha Accounts",
      role: Role.STAFF,
      department: TaskDepartment.ACCOUNTS,
      designation: "Accounts Executive",
      modules: ["TASKS", "FMS"],
    },
    {
      key: "ops",
      email: "ops@bci.demo",
      name: "Vikram Ops",
      role: Role.STAFF,
      department: TaskDepartment.OPERATIONS,
      designation: "Dispatch Coordinator",
      modules: ["TASKS", "FMS"],
    },
  ];

  const users = {} as BciUsers;

  for (const def of userDefs) {
    const user = await client.user.upsert({
      where: { email: def.email },
      update: { name: def.name, passwordHash },
      create: { email: def.email, name: def.name, passwordHash },
    });
    users[def.key] = user.id;

    await client.membership.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
      update: {
        role: def.role,
        department: def.department,
        designation: def.designation,
        modules: def.modules,
      },
      create: {
        userId: user.id,
        organizationId: organization.id,
        role: def.role,
        department: def.department,
        designation: def.designation,
        modules: def.modules,
      },
    });
  }

  const ownerMembership = await client.membership.findFirstOrThrow({
    where: { organizationId: organization.id, userId: users.owner },
  });
  const managerMembership = await client.membership.findFirstOrThrow({
    where: { organizationId: organization.id, userId: users.manager },
  });

  await client.membership.update({
    where: { id: managerMembership.id },
    data: { reportingManagerId: ownerMembership.id, isDepartmentHead: true },
  });

  await clearBciFmsData(organization.id);

  await client.delegatedTask.deleteMany({ where: { organizationId: organization.id } });

  const leadTpl = FMS_WORKFLOW_TEMPLATES.find((t) => t.id === "sales-lead-to-closure")!;
  const dispatchTpl = FMS_WORKFLOW_TEMPLATES.find((t) => t.id === "packing-to-dispatch")!;

  const lead = await provisionWorkflow({
    organizationId: organization.id,
    templateId: leadTpl.id,
    template: leadTpl,
    users,
    creatorId: users.owner,
  });

  const payment = await provisionWorkflow({
    organizationId: organization.id,
    templateId: PAYMENT_COLLECTION_TEMPLATE.id,
    template: PAYMENT_COLLECTION_TEMPLATE,
    users,
    creatorId: users.owner,
  });

  const dispatch = await provisionWorkflow({
    organizationId: organization.id,
    templateId: dispatchTpl.id,
    template: dispatchTpl,
    users,
    creatorId: users.owner,
  });

  // Lead to Closure � 5 jobs
  await createDemoJob({
    organizationId: organization.id,
    template: lead.template,
    formId: lead.form.id,
    submitterId: users.sales,
    referenceLabel: "Metro Retail � ?4.2L",
    values: {
      lead_name: "Metro Retail",
      contact: "9876543210",
      source: "Referral",
      requirement: "Annual supply contract",
      expected_value: 420000,
    },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "IN_PROGRESS", plannedAt: daysFromNow(1) },
      { status: "PENDING" },
      { status: "PENDING" },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: lead.template,
    formId: lead.form.id,
    submitterId: users.sales,
    referenceLabel: "Sunrise Traders � ?1.8L",
    values: {
      lead_name: "Sunrise Traders",
      contact: "9123456780",
      source: "IndiaMART",
      requirement: "Bulk order enquiry",
      expected_value: 180000,
    },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(3), actualAt: daysAgo(2), delayMinutes: null },
      { status: "IN_PROGRESS", plannedAt: daysAgo(1) },
      { status: "PENDING" },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: lead.template,
    formId: lead.form.id,
    submitterId: users.sales,
    referenceLabel: "Delta Logistics � ?9.5L",
    values: {
      lead_name: "Delta Logistics",
      contact: "9988776655",
      source: "Website",
      requirement: "Fleet packaging supplies",
      expected_value: 950000,
    },
    instanceStatus: FmsInstanceStatus.COMPLETED,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(10), actualAt: daysAgo(10), delayMinutes: null },
      { status: "DONE", plannedAt: daysAgo(7), actualAt: daysAgo(7), delayMinutes: null },
      { status: "DONE", plannedAt: daysAgo(5), actualAt: daysAgo(5), delayMinutes: null },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: lead.template,
    formId: lead.form.id,
    submitterId: users.sales,
    referenceLabel: "ABC Industries � ?2.1L",
    values: {
      lead_name: "ABC Industries",
      contact: "9012345678",
      source: "Walk-in",
      requirement: "Trial order",
      expected_value: 210000,
    },
    instanceStatus: FmsInstanceStatus.COMPLETED,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(14), actualAt: daysAgo(13), delayMinutes: 480 },
      { status: "DONE", plannedAt: daysAgo(11), actualAt: daysAgo(10), delayMinutes: 360 },
      { status: "DONE", plannedAt: daysAgo(8), actualAt: daysAgo(7), delayMinutes: 720 },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: lead.template,
    formId: lead.form.id,
    submitterId: users.sales,
    referenceLabel: "Greenfield Exports",
    values: {
      lead_name: "Greenfield Exports",
      contact: "9090909090",
      source: "Referral",
      requirement: "Export packaging",
      expected_value: 650000,
    },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "IN_PROGRESS", plannedAt: hoursAgo(6) },
      { status: "PENDING" },
      { status: "PENDING" },
    ],
  });

  // Payment Collection � 4 jobs
  await createDemoJob({
    organizationId: organization.id,
    template: payment.template,
    formId: payment.form.id,
    submitterId: users.accounts,
    referenceLabel: "INV-1842 � ABC Industries",
    values: {
      customer: "ABC Industries",
      invoice_no: "INV-1842",
      outstanding: 85000,
      due_date: daysAgo(5).toISOString().slice(0, 10),
    },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(4), actualAt: daysAgo(4), delayMinutes: null },
      { status: "IN_PROGRESS", plannedAt: daysAgo(2) },
      { status: "PENDING" },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: payment.template,
    formId: payment.form.id,
    submitterId: users.accounts,
    referenceLabel: "INV-1901 � Metro Retail",
    values: {
      customer: "Metro Retail",
      invoice_no: "INV-1901",
      outstanding: 42000,
      due_date: daysFromNow(3).toISOString().slice(0, 10),
    },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "IN_PROGRESS", plannedAt: daysFromNow(1) },
      { status: "PENDING" },
      { status: "PENDING" },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: payment.template,
    formId: payment.form.id,
    submitterId: users.accounts,
    referenceLabel: "INV-1777 � Sunrise Traders",
    values: {
      customer: "Sunrise Traders",
      invoice_no: "INV-1777",
      outstanding: 28000,
      due_date: daysAgo(12).toISOString().slice(0, 10),
    },
    instanceStatus: FmsInstanceStatus.COMPLETED,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(11), actualAt: daysAgo(11), delayMinutes: null },
      { status: "DONE", plannedAt: daysAgo(8), actualAt: daysAgo(8), delayMinutes: null },
      { status: "DONE", plannedAt: daysAgo(6), actualAt: daysAgo(6), delayMinutes: null },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: payment.template,
    formId: payment.form.id,
    submitterId: users.accounts,
    referenceLabel: "INV-1920 � Delta Logistics",
    values: {
      customer: "Delta Logistics",
      invoice_no: "INV-1920",
      outstanding: 156000,
      due_date: daysAgo(1).toISOString().slice(0, 10),
    },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(3), actualAt: daysAgo(3), delayMinutes: null },
      { status: "IN_PROGRESS", plannedAt: hoursAgo(8) },
      { status: "PENDING" },
    ],
  });

  // Packing to Dispatch � 4 jobs
  await createDemoJob({
    organizationId: organization.id,
    template: dispatch.template,
    formId: dispatch.form.id,
    submitterId: users.ops,
    referenceLabel: "SO-4412 � Metro Retail",
    values: { order_no: "SO-4412", customer: "Metro Retail", packed_qty: 120 },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(1), actualAt: daysAgo(1), delayMinutes: null },
      { status: "IN_PROGRESS", plannedAt: daysAgo(1) },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: dispatch.template,
    formId: dispatch.form.id,
    submitterId: users.ops,
    referenceLabel: "SO-4398 � ABC Industries",
    values: { order_no: "SO-4398", customer: "ABC Industries", packed_qty: 80 },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "IN_PROGRESS", plannedAt: daysFromNow(1) },
      { status: "PENDING" },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: dispatch.template,
    formId: dispatch.form.id,
    submitterId: users.ops,
    referenceLabel: "SO-4355 � Sunrise Traders",
    values: { order_no: "SO-4355", customer: "Sunrise Traders", packed_qty: 45 },
    instanceStatus: FmsInstanceStatus.COMPLETED,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(5), actualAt: daysAgo(5), delayMinutes: null },
      { status: "DONE", plannedAt: daysAgo(4), actualAt: daysAgo(4), delayMinutes: null },
    ],
  });

  await createDemoJob({
    organizationId: organization.id,
    template: dispatch.template,
    formId: dispatch.form.id,
    submitterId: users.ops,
    referenceLabel: "SO-4420 � Greenfield Exports",
    values: { order_no: "SO-4420", customer: "Greenfield Exports", packed_qty: 200 },
    instanceStatus: FmsInstanceStatus.ACTIVE,
    stepScenarios: [
      { status: "DONE", plannedAt: daysAgo(2), actualAt: daysAgo(2), delayMinutes: null },
      { status: "IN_PROGRESS", plannedAt: hoursAgo(4) },
    ],
  });

  // Tasks for future EM board
  await client.delegatedTask.createMany({
    data: [
      {
        organizationId: organization.id,
        title: "Weekly EM prep � review FMS exceptions",
        instructions: "Open EM Ready board and discuss overdue collection + dispatch lines.",
        assigneeUserId: users.manager,
        createdById: users.owner,
        priority: TaskPriority.HIGH,
        department: TaskDepartment.ADMIN,
        dueAt: daysFromNow(1),
        status: TaskStatus.PENDING,
      },
      {
        organizationId: organization.id,
        title: "Call ABC Industries � INV-1842 overdue",
        instructions: "Payment collection FMS shows 2-day delay on follow-up stop.",
        assigneeUserId: users.accounts,
        createdById: users.manager,
        priority: TaskPriority.HIGH,
        department: TaskDepartment.ACCOUNTS,
        dueAt: hoursAgo(-4),
        status: TaskStatus.PENDING,
      },
      {
        organizationId: organization.id,
        title: "Follow up Sunrise Traders lead",
        assigneeUserId: users.sales,
        createdById: users.manager,
        priority: TaskPriority.MEDIUM,
        department: TaskDepartment.SALES,
        dueAt: daysAgo(1),
        status: TaskStatus.PENDING,
      },
      {
        organizationId: organization.id,
        title: "Book transporter for SO-4412",
        assigneeUserId: users.ops,
        createdById: users.manager,
        priority: TaskPriority.HIGH,
        department: TaskDepartment.OPERATIONS,
        dueAt: hoursAgo(2),
        status: TaskStatus.IN_PROGRESS,
      },
    ],
  });

  const gstTemplate = await prisma.checklistTemplate.create({
    data: {
      organizationId: organization.id,
      title: "GST return filing",
      instructions: "File GST return and upload acknowledgement.",
      team: "ACCOUNTS",
      frequency: "MONTHLY",
      dueMonthDay: 5,
      assigneeUserId: users.accounts,
      createdById: users.manager,
      references: {
        create: [
          {
            kind: "SHARED",
            label: "BCI checklist sample",
            href: "https://docs.google.com/spreadsheets/d/1N4CdRzXlix-tWVqynyXgcPBIXyc_Ac2o79thwhGc96I/edit",
          },
        ],
      },
    },
  });
  const pcNow = new Date();
  const gstPlanned = new Date(pcNow.getFullYear(), pcNow.getMonth(), 5, 18, 0, 0);
  await prisma.checklistOccurrence.create({
    data: {
      organizationId: organization.id,
      templateId: gstTemplate.id,
      assigneeUserId: users.accounts,
      seriesKey: `${pcNow.getFullYear()}-${String(pcNow.getMonth() + 1).padStart(2, "0")}`,
      plannedAt: gstPlanned,
      status: gstPlanned.getTime() < pcNow.getTime() ? "OVERDUE" : "PENDING",
    },
  });

  return {
    organization,
    users,
    workflows: {
      lead: lead.template.name,
      payment: payment.template.name,
      dispatch: dispatch.template.name,
    },
    jobCount: 13,
  };
}

async function main() {
  const result = await seedBciDemo();
  console.log("BCI demo seed complete.");
  console.log("Org:", result.organization.slug, "�", result.organization.name);
  console.log("Workflows:", result.workflows);
  console.log("Demo jobs:", result.jobCount);
  console.log("Login: owner@bci.demo /", DEMO_PASSWORD);
  console.log("Also: manager@bci.demo, sales@bci.demo, accounts@bci.demo, ops@bci.demo");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
