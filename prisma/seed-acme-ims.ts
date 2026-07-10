/**
 * PEB / pre-engineered building store sample data for Acme Manufacturing demo tenant.
 * Run: npm run db:seed-acme-ims
 */
import { existsSync, readFileSync } from "fs";
import type {
  ImsAbcClass,
  ImsItemType,
  ImsQcPolicy,
  PrismaClient,
} from "@prisma/client";
import { PrismaClient as PrismaClientCtor } from "@prisma/client";
import { createIndent, updateIndentStatus } from "../src/lib/ims/indents";
import { recordStockMovement } from "../src/lib/ims/ims-store";
import { createPurchaseBill } from "../src/lib/ims/purchase-bills";
import {
  createPurchaseOrder,
  updatePurchaseOrderStatus,
} from "../src/lib/ims/purchase-orders";
import {
  createMaterialRequisition,
  updateRequisitionStatus,
} from "../src/lib/ims/requisitions";

const ORG_SLUG = "acme-manufacturing";
const SITE = "Greater Noida Plant";

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

type SeedUsers = {
  ownerId: string;
  managerId: string;
  staffId: string;
};

type ItemSeed = {
  code: string;
  name: string;
  group: string;
  uom: string;
  itemType: ImsItemType;
  abcClass: ImsAbcClass;
  unitCost: number;
  minQty: number;
  reorderQty: number;
  maxQty: number;
  qcOnReceipt?: ImsQcPolicy;
  rackCode?: string;
  category?: string;
};

const ITEM_GROUPS = [
  "Raw materials",
  "Consumables",
  "Finished goods",
  "Spares",
] as const;

const RACKS = [
  { code: "RM-A1", name: "Raw material bay A1", siteName: SITE },
  { code: "RM-B2", name: "Structural steel bay B2", siteName: SITE },
  { code: "CON-C1", name: "Consumables rack C1", siteName: SITE },
  { code: "FG-D1", name: "Finished goods D1", siteName: SITE },
  { code: "SPR-E1", name: "Spares & bearings E1", siteName: SITE },
] as const;

const VENDORS = [
  {
    code: "V-STL-01",
    name: "Noida Steel Traders",
    contactName: "Rajesh Gupta",
    email: "sales@noidasteel.example",
    phone: "+91 98100 11223",
    gstin: "09AABCN1234F1Z5",
    paymentTerms: "30 days",
    leadTimeDays: 7,
  },
  {
    code: "V-FST-02",
    name: "Bharat Fasteners Pvt Ltd",
    contactName: "Suresh Mehta",
    email: "orders@bharatfasteners.example",
    phone: "+91 98765 44321",
    gstin: "09AABCB5678G1Z2",
    paymentTerms: "15 days",
    leadTimeDays: 5,
  },
  {
    code: "V-PNT-03",
    name: "Hindustan Paints & Coatings",
    contactName: "Anil Verma",
    email: "supply@hindpaints.example",
    phone: "+91 99100 55667",
    paymentTerms: "45 days",
    leadTimeDays: 10,
  },
  {
    code: "V-INS-04",
    name: "National Insulation Supplies",
    contactName: "Pankaj Singh",
    email: "dispatch@natinsul.example",
    phone: "+91 98112 77889",
    leadTimeDays: 14,
  },
  {
    code: "V-ROF-05",
    name: "Apex Roofing Solutions",
    contactName: "Vikram Joshi",
    email: "quotes@apexroof.example",
    phone: "+91 98990 33445",
    paymentTerms: "21 days",
    leadTimeDays: 12,
  },
] as const;

