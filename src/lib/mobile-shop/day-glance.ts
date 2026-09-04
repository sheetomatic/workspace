/** Shop-floor "today" is India, not UTC. */

export const LOW_STOCK_MAX_QTY = 2;

export type MoneyCount = {
  count: number;
  qty: number;
  paise: number;
};

export type ShopMovementRow = {
  kind: string;
  qty: number;
  amountPaise: number;
  createdAt: Date;
  item: { kind: string; condition: string | null };
};

export type ShopRepairRow = {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  promisedAt: Date | null;
  customerName: string;
  deviceName: string;
};

export type ShopStockRow = {
  id: string;
  name: string;
  kind: string;
  qty: number;
};

export type ShopDayGlance = {
  dayStart: Date;
  sales: {
    newPhones: MoneyCount;
    usedPhones: MoneyCount;
    accessories: MoneyCount;
    total: MoneyCount;
  };
  stockIn: MoneyCount;
  stockOut: MoneyCount;
  repairs: {
    received: number;
    inProgress: number;
    ready: number;
    delivered: number;
    open: number;
  };
  accessoriesSold: MoneyCount;
  lowStock: ShopStockRow[];
  overdueRepairs: Array<{
    id: string;
    customerName: string;
    deviceName: string;
    promisedAt: Date;
  }>;
};

export function startOfShopDay(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(now);
  return new Date(`${ymd}T00:00:00+05:30`);
}

export function emptyMoney(): MoneyCount {
  return { count: 0, qty: 0, paise: 0 };
}

function addMoney(target: MoneyCount, qty: number, paise: number) {
  target.count += 1;
  target.qty += qty;
  target.paise += paise;
}

export function classifySale(
  itemKind: string,
  condition: string | null | undefined,
): "newPhones" | "usedPhones" | "accessories" | null {
  if (itemKind === "ACCESSORY") return "accessories";
  if (itemKind === "PHONE") {
    return condition === "NEW" ? "newPhones" : "usedPhones";
  }
  return null;
}

export function isOverdueRepair(
  status: string,
  promisedAt: Date | null,
  now: Date,
) {
  if (!promisedAt) return false;
  if (status === "DELIVERED" || status === "CANCELLED") return false;
  return promisedAt.getTime() < now.getTime();
}

export function summarizeShopDay(input: {
  now: Date;
  movements: ShopMovementRow[];
  repairs: ShopRepairRow[];
  stockItems: ShopStockRow[];
}): ShopDayGlance {
  const dayStart = startOfShopDay(input.now);
  const sales = {
    newPhones: emptyMoney(),
    usedPhones: emptyMoney(),
    accessories: emptyMoney(),
    total: emptyMoney(),
  };
  const stockIn = emptyMoney();
  const stockOut = emptyMoney();

  for (const row of input.movements) {
    if (row.createdAt < dayStart) continue;
    if (row.kind === "STOCK_IN") {
      addMoney(stockIn, row.qty, 0);
      continue;
    }
    if (row.kind === "STOCK_OUT" || row.kind === "PART_TO_REPAIR") {
      addMoney(stockOut, row.qty, 0);
      continue;
    }
    if (row.kind !== "SALE") continue;
    const bucket = classifySale(row.item.kind, row.item.condition);
    if (!bucket) continue;
    addMoney(sales[bucket], row.qty, row.amountPaise);
    addMoney(sales.total, row.qty, row.amountPaise);
  }

  const repairs = {
    received: 0,
    inProgress: 0,
    ready: 0,
    delivered: 0,
    open: 0,
  };
  const overdueRepairs: ShopDayGlance["overdueRepairs"] = [];
  const seenOverdue = new Set<string>();

  for (const job of input.repairs) {
    if (job.status === "RECEIVED" || job.status === "IN_PROGRESS") {
      repairs.open += 1;
    }
    if (job.status === "IN_PROGRESS") repairs.inProgress += 1;
    if (job.status === "READY") repairs.ready += 1;
    if (job.status !== "CANCELLED" && job.createdAt >= dayStart) {
      repairs.received += 1;
    }
    if (job.status === "DELIVERED" && job.updatedAt >= dayStart) {
      repairs.delivered += 1;
    }
    if (
      isOverdueRepair(job.status, job.promisedAt, input.now) &&
      job.promisedAt &&
      !seenOverdue.has(job.id)
    ) {
      seenOverdue.add(job.id);
      overdueRepairs.push({
        id: job.id,
        customerName: job.customerName,
        deviceName: job.deviceName,
        promisedAt: job.promisedAt,
      });
    }
  }

  const lowStock = input.stockItems
    .filter(
      (item) =>
        (item.kind === "ACCESSORY" || item.kind === "PART") &&
        item.qty <= LOW_STOCK_MAX_QTY,
    )
    .slice(0, 8);

  return {
    dayStart,
    sales,
    stockIn,
    stockOut,
    repairs,
    accessoriesSold: sales.accessories,
    lowStock,
    overdueRepairs,
  };
}
