import { MAX_USERS } from "./brand";

export type Role = "owner" | "manager" | "staff" | "customer";
export type Shift = "morning" | "afternoon" | "evening";
export type PayMode = "UPI" | "Cash";
export type DelStatus = "Planned" | "Loaded" | "Delivered" | "Skipped" | "Partial";
export type InvStatus = "Due" | "Partial" | "Paid" | "Sent";

export type Product = {
  id: string;
  name: string;
  size: string;
  unit: string;
  rate: number;
  deposit: number;
  gst: number;
  hsn: string;
  returnable: boolean;
  stockFilled: number;
  stockEmpty: number;
  reorder: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  area: string;
  routeId: string;
  group: string;
  jarsOut: number;
  jarLimit: number;
  credit: number;
  opening: number;
  rateOverrides: Record<string, number>;
  days: string[];
  qty: number;
  pausedUntil: string | null;
  pin: string;
  discarded?: boolean;
};

export type Staff = {
  id: string;
  name: string;
  phone: string;
  role: Exclude<Role, "customer">;
  pin: string;
  routeId: string;
  salary: number;
  advance: number;
  expenses: number;
};

export type Route = { id: string; name: string; driverId: string; area: string };

export type Line = { productId: string; filled: number; emptyBack: number; rate: number; amount: number };

export type Delivery = {
  id: string;
  no: string;
  date: string;
  shift: Shift;
  customerId: string;
  routeId: string;
  driverId: string;
  status: DelStatus;
  amount: number;
  lines: Line[];
  offline?: boolean;
};

export type Payment = {
  id: string;
  date: string;
  customerId: string;
  amount: number;
  mode: PayMode;
  status: "Settled" | "Partial" | "Pending";
  note: string;
};

export type InvoiceLine = { product: string; qty: number; rate: number; amount: number };

export type Invoice = {
  id: string;
  no: string;
  date: string;
  customerId: string;
  period: string;
  periodFrom: string;
  periodTo: string;
  generatedAt: string;
  groupName: string;
  balanceProduct: number;
  deposit: number;
  pastDue: number;
  paid: number;
  subtotal: number;
  amountToPay: number;
  gst: number;
  total: number;
  status: InvStatus;
  sentAt: string | null;
  lines: InvoiceLine[];
  daily: number[];
};

export type ExpenseKind = "raw_material" | "labour" | "salary" | "petrol" | "diesel" | "other";

export type Expense = {
  id: string;
  date: string;
  kind: ExpenseKind;
  what: string;
  amount: number;
  who: string;
  status: "Open" | "Paid";
};

export const EXPENSE_KINDS: { id: ExpenseKind; label: string }[] = [
  { id: "raw_material", label: "Raw material order" },
  { id: "labour", label: "Labour" },
  { id: "salary", label: "Salary" },
  { id: "petrol", label: "Petrol" },
  { id: "diesel", label: "Diesel" },
  { id: "other", label: "Other" },
];


export type EventBook = {
  id: string;
  name: string;
  date: string;
  customerId: string;
  productId: string;
  qty: number;
  amount: number;
  status: "Open" | "Done";
};

export type PayDetails = {
  accountName: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  phonepe: string;
  upi: string;
};

export type Agency = {
  slug: string;
  planId: "trial" | "route" | "plant" | "chain";
  name: string;
  gstin: string;
  logo: string;
  lang: "en" | "hi";
  address: string;
  phone: string;
  store: string;
  pay: PayDetails;
  products: Product[];
  customers: Customer[];
  staff: Staff[];
  routes: Route[];
  deliveries: Delivery[];
  payments: Payment[];
  invoices: Invoice[];
  events: EventBook[];
  expenses: Expense[];
};

const KEY = "petal-v1";
const today = "22/08/2026";

const JULY_CRAFFLE: Record<number, number> = {
  2: 2, 3: 1, 4: 1, 10: 2, 14: 2, 16: 2, 18: 2, 24: 3, 30: 2,
};