const ITEMS: ItemSeed[] = [
  {
    code: "RM-PLT-06",
    name: "MS Plate 6mm",
    group: "Raw materials",
    uom: "MT",
    itemType: "RAW_MATERIAL",
    abcClass: "A",
    unitCost: 62000,
    minQty: 10,
    reorderQty: 25,
    maxQty: 80,
    rackCode: "RM-A1",
    category: "Steel plate",
  },
  {
    code: "RM-PLT-10",
    name: "MS Plate 10mm",
    group: "Raw materials",
    uom: "MT",
    itemType: "RAW_MATERIAL",
    abcClass: "A",
    unitCost: 64500,
    minQty: 8,
    reorderQty: 20,
    maxQty: 60,
    rackCode: "RM-A1",
    category: "Steel plate",
  },
  {
    code: "RM-ISMB200",
    name: "ISMB 200 Beam",
    group: "Raw materials",
    uom: "MT",
    itemType: "RAW_MATERIAL",
    abcClass: "A",
    unitCost: 71000,
    minQty: 5,
    reorderQty: 15,
    maxQty: 40,
    rackCode: "RM-B2",
    category: "Structural section",
  },
  {
    code: "RM-ISMC150",
    name: "ISMC 150 Channel",
    group: "Raw materials",
    uom: "MT",
    itemType: "RAW_MATERIAL",
    abcClass: "B",
    unitCost: 68500,
    minQty: 4,
    reorderQty: 12,
    maxQty: 35,
    rackCode: "RM-B2",
    category: "Structural section",
  },
  {
    code: "RM-HSS100",
    name: "HSS 100x100 Tube",
    group: "Raw materials",
    uom: "MT",
    itemType: "RAW_MATERIAL",
    abcClass: "B",
    unitCost: 73000,
    minQty: 3,
    reorderQty: 10,
    maxQty: 30,
    rackCode: "RM-B2",
    category: "Structural section",
  },
  {
    code: "RM-BLT-M16",
    name: "HT Bolt M16x50",
    group: "Raw materials",
    uom: "pcs",
    itemType: "RAW_MATERIAL",
    abcClass: "B",
    unitCost: 12,
    minQty: 500,
    reorderQty: 2000,
    maxQty: 10000,
    rackCode: "CON-C1",
    category: "Fasteners",
  },
  {
    code: "RM-BLT-M20",
    name: "HT Bolt M20x60",
    group: "Raw materials",
    uom: "pcs",
    itemType: "RAW_MATERIAL",
    abcClass: "B",
    unitCost: 18,
    minQty: 400,
    reorderQty: 1500,
    maxQty: 8000,
    rackCode: "CON-C1",
    category: "Fasteners",
  },
  {
    code: "RM-PAINT-ZN",
    name: "Zinc Primer Paint",
    group: "Consumables",
    uom: "LTR",
    itemType: "RAW_MATERIAL",
    abcClass: "C",
    unitCost: 185,
    minQty: 200,
    reorderQty: 500,
    maxQty: 2000,
    rackCode: "CON-C1",
    category: "Coatings",
  },
  {
    code: "RM-INSUL-50",
    name: "Rockwool Insulation 50mm",
    group: "Raw materials",
    uom: "sqm",
    itemType: "RAW_MATERIAL",
    abcClass: "B",
    unitCost: 320,
    minQty: 500,
    reorderQty: 1200,
    maxQty: 5000,
    rackCode: "RM-A1",
    category: "Insulation",
    qcOnReceipt: "OPTIONAL",
  },
  {
    code: "RM-ROOF-CC",
    name: "Colour Coated Roofing Sheet 0.5mm",
    group: "Raw materials",
    uom: "sqm",
    itemType: "RAW_MATERIAL",
    abcClass: "A",
    unitCost: 580,
    minQty: 1000,
    reorderQty: 2500,
    maxQty: 12000,
    rackCode: "RM-A1",
    category: "Roofing",
    qcOnReceipt: "ALWAYS",
  },
  {
    code: "RM-WELD-E7018",
    name: "Welding Electrode E7018",
    group: "Consumables",
    uom: "kg",
    itemType: "RAW_MATERIAL",
    abcClass: "C",
    unitCost: 210,
    minQty: 100,
    reorderQty: 300,
    maxQty: 1000,
    rackCode: "CON-C1",
    category: "Welding",
  },
  {
    code: "CON-DISC-14",
    name: 'Cutting Disc 14"',
    group: "Consumables",
    uom: "pcs",
    itemType: "RAW_MATERIAL",
    abcClass: "C",
    unitCost: 85,
    minQty: 50,
    reorderQty: 150,
    maxQty: 500,
    rackCode: "CON-C1",
    category: "Tools",
  },
  {
    code: "CON-GLOVES",
    name: "Leather Safety Gloves",
    group: "Consumables",
    uom: "pair",
    itemType: "RAW_MATERIAL",
    abcClass: "C",
    unitCost: 120,
    minQty: 30,
    reorderQty: 100,
    maxQty: 400,
    rackCode: "CON-C1",
    category: "PPE",
  },
  {
    code: "SPR-BRG-6205",
    name: "Ball Bearing 6205",
    group: "Spares",
    uom: "pcs",
    itemType: "RAW_MATERIAL",
    abcClass: "C",
    unitCost: 280,
    minQty: 10,
    reorderQty: 40,
    maxQty: 150,
    rackCode: "SPR-E1",
    category: "Bearings",
  },
  {
    code: "SPR-HYD-SEAL",
    name: "Hydraulic Cylinder Seal Kit",
    group: "Spares",
    uom: "kit",
    itemType: "RAW_MATERIAL",
    abcClass: "C",
    unitCost: 1450,
    minQty: 5,
    reorderQty: 15,
    maxQty: 50,
    rackCode: "SPR-E1",
    category: "Hydraulics",
  },
  {
    code: "FG-SHED-30X60",
    name: "PEB Industrial Shed 30x60m",
    group: "Finished goods",
    uom: "nos",
    itemType: "FINISHED_GOOD",
    abcClass: "A",
    unitCost: 2850000,
    minQty: 0,
    reorderQty: 0,
    maxQty: 5,
    rackCode: "FG-D1",
    category: "PEB structure",
  },
  {
    code: "FG-WH-40X80",
    name: "PEB Warehouse 40x80m",
    group: "Finished goods",
    uom: "nos",
    itemType: "FINISHED_GOOD",
    abcClass: "A",
    unitCost: 4200000,
    minQty: 0,
    reorderQty: 0,
    maxQty: 3,
    rackCode: "FG-D1",
    category: "PEB structure",
  },
  {
    code: "FG-MEZZ",
    name: "PEB Mezzanine Floor Kit",
    group: "Finished goods",
    uom: "nos",
    itemType: "FINISHED_GOOD",
    abcClass: "B",
    unitCost: 850000,
    minQty: 0,
    reorderQty: 0,
    maxQty: 8,
    rackCode: "FG-D1",
    category: "PEB structure",
  },
  {
    code: "FG-TRUSS",
    name: "Steel Truss Assembly",
    group: "Finished goods",
    uom: "nos",
    itemType: "FINISHED_GOOD",
    abcClass: "B",
    unitCost: 125000,
    minQty: 0,
    reorderQty: 0,
    maxQty: 20,
    rackCode: "FG-D1",
    category: "Fabrication",
  },
];

export async function clearAcmeImsData(
  prisma: PrismaClient,
  organizationId: string,
) {
  await prisma.imsGatePassLine.deleteMany({ where: { organizationId } });
  await prisma.imsGatePass.deleteMany({ where: { organizationId } });
  await prisma.imsPhysicalStockCountLine.deleteMany({ where: { organizationId } });
  await prisma.imsPhysicalStockCount.deleteMany({ where: { organizationId } });
  await prisma.imsPurchaseOrderLine.deleteMany({ where: { organizationId } });
  await prisma.imsPurchaseOrder.deleteMany({ where: { organizationId } });
  await prisma.imsIndentLine.deleteMany({ where: { organizationId } });
  await prisma.imsIndent.deleteMany({ where: { organizationId } });
  await prisma.imsMaterialRequisitionLine.deleteMany({ where: { organizationId } });
  await prisma.imsMaterialRequisition.deleteMany({ where: { organizationId } });
  await prisma.imsPurchaseBill.deleteMany({ where: { organizationId } });
  await prisma.imsQcInspection.deleteMany({ where: { organizationId } });
  await prisma.imsStockMovement.deleteMany({ where: { organizationId } });
  await prisma.imsStockBalance.deleteMany({ where: { organizationId } });
  await prisma.imsItem.deleteMany({ where: { organizationId } });
  await prisma.imsItemGroup.deleteMany({ where: { organizationId } });
  await prisma.imsRackSection.deleteMany({ where: { organizationId } });
  await prisma.imsVendor.deleteMany({ where: { organizationId } });
  await prisma.imsAttachment.deleteMany({ where: { organizationId } });
}