function julyCraffleDeliveries(): Delivery[] {
  return Object.entries(JULY_CRAFFLE).map(([day, qty]) => ({
    id: `jul${day}`,
    no: `DL-07-${String(day).padStart(2, "0")}`,
    date: `${String(day).padStart(2, "0")}/07/2026`,
    shift: "morning" as const,
    customerId: "c0",
    routeId: "r1",
    driverId: "s1",
    status: "Delivered" as const,
    amount: qty * 40,
    lines: [{ productId: "p20", filled: qty, emptyBack: qty, rate: 40, amount: qty * 40 }],
  }));
}

const seed = (): Agency => ({
  slug: "petal",
  planId: "route",
  name: "Surya Mineral",
  gstin: "",
  logo: "/brand/petal-surya.png",
  lang: "en",
  address: "24/352, shri ram colony, Raigarh, Chhattisgarh, India, 496001",
  phone: "8770773556",
  store: "Petal — Surya Minerals",
  pay: {
    accountName: "SURYA MINERALS",
    bankName: "STATE BANK OF INDIA",
    accountNo: "39189271727",
    ifsc: "SBIN0012279",
    phonepe: "8770773556",
    upi: "8770773556-2@ybl",
  },
  products: [
    { id: "p20", name: "20L Jar", size: "20L", unit: "Jar", rate: 40, deposit: 150, gst: 5, hsn: "2201", returnable: true, stockFilled: 220, stockEmpty: 86, reorder: 40 },
    { id: "p5", name: "5L Bottle", size: "5L", unit: "Bottle", rate: 30, deposit: 0, gst: 5, hsn: "2201", returnable: false, stockFilled: 80, stockEmpty: 0, reorder: 20 },
    { id: "p1", name: "1L Bottle", size: "1L", unit: "Bottle", rate: 20, deposit: 0, gst: 5, hsn: "2201", returnable: false, stockFilled: 240, stockEmpty: 0, reorder: 40 },
    { id: "p500", name: "500ml Bottle", size: "500ml", unit: "Bottle", rate: 10, deposit: 0, gst: 12, hsn: "2201", returnable: false, stockFilled: 360, stockEmpty: 0, reorder: 60 },
  ],
  routes: [
    { id: "r1", name: "Store route", driverId: "s1", area: "Main store" },
  ],
  staff: [
    { id: "own", name: "Owner", phone: "9876543210", role: "owner", pin: "1234", routeId: "", salary: 0, advance: 0, expenses: 0 },
    { id: "s1", name: "Ramesh", phone: "9123456780", role: "staff", pin: "0000", routeId: "r1", salary: 14000, advance: 800, expenses: 0 },
    { id: "s2", name: "Suresh", phone: "9123456781", role: "staff", pin: "0000", routeId: "r1", salary: 13500, advance: 0, expenses: 0 },
    { id: "m1", name: "Kavita", phone: "9123456782", role: "manager", pin: "1111", routeId: "", salary: 18000, advance: 0, expenses: 0 },
    { id: "s3", name: "Imran", phone: "9123456783", role: "staff", pin: "0000", routeId: "r1", salary: 12000, advance: 0, expenses: 0 },
  ],
  customers: [
    { id: "c0", name: "Craffle", phone: "8982199027", area: "Grand mall k bahar", routeId: "r1", group: "Daily", jarsOut: 34, jarLimit: 40, credit: 680, opening: 2120, rateOverrides: {}, days: ["Daily"], qty: 2, pausedUntil: null, pin: "1111" },
    { id: "c1", name: "Mehta Clinic", phone: "9811111111", area: "Civil Lines", routeId: "r1", group: "Daily", jarsOut: 12, jarLimit: 20, credit: 0, opening: 0, rateOverrides: {}, days: ["Mon", "Wed", "Fri"], qty: 2, pausedUntil: null, pin: "1111" },
    { id: "c2", name: "Verma Law Office", phone: "9822222222", area: "Court Road", routeId: "r1", group: "Daily", jarsOut: 8, jarLimit: 12, credit: 480, opening: 220, rateOverrides: {}, days: ["Mon", "Fri"], qty: 2, pausedUntil: null, pin: "2222" },
  ],
  deliveries: [
    { id: "d1", no: "DL-2208", date: today, shift: "morning", customerId: "c1", routeId: "r1", driverId: "s1", status: "Delivered", amount: 520, lines: [
      { productId: "p20", filled: 8, emptyBack: 8, rate: 40, amount: 320 },
      { productId: "p1", filled: 10, emptyBack: 0, rate: 20, amount: 200 },
    ] },
    { id: "d2", no: "DL-2209", date: today, shift: "morning", customerId: "c2", routeId: "r1", driverId: "s1", status: "Loaded", amount: 240, lines: [
      { productId: "p20", filled: 6, emptyBack: 4, rate: 40, amount: 240 },
    ] },
    ...julyCraffleDeliveries(),
  ],
  payments: [
    { id: "pay0", date: "01/08/2026", customerId: "c0", amount: 2120, mode: "UPI", status: "Settled", note: "Against past due" },
    { id: "pay1", date: today, customerId: "c1", amount: 520, mode: "UPI", status: "Settled", note: "" },
    { id: "pay2", date: "21/08/2026", customerId: "c2", amount: 200, mode: "Cash", status: "Partial", note: "" },
  ],
  invoices: [{
    id: "inv-2905",
    no: "2905",
    date: "22/08/2026",
    customerId: "c0",
    period: "July 2026",
    periodFrom: "1-Jul-2026",
    periodTo: "31-Jul-2026",
    generatedAt: "22-August-2026",
    groupName: "Daily",
    balanceProduct: 34,
    deposit: 0,
    pastDue: 2120,
    paid: 2120,
    subtotal: 680,
    amountToPay: 680,
    gst: 0,
    total: 680,
    status: "Due",
    sentAt: null,
    lines: [{ product: "Jar", qty: 17, rate: 40, amount: 680 }],
    daily: Array.from({ length: 31 }, (_, i) => JULY_CRAFFLE[i + 1] || 0),
  }],
  events: [],
  expenses: [
    { id: "x1", date: "20/07/2026", kind: "raw_material", what: "RO filters + salt", amount: 4200, who: "Store", status: "Paid" },
    { id: "x2", date: "22/07/2026", kind: "labour", what: "Plant loading — 3 days", amount: 1800, who: "Ramesh", status: "Paid" },
    { id: "x3", date: "01/08/2026", kind: "salary", what: "July salary — Ramesh", amount: 14000, who: "Ramesh", status: "Paid" },
    { id: "x4", date: today, kind: "diesel", what: "Tempo — store route", amount: 1800, who: "Ramesh", status: "Open" },
    { id: "x5", date: today, kind: "petrol", what: "Bike — collections", amount: 600, who: "Kavita", status: "Open" },
  ],
});