export async function seedAcmeIms(
  prisma: PrismaClient,
  organizationId: string,
  users: SeedUsers,
) {
  await clearAcmeImsData(prisma, organizationId);

  const groupIds = new Map<string, string>();
  for (const [index, name] of ITEM_GROUPS.entries()) {
    const group = await prisma.imsItemGroup.create({
      data: { organizationId, name, sortOrder: index },
    });
    groupIds.set(name, group.id);
  }

  const rackIds = new Map<string, string>();
  for (const [index, rack] of RACKS.entries()) {
    const row = await prisma.imsRackSection.create({
      data: {
        organizationId,
        code: rack.code,
        name: rack.name,
        siteName: rack.siteName,
        sortOrder: index,
      },
    });
    rackIds.set(rack.code, row.id);
  }

  const vendorIds = new Map<string, string>();
  for (const [index, vendor] of VENDORS.entries()) {
    const row = await prisma.imsVendor.create({
      data: {
        organizationId,
        ...vendor,
        sortOrder: index,
      },
    });
    vendorIds.set(vendor.code, row.id);
  }

  const itemIds = new Map<string, string>();
  for (const [index, item] of ITEMS.entries()) {
    const row = await prisma.imsItem.create({
      data: {
        organizationId,
        code: item.code,
        name: item.name,
        groupId: groupIds.get(item.group) ?? null,
        rackSectionId: item.rackCode ? rackIds.get(item.rackCode) ?? null : null,
        uom: item.uom,
        category: item.category ?? null,
        itemType: item.itemType,
        abcClass: item.abcClass,
        unitCost: item.unitCost,
        minQty: item.minQty,
        reorderQty: item.reorderQty,
        maxQty: item.maxQty,
        qcOnReceipt: item.qcOnReceipt ?? "OFF",
        sortOrder: index,
      },
    });
    itemIds.set(item.code, row.id);
  }

  const id = (code: string) => {
    const value = itemIds.get(code);
    if (!value) {
      throw new Error(`Missing seeded item: ${code}`);
    }
    return value;
  };

  const vendor = (code: string) => {
    const value = vendorIds.get(code);
    if (!value) {
      throw new Error(`Missing seeded vendor: ${code}`);
    }
    return value;
  };

  // GRN receipts — stock levels tuned for dashboard exceptions (red / orange / green)
  const grnLines: Array<{
    code: string;
    qty: number;
    po: string;
    supplier: string;
    qc?: boolean;
  }> = [
    { code: "RM-PLT-06", qty: 4, po: "PO-2026-0142", supplier: "Noida Steel Traders" },
    { code: "RM-PLT-10", qty: 14, po: "PO-2026-0143", supplier: "Noida Steel Traders" },
    { code: "RM-ISMB200", qty: 11, po: "PO-2026-0144", supplier: "Noida Steel Traders" },
    { code: "RM-ISMC150", qty: 6, po: "PO-2026-0145", supplier: "Noida Steel Traders" },
    { code: "RM-HSS100", qty: 8, po: "PO-2026-0146", supplier: "Noida Steel Traders" },
    { code: "RM-BLT-M16", qty: 3200, po: "PO-2026-0147", supplier: "Bharat Fasteners Pvt Ltd" },
    { code: "RM-BLT-M20", qty: 900, po: "PO-2026-0148", supplier: "Bharat Fasteners Pvt Ltd" },
    { code: "RM-PAINT-ZN", qty: 380, po: "PO-2026-0149", supplier: "Hindustan Paints & Coatings" },
    { code: "RM-INSUL-50", qty: 950, po: "PO-2026-0150", supplier: "National Insulation Supplies" },
    {
      code: "RM-ROOF-CC",
      qty: 1800,
      po: "PO-2026-0151",
      supplier: "Apex Roofing Solutions",
      qc: true,
    },
    { code: "RM-WELD-E7018", qty: 220, po: "PO-2026-0152", supplier: "Noida Steel Traders" },
    { code: "CON-DISC-14", qty: 95, po: "PO-2026-0153", supplier: "Bharat Fasteners Pvt Ltd" },
    { code: "CON-GLOVES", qty: 72, po: "PO-2026-0154", supplier: "Bharat Fasteners Pvt Ltd" },
    { code: "SPR-BRG-6205", qty: 18, po: "PO-2026-0155", supplier: "Bharat Fasteners Pvt Ltd" },
    { code: "SPR-HYD-SEAL", qty: 8, po: "PO-2026-0156", supplier: "Bharat Fasteners Pvt Ltd" },
  ];

  for (const line of grnLines) {
    await recordStockMovement({
      organizationId,
      userId: users.managerId,
      itemId: id(line.code),
      movementType: "RM_IN",
      quantity: line.qty,
      poNumber: line.po,
      supplierName: line.supplier,
      reference: `GRN/${line.po}`,
      notes: `Inbound at ${SITE}`,
      qcRequiredChoice: line.qc,
    });
  }

  // FG production receipts
  await recordStockMovement({
    organizationId,
    userId: users.managerId,
    itemId: id("FG-SHED-30X60"),
    movementType: "FG_IN",
    quantity: 1,
    reference: "PROD/WO-2026-0088",
    notes: "PEB shed completed — Job WO-2026-0088",
  });
  await recordStockMovement({
    organizationId,
    userId: users.managerId,
    itemId: id("FG-WH-40X80"),
    movementType: "FG_IN",
    quantity: 1,
    reference: "PROD/WO-2026-0091",
    notes: "Warehouse structure ready for dispatch",
  });
  await recordStockMovement({
    organizationId,
    userId: users.managerId,
    itemId: id("FG-MEZZ"),
    movementType: "FG_IN",
    quantity: 2,
    reference: "PROD/WO-2026-0094",
  });
  await recordStockMovement({
    organizationId,
    userId: users.managerId,
    itemId: id("FG-TRUSS"),
    movementType: "FG_IN",
    quantity: 6,
    reference: "PROD/WO-2026-0096",
  });

  // MIN — issue to production
  const minLines = [
    { code: "RM-PLT-06", qty: 1.5 },
    { code: "RM-ISMB200", qty: 2 },
    { code: "RM-BLT-M16", qty: 400 },
    { code: "RM-PAINT-ZN", qty: 45 },
    { code: "RM-WELD-E7018", qty: 30 },
  ];
  for (const line of minLines) {
    await recordStockMovement({
      organizationId,
      userId: users.staffId,
      itemId: id(line.code),
      movementType: "ISSUE_TO_PRODUCTION",
      quantity: line.qty,
      reference: "MIN/2026-0312",
      notes: "Issued for fabrication bay — Job WO-2026-0102",
    });
  }

  await recordStockMovement({
    organizationId,
    userId: users.staffId,
    itemId: id("CON-DISC-14"),
    movementType: "WASTAGE",
    quantity: 6,
    reference: "WST/2026-0041",
    notes: "Damaged discs — cutting bay",
  });

  // Material requisitions (mixed statuses)
  const mrDraft = await createMaterialRequisition({
    organizationId,
    requestedById: users.staffId,
    siteName: SITE,
    department: "Fabrication",
    purpose: "Additional primer for touch-up on truss line",
    lines: [{ itemId: id("RM-PAINT-ZN"), quantityRequested: 80 }],
  });

  const mrPending = await createMaterialRequisition({
    organizationId,
    requestedById: users.staffId,
    siteName: SITE,
    department: "PEB Assembly",
    purpose: "Structural steel for customer shed erection",
    submitForApproval: true,
    lines: [
      { itemId: id("RM-ISMB200"), quantityRequested: 4 },
      { itemId: id("RM-BLT-M20"), quantityRequested: 600 },
    ],
  });

  const mrApprovedFab = await createMaterialRequisition({
    organizationId,
    requestedById: users.staffId,
    siteName: SITE,
    department: "Fabrication",
    purpose: "Roofing sheets for dispatch lot RL-2026-18",
    submitForApproval: true,
    lines: [
      { itemId: id("RM-ROOF-CC"), quantityRequested: 1200 },
      { itemId: id("RM-INSUL-50"), quantityRequested: 400 },
    ],
  });
  await updateRequisitionStatus({
    organizationId,
    requisitionId: mrApprovedFab.id,
    status: "APPROVED",
    actorUserId: users.managerId,
  });

  const mrApprovedStore = await createMaterialRequisition({
    organizationId,
    requestedById: users.managerId,
    siteName: SITE,
    department: "Stores",
    purpose: "Restock fasteners after Q1 dispatch rush",
    submitForApproval: true,
    lines: [
      { itemId: id("RM-BLT-M16"), quantityRequested: 3000 },
      { itemId: id("RM-BLT-M20"), quantityRequested: 2000 },
    ],
  });
  await updateRequisitionStatus({
    organizationId,
    requisitionId: mrApprovedStore.id,
    status: "APPROVED",
    actorUserId: users.ownerId,
  });

  const mrRejected = await createMaterialRequisition({
    organizationId,
    requestedById: users.staffId,
    siteName: SITE,
    department: "Maintenance",
    purpose: "Non-standard plate thickness — not in BOM",
    submitForApproval: true,
    lines: [{ itemId: id("RM-PLT-10"), quantityRequested: 25 }],
  });
  await updateRequisitionStatus({
    organizationId,
    requisitionId: mrRejected.id,
    status: "REJECTED",
    actorUserId: users.managerId,
    rejectedReason: "Use approved 10mm stock; raise indent via approved MR only.",
  });

  const mrClosed = await createMaterialRequisition({
    organizationId,
    requestedById: users.staffId,
    siteName: SITE,
    department: "Welding",
    purpose: "Welding consumables for February campaign",
    submitForApproval: true,
    lines: [{ itemId: id("RM-WELD-E7018"), quantityRequested: 150 }],
  });
  await updateRequisitionStatus({
    organizationId,
    requisitionId: mrClosed.id,
    status: "APPROVED",
    actorUserId: users.managerId,
  });
  await updateRequisitionStatus({
    organizationId,
    requisitionId: mrClosed.id,
    status: "CLOSED",
    actorUserId: users.managerId,
  });

  // Indents
  const indentDraft = await createIndent({
    organizationId,
    createdById: users.staffId,
    vendorId: vendor("V-STL-01"),
    siteName: SITE,
    notes: "Draft indent — awaiting rate confirmation",
    lines: [{ itemId: id("RM-PLT-06"), quantity: 20, rate: 62000 }],
  });

  const indentPending = await createIndent({
    organizationId,
    createdById: users.managerId,
    requisitionId: mrApprovedFab.id,
    vendorId: vendor("V-ROF-05"),
    siteName: SITE,
    submitForApproval: true,
    lines: [
      { itemId: id("RM-ROOF-CC"), quantity: 1200, rate: 575 },
      { itemId: id("RM-INSUL-50"), quantity: 400, rate: 310 },
    ],
  });

  const indentApproved = await createIndent({
    organizationId,
    createdById: users.managerId,
    requisitionId: mrApprovedStore.id,
    vendorId: vendor("V-FST-02"),
    siteName: SITE,
    submitForApproval: true,
    lines: [
      { itemId: id("RM-BLT-M16"), quantity: 3000, rate: 11.5 },
      { itemId: id("RM-BLT-M20"), quantity: 2000, rate: 17.25 },
    ],
  });
  await updateIndentStatus({
    organizationId,
    indentId: indentApproved.id,
    status: "APPROVED",
    actorUserId: users.ownerId,
  });

  const poDraft = await createPurchaseOrder({
    organizationId,
    createdById: users.staffId,
    vendorId: vendor("V-STL-01"),
    siteName: SITE,
    notes: "Draft PO — plate rates under negotiation",
    lines: [
      { itemId: id("RM-PLT-06"), quantity: 20, rate: 62000 },
      { itemId: id("RM-PLT-10"), quantity: 12, rate: 58500 },
    ],
  });

  const poPending = await createPurchaseOrder({
    organizationId,
    createdById: users.managerId,
    vendorId: vendor("V-ROF-05"),
    siteName: SITE,
    expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    submitForApproval: true,
    lines: [
      { itemId: id("RM-ROOF-CC"), quantity: 1200, rate: 575 },
      { itemId: id("RM-INSUL-50"), quantity: 400, rate: 310 },
    ],
  });

  const poApproved = await createPurchaseOrder({
    organizationId,
    createdById: users.managerId,
    indentId: indentApproved.id,
    siteName: SITE,
    expectedDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    submitForApproval: true,
    lines: [],
  });
  await updatePurchaseOrderStatus({
    organizationId,
    purchaseOrderId: poApproved.id,
    status: "APPROVED",
    actorUserId: users.ownerId,
  });

  void poDraft;

  await createPurchaseBill({
    organizationId,
    createdById: users.managerId,
    vendorId: vendor("V-STL-01"),
    billDate: new Date(),
    amount: 868000,
    grnReference: "GRN/PO-2026-0142",
    invoiceNumber: "NST/INV/8842",
    notes: "MS plate 6mm & 10mm — pending accounts match",
  });
  await createPurchaseBill({
    organizationId,
    createdById: users.managerId,
    vendorId: vendor("V-FST-02"),
    billDate: new Date(),
    amount: 142500,
    grnReference: "GRN/PO-2026-0147",
    invoiceNumber: "BF/2026/1198",
    notes: "Fasteners lot — draft bill",
  });

  const usableMap = await prisma.imsStockBalance.findMany({
    where: { organizationId, bucket: "USABLE" },
    select: { itemId: true, quantity: true },
  });
  const usableByItem = new Map(
    usableMap.map((row) => [row.itemId, Number(row.quantity)]),
  );

  await prisma.imsPhysicalStockCount.create({
    data: {
      organizationId,
      countNumber: `PSC-${new Date().getFullYear()}-0001`,
      status: "DRAFT",
      siteName: SITE,
      notes: "Monthly cycle count — RM bays A1 & B2",
      createdById: users.managerId,
      lines: {
        create: [
          id("RM-PLT-06"),
          id("RM-PLT-10"),
          id("RM-ISMB200"),
        ].map((itemId, index) => ({
          organizationId,
          itemId,
          systemQty: usableByItem.get(itemId) ?? 0,
          physicalQty: (usableByItem.get(itemId) ?? 0) - (index === 0 ? 0.2 : 0),
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.imsGatePass.create({
    data: {
      organizationId,
      passNumber: `GP-${new Date().getFullYear()}-0001`,
      status: "DRAFT",
      siteName: SITE,
      partyName: "Shree Logistics Carriers",
      vehicleNo: "UP16GT4521",
      purpose: "Returnable MS offcuts to job-work vendor",
      createdById: users.staffId,
      lines: {
        create: [
          {
            organizationId,
            itemId: id("RM-PLT-06"),
            quantity: 0.5,
            notes: "Scrap plate — lot tagged SCR-041",
            sortOrder: 0,
          },
        ],
      },
    },
  });

  const counts = {
    groups: await prisma.imsItemGroup.count({ where: { organizationId } }),
    items: await prisma.imsItem.count({ where: { organizationId } }),
    vendors: await prisma.imsVendor.count({ where: { organizationId } }),
    racks: await prisma.imsRackSection.count({ where: { organizationId } }),
    requisitions: await prisma.imsMaterialRequisition.count({ where: { organizationId } }),
    indents: await prisma.imsIndent.count({ where: { organizationId } }),
    purchaseOrders: await prisma.imsPurchaseOrder.count({ where: { organizationId } }),
    movements: await prisma.imsStockMovement.count({ where: { organizationId } }),
    balances: await prisma.imsStockBalance.count({ where: { organizationId } }),
    purchaseBills: await prisma.imsPurchaseBill.count({ where: { organizationId } }),
    physicalCounts: await prisma.imsPhysicalStockCount.count({ where: { organizationId } }),
    gatePasses: await prisma.imsGatePass.count({ where: { organizationId } }),
    mrPending: await prisma.imsMaterialRequisition.count({
      where: { organizationId, status: "PENDING" },
    }),
    indentPending: await prisma.imsIndent.count({
      where: { organizationId, status: "PENDING" },
    }),
    poPending: await prisma.imsPurchaseOrder.count({
      where: { organizationId, status: "PENDING" },
    }),
    qcPending: await prisma.imsQcInspection.count({
      where: { organizationId, status: "PENDING" },
    }),
  };

  console.log("Acme IMS seed complete:", counts);
  console.log("  Draft MR:", mrDraft.requisitionNumber);
  console.log("  Pending MR:", mrPending.requisitionNumber);
  console.log("  Draft indent:", indentDraft.indentNumber);
  console.log("  Pending indent:", indentPending.indentNumber);
  console.log("  Draft PO:", poDraft.poNumber);
  console.log("  Pending PO:", poPending.poNumber);
  console.log("  Approved PO:", poApproved.poNumber);

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

  const memberships = await prisma.membership.findMany({
    where: { organizationId: org.id },
    include: { user: { select: { email: true, id: true } } },
  });
  const byEmail = new Map(memberships.map((m) => [m.user.email, m.user.id]));

  const ownerId = byEmail.get("owner@acme.demo");
  const managerId = byEmail.get("manager@acme.demo");
  const staffId = byEmail.get("staff@acme.demo");

  if (!ownerId || !managerId || !staffId) {
    throw new Error("Acme demo users missing. Run npm run db:seed first.");
  }

  await seedAcmeIms(prisma, org.id, { ownerId, managerId, staffId });
  await prisma.$disconnect();
}

const isDirectRun = process.argv[1]?.includes("seed-acme-ims");

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