function isPlaceholderSeller(a: Agency) {
  return (
    a.address === "One store" ||
    a.logo === "P" ||
    a.pay.upi === "petal@ybl" ||
    a.pay.accountNo === "00000000000" ||
    a.pay.accountName === "PETAL"
  );
}

function withSeller(a: Agency): Agency {
  if (!isPlaceholderSeller(a)) return a;
  const s = seed();
  return { ...a, name: s.name, store: s.store, address: s.address, phone: s.phone, logo: s.logo, pay: s.pay };
}

function load(): Agency {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Agency;
      return withSeller({
        ...seed(),
        ...parsed,
        slug: parsed.slug || "petal",
        planId: parsed.planId || "route",
      });
    }
  } catch { /* ignore */ }
  return seed();
}

let agency = load();
const listeners = new Set<() => void>();

export function getAgency() { return agency; }
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function commit() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(agency));
  }
  listeners.forEach((fn) => fn());
}

export function resetDemo() {
  agency = seed();
  commit();
}

export function setLang(lang: "en" | "hi") {
  agency = { ...agency, lang };
  commit();
}

export function product(id: string) { return agency.products.find((p) => p.id === id); }
export function customer(id: string) { return agency.customers.find((c) => c.id === id); }
export function staff(id: string) { return agency.staff.find((s) => s.id === id); }
export function route(id: string) { return agency.routes.find((r) => r.id === id); }

export function rateFor(c: Customer, p: Product) {
  return c.rateOverrides[p.id] ?? p.rate;
}

export function setDeliveryLine(id: string, filled: number, emptyBack: number) {
  agency = {
    ...agency,
    deliveries: agency.deliveries.map((d) => {
      if (d.id !== id) return d;
      const rate = d.lines[0]?.rate ?? 40;
      const f = Math.max(0, filled);
      const e = Math.max(0, emptyBack);
      const line = d.lines[0] ?? { productId: "p20", filled: 0, emptyBack: 0, rate, amount: 0 };
      return { ...d, amount: f * rate, lines: [{ ...line, filled: f, emptyBack: e, amount: f * rate }] };
    }),
  };
  commit();
}

export function markDelivery(id: string, status: DelStatus) {
  const d = agency.deliveries.find((x) => x.id === id);
  if (!d) return;
  let customers = agency.customers;
  let products = agency.products;
  if (status === "Delivered" && d.status !== "Delivered") {
    const empties = d.lines.reduce((n, l) => n + (product(l.productId)?.returnable ? l.filled - l.emptyBack : 0), 0);
    customers = customers.map((c) =>
      c.id === d.customerId ? { ...c, jarsOut: c.jarsOut + empties, credit: c.credit + d.amount } : c,
    );
    products = products.map((p) => {
      const line = d.lines.find((l) => l.productId === p.id);
      if (!line) return p;
      return { ...p, stockFilled: p.stockFilled - line.filled, stockEmpty: p.stockEmpty + line.emptyBack };
    });
  }
  agency = {
    ...agency,
    customers,
    products,
    deliveries: agency.deliveries.map((x) => (x.id === id ? { ...x, status } : x)),
  };
  commit();
}

export function addDelivery(input: { customerId: string; filled: number; emptyBack: number; shift: Shift; date?: string }) {
  const c = customer(input.customerId);
  const p = product("p20");
  if (!c || !p || input.filled < 1) return;
  const rate = rateFor(c, p);
  const amount = input.filled * rate;
  const row: Delivery = {
    id: `d${Date.now()}`,
    no: `DL-${String(agency.deliveries.length + 1).padStart(4, "0")}`,
    date: input.date || today,
    shift: input.shift,
    customerId: c.id,
    routeId: "r1",
    driverId: agency.staff.find((s) => s.role === "staff")?.id || "s1",
    status: "Planned",
    amount,
    lines: [{ productId: "p20", filled: input.filled, emptyBack: input.emptyBack, rate, amount }],
  };
  agency = { ...agency, deliveries: [row, ...agency.deliveries] };
  commit();
}

export function payExpense(id: string) {
  agency = { ...agency, expenses: agency.expenses.map((e) => (e.id === id ? { ...e, status: "Paid" } : e)) };
  commit();
}

export function adjustStock(productId: string, filledDelta: number, emptyDelta: number) {
  agency = {
    ...agency,
    products: agency.products.map((p) =>
      p.id === productId
        ? { ...p, stockFilled: Math.max(0, p.stockFilled + filledDelta), stockEmpty: Math.max(0, p.stockEmpty + emptyDelta) }
        : p,
    ),
  };
  commit();
}

export function collectPayment(customerId: string, amount: number, mode: PayMode) {
  const id = `pay${Date.now()}`;
  agency = {
    ...agency,
    payments: [{ id, date: today, customerId, amount, mode, status: "Settled", note: "Collected on route" }, ...agency.payments],
    customers: agency.customers.map((c) => c.id === customerId ? { ...c, credit: Math.max(0, c.credit - amount) } : c),
  };
  commit();
}

export function pauseCustomer(id: string, until: string | null) {
  agency = { ...agency, customers: agency.customers.map((c) => c.id === id ? { ...c, pausedUntil: until } : c) };
  commit();
}

function dayFromDate(date: string) {
  const [dd, mm] = date.split("/");
  return { day: Number(dd), month: Number(mm) };
}

export function updateStore(input: { name?: string; store?: string; address?: string; phone?: string; pay?: Agency["pay"] }) {
  agency = {
    ...agency,
    name: input.name ?? agency.name,
    store: input.store ?? agency.store,
    address: input.address ?? agency.address,
    phone: input.phone ?? agency.phone,
    pay: input.pay ?? agency.pay,
  };
  commit();
}

export function generateInvoices(month = 7, year = 2026) {
  const monthName = new Date(year, month - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
  const extra: Invoice[] = agency.customers.filter((c) => !c.discarded && !agency.invoices.some((i) => i.customerId === c.id && i.period === monthName)).map((c, i) => {
    const delivered = agency.deliveries.filter((d) => {
      if (d.customerId !== c.id || d.status !== "Delivered") return false;
      const p = dayFromDate(d.date);
      return p.month === month;
    });
    const daily = Array.from({ length: 31 }, () => 0);
    const byProduct = new Map<string, { qty: number; rate: number }>();
    for (const d of delivered) {
      const day = dayFromDate(d.date).day;
      for (const line of d.lines) {
        daily[day - 1] += line.filled;
        const p = product(line.productId);
        const name = p?.name === "20L Jar" ? "Jar" : (p?.name || line.productId);
        const cur = byProduct.get(name) || { qty: 0, rate: line.rate };
        byProduct.set(name, { qty: cur.qty + line.filled, rate: line.rate });
      }
    }
    const lines = [...byProduct.entries()].map(([name, v]) => ({
      product: name, qty: v.qty, rate: v.rate, amount: v.qty * v.rate,
    }));
    const subtotal = lines.reduce((n, l) => n + l.amount, 0);
    const paidInPeriod = agency.payments
      .filter((p) => p.customerId === c.id)
      .reduce((n, p) => n + p.amount, 0);
    const pastDue = c.opening;
    const paid = Math.min(paidInPeriod, pastDue);
    const amountToPay = subtotal + pastDue - paid;
    return {
      id: `igen${Date.now()}${i}`,
      no: String(2905 + i),
      date: today,
      customerId: c.id,
      period: monthName,
      periodFrom: `1-${monthName}`,
      periodTo: `31-${monthName}`,
      generatedAt: "22-August-2026",
      groupName: c.group,
      balanceProduct: c.jarsOut,
      deposit: 0,
      pastDue,
      paid,
      subtotal,
      amountToPay,
      gst: 0,
      total: amountToPay,
      status: (amountToPay <= 0 ? "Paid" : "Due") as InvStatus,
      sentAt: null,
      lines: lines.length ? lines : [{ product: "Jar", qty: 0, rate: 40, amount: 0 }],
      daily,
    };
  });
  agency = { ...agency, invoices: [...extra, ...agency.invoices] };
  commit();
  return extra.length;
}

export function addExpense(input: Omit<Expense, "id">) {
  agency = { ...agency, expenses: [{ ...input, id: `x${Date.now()}` }, ...agency.expenses] };
  commit();
}

export function addStaff(name: string, phone: string, role: Staff["role"]) {
  if (agency.staff.length >= MAX_USERS) return { ok: false as const, message: `Max ${MAX_USERS} users for this store.` };
  agency = {
    ...agency,
    staff: [...agency.staff, { id: `s${Date.now()}`, name, phone, role, pin: "0000", routeId: "r1", salary: 0, advance: 0, expenses: 0 }],
  };
  commit();
  return { ok: true as const };
}

export function discardCustomer(id: string, discarded: boolean) {
  agency = { ...agency, customers: agency.customers.map((c) => (c.id === id ? { ...c, discarded } : c)) };
  commit();
}

export function setCustomerGroup(id: string, group: string) {
  agency = { ...agency, customers: agency.customers.map((c) => (c.id === id ? { ...c, group } : c)) };
  commit();
}

export function setCustomerRate(id: string, productId: string, rate: number) {
  agency = {
    ...agency,
    customers: agency.customers.map((c) =>
      c.id === id ? { ...c, rateOverrides: { ...c.rateOverrides, [productId]: rate } } : c,
    ),
  };
  commit();
}

export function bulkDeliverGroup(group: string) {
  const ids = agency.customers.filter((c) => c.group === group && !c.discarded).map((c) => c.id);
  for (const d of agency.deliveries) {
    if (ids.includes(d.customerId) && d.status !== "Delivered") markDelivery(d.id, "Delivered");
  }
}

export function markOffline(id: string) {
  agency = {
    ...agency,
    deliveries: agency.deliveries.map((d) => (d.id === id ? { ...d, offline: true, status: "Loaded" } : d)),
  };
  commit();
}

export function syncOffline() {
  for (const d of agency.deliveries.filter((x) => x.offline && x.status !== "Delivered")) {
    markDelivery(d.id, "Delivered");
  }
  agency = {
    ...agency,
    deliveries: agency.deliveries.map((d) => (d.offline ? { ...d, offline: false } : d)),
  };
  commit();
}

export function importCustomersCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).slice(1);
  let n = 0;
  for (const line of lines) {
    const [name, phone, area, routeId, opening] = line.split(",").map((x) => x?.trim());
    if (!name || !phone) continue;
    addCustomer({ name, phone, area: area || "Imported", routeId: routeId === "R2" || routeId === "r2" ? "r2" : "r1" });
    const id = agency.customers[agency.customers.length - 1]?.id;
    const open = Number(opening || 0);
    if (id && open) {
      agency = {
        ...agency,
        customers: agency.customers.map((c) => (c.id === id ? { ...c, opening: open, credit: c.credit + open } : c)),
      };
    }
    n += 1;
  }
  commit();
  return n;
}

export function invoiceById(id: string) {
  return agency.invoices.find((i) => i.id === id);
}

export function reportCsv() {
  const rows = [
    "Report,Value",
    ...agency.customers.map((c) => `Outstanding ${c.name},${c.credit}`),
    ...agency.products.map((p) => `Stock filled ${p.name},${p.stockFilled}`),
    ...agency.expenses.map((e) => `Expense ${e.kind} ${e.what},${e.amount}`),
  ];
  return rows.join("\n");
}

export function addCustomer(partial: Pick<Customer, "name" | "phone" | "area" | "routeId"> & { opening?: number; jarsOut?: number }) {
  const id = `c${Date.now()}`;
  const opening = partial.opening || 0;
  agency = {
    ...agency,
    customers: [...agency.customers, {
      id,
      name: partial.name,
      phone: partial.phone,
      area: partial.area,
      routeId: partial.routeId,
      group: "Daily",
      jarsOut: partial.jarsOut || 0,
      jarLimit: 40,
      credit: opening,
      opening,
      rateOverrides: {},
      days: ["Daily"],
      qty: 2,
      pausedUntil: null,
      pin: "0000",
    }],
  };
  commit();
}

export function loginByPhone(phone: string, pin: string): { role: Role; id: string } | null {
  const s = agency.staff.find((x) => x.phone === phone && x.pin === pin);
  if (s) return { role: s.role, id: s.id };
  const c = agency.customers.find((x) => x.phone === phone && x.pin === pin);
  if (c) return { role: "customer", id: c.id };
  return null;
}

export function money(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "·";
}

export function todayStats() {
  const todayD = agency.deliveries.filter((d) => d.date === today);
  const done = todayD.filter((d) => d.status === "Delivered");
  const left = todayD.filter((d) => d.status !== "Delivered" && d.status !== "Skipped");
  const jars = todayD.reduce((n, d) => n + d.lines.filter((l) => l.productId === "p20").reduce((a, l) => a + l.filled, 0), 0);
  const collect = todayD.reduce((n, d) => n + d.amount, 0);
  const received = agency.payments.filter((p) => p.date === today).reduce((n, p) => n + p.amount, 0);
  const due = agency.customers.reduce((n, c) => n + c.credit, 0);
  return { todayD, done, left, jars, collect, received, due, total: todayD.length };
}
