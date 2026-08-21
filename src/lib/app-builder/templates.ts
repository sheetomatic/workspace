import type {
  AppConfig,
  AppFormField,
  AppRelated,
  AppUser,
  AppView,
  CellValue,
  CollectionStyle,
  SheetRow,
  SheetWorkbook,
} from "./index";

export interface AppPlan {
  id: string;
  label: string;
  blurb: string;
  prompt: string;
  config: AppConfig;
  workbook: SheetWorkbook;
}

function fields(cols: string[], required: string[] = []): AppFormField[] {
  return cols.map((col) => ({
    name: col.toLowerCase().replace(/\s+/g, ""),
    label: col,
    col,
    type: /qty|rate|amount|stock|days|hours|price|count/i.test(col)
      ? "number"
      : /date/i.test(col)
        ? "date"
        : "text",
    required: required.includes(col),
  }));
}

function view(
  partial: Omit<AppView, "kind" | "hub" | "cols"> & {
    hub?: string;
    cols?: string[];
  },
): AppView {
  return {
    collectionStyle: "list",
    ...partial,
    kind: "deck",
    hub: partial.hub ?? "App",
    cols: partial.cols ?? [],
  };
}

function rel(
  partial: Omit<AppRelated, "parentKeys" | "childKeys" | "cols"> &
    Partial<Pick<AppRelated, "parentKeys" | "childKeys" | "cols" | "addFields">>,
): AppRelated {
  return {
    ...partial,
    parentKeys: partial.parentKeys ?? [],
    childKeys: partial.childKeys ?? [],
    cols: partial.cols ?? [],
  };
}

function row(n: number, cells: Record<string, CellValue>): SheetRow {
  return { _row: n, cells };
}

function book(
  title: string,
  tabs: Record<string, { headers: string[]; rows: Record<string, CellValue>[] }>,
): SheetWorkbook {
  const out: SheetWorkbook = { title, tabs: {} };
  for (const [name, t] of Object.entries(tabs)) {
    out.tabs[name] = {
      name,
      headers: t.headers,
      rows: t.rows.map((cells, i) => row(i + 2, cells)),
    };
  }
  return out;
}

const owner: AppUser[] = [
  { id: "owner", name: "Owner", pin: "1234", role: "owner", phone: "9876543210" },
  { id: "staff", name: "Staff", pin: "0000", role: "staff", phone: "9123456780" },
];

function baseMeta(name: string, formTitle: string): AppConfig["meta"] {
  return {
    name,
    version: 1,
    plan: "free",
    themeAccent: "#111113",
    requirePin: false,
    formTitle,
  };
}

export const TEMPLATES: AppPlan[] = [
  {
    id: "custom",
    label: "Custom",
    blurb: "One table you name — Title, Status, Notes",
    prompt: "custom blank app with one table",
    config: {
      meta: baseMeta("My app", "New record"),
      hubs: ["App"],
      users: owner,
      views: [
        view({
          id: "records",
          name: "Records",
          tab: "Records",
          titleCol: "Title",
          subtitleCol: "Status",
          statusCol: "Status",
          cols: ["Title", "Status", "Notes"],
          addFields: fields(["Title", "Status", "Notes"], ["Title"]),
          editFields: fields(["Title", "Status", "Notes"], ["Title"]),
        }),
      ],
      related: [],
    },
    workbook: book("My app Sheet", {
      Records: {
        headers: ["Title", "Status", "Notes"],
        rows: [
          { Title: "First record", Status: "Open", Notes: "Change these columns in Data" },
        ],
      },
    }),
  },
  {
    id: "orders",
    label: "Orders",
    blurb: "Parties, items, line items",
    prompt: "orders desk with parties items and a form",
    config: {
      meta: baseMeta("Orders Desk", "New order"),
      hubs: ["Sales", "Master"],
      users: owner,
      views: [
        view({
          id: "orders",
          hub: "Sales",
          name: "Orders",
          tab: "Orders",
          titleCol: "Order No",
          subtitleCol: "Party",
          statusCol: "Status",
          cols: ["Order No", "Date", "Party", "Status", "Amount"],
          sliceCols: ["Order No"],
          collectionStyle: "list",
          addFields: fields(["Order No", "Party", "Date", "Amount"], ["Order No", "Party"]),
          editFields: fields(["Party", "Status", "Amount"], ["Party", "Status"]),
        }),
        view({
          id: "order-lines",
          hub: "Sales",
          name: "Lines",
          tab: "Order Lines",
          nav: false,
          titleCol: "Item",
          subtitleCol: "Order No",
          cols: ["Order No", "Item", "Qty", "Rate", "Line Amount"],
          addFields: fields(["Order No", "Item", "Qty", "Rate"], ["Order No", "Item", "Qty"]),
        }),
        view({
          id: "parties",
          hub: "Master",
          name: "Parties",
          tab: "Parties",
          titleCol: "Party Name",
          subtitleCol: "City",
          phoneCol: "Phone",
          cols: ["Party Name", "Phone", "City"],
          addFields: fields(["Party Name", "Phone", "City"], ["Party Name"]),
        }),
        view({
          id: "items",
          hub: "Master",
          name: "Items",
          tab: "Items",
          titleCol: "Item",
          subtitleCol: "Unit",
          collectionStyle: "cards",
          cols: ["Item", "Unit", "Rate"],
          addFields: fields(["Item", "Unit", "Rate"], ["Item"]),
        }),
      ],
      related: [
        rel({
          id: "ol",
          name: "Lines",
          parentViewId: "orders",
          childTab: "Order Lines",
          parentKeys: ["Order No"],
          childKeys: ["Order No"],
          cols: ["Item", "Qty", "Rate", "Line Amount"],
          addFields: fields(["Item", "Qty", "Rate"], ["Item", "Qty"]),
        }),
        rel({
          id: "po",
          name: "Orders",
          parentViewId: "parties",
          childTab: "Orders",
          parentKeys: ["Party Name"],
          childKeys: ["Party"],
          cols: ["Order No", "Date", "Status", "Amount"],
        }),
      ],
    },
    workbook: book("Orders Sheet", {
      Orders: {
        headers: ["Order No", "Date", "Party", "Status", "Amount"],
        rows: [
          { "Order No": "SO-1001", Date: "18/08/2026", Party: "SM Traders", Status: "Open", Amount: 125000 },
          { "Order No": "SO-1002", Date: "19/08/2026", Party: "East Steel", Status: "Dispatched", Amount: 84000 },
        ],
      },
      "Order Lines": {
        headers: ["Order No", "Item", "Qty", "Rate", "Line Amount"],
        rows: [
          { "Order No": "SO-1001", Item: "TMT 12mm", Qty: 10, Rate: 5200, "Line Amount": 52000 },
          { "Order No": "SO-1002", Item: "TMT 10mm", Qty: 20, Rate: 4200, "Line Amount": 84000 },
        ],
      },
      Parties: {
        headers: ["Party Name", "Phone", "City"],
        rows: [
          { "Party Name": "SM Traders", Phone: "9876543210", City: "Raipur" },
          { "Party Name": "East Steel", Phone: "9123456780", City: "Bilaspur" },
        ],
      },
      Items: {
        headers: ["Item", "Unit", "Rate"],
        rows: [
          { Item: "TMT 12mm", Unit: "MT", Rate: 5200 },
          { Item: "TMT 10mm", Unit: "MT", Rate: 4200 },
        ],
      },
    }),
  },
  {
    id: "crm",
    label: "CRM",
    blurb: "Leads, follow-ups, parties",
    prompt: "crm leads and follow ups",
    config: {
      meta: baseMeta("Sales CRM", "New lead"),
      hubs: ["Sales"],
      users: owner,
      views: [
        view({
          id: "leads",
          name: "Leads",
          tab: "Leads",
          titleCol: "Name",
          subtitleCol: "Company",
          statusCol: "Stage",
          phoneCol: "Phone",
          collectionStyle: "kanban",
          cols: ["Name", "Company", "Phone", "Stage", "Value"],
          addFields: fields(["Name", "Company", "Phone", "Stage", "Value"], ["Name"]),
          editFields: fields(["Stage", "Value", "Phone"], ["Stage"]),
        }),
        view({
          id: "followups",
          name: "Follow-ups",
          tab: "Follow-ups",
          titleCol: "Note",
          subtitleCol: "Lead",
          cols: ["Lead", "Date", "Note", "Next"],
          addFields: fields(["Lead", "Date", "Note", "Next"], ["Lead", "Note"]),
        }),
      ],
      related: [
        rel({
          id: "lf",
          name: "Follow-ups",
          parentViewId: "leads",
          childTab: "Follow-ups",
          parentKeys: ["Name"],
          childKeys: ["Lead"],
          cols: ["Date", "Note", "Next"],
          addFields: fields(["Date", "Note", "Next"], ["Note"]),
        }),
      ],
    },
    workbook: book("CRM Sheet", {
      Leads: {
        headers: ["Name", "Company", "Phone", "Stage", "Value"],
        rows: [
          { Name: "Amit", Company: "Bafna Steels", Phone: "9811111111", Stage: "New", Value: 80000 },
          { Name: "Rina", Company: "East Infra", Phone: "9822222222", Stage: "Quote", Value: 240000 },
          { Name: "Vikas", Company: "SM Traders", Phone: "9833333333", Stage: "Won", Value: 125000 },
        ],
      },
      "Follow-ups": {
        headers: ["Lead", "Date", "Note", "Next"],
        rows: [
          { Lead: "Amit", Date: "19/08/2026", Note: "Asked for 12mm rate", Next: "Call tomorrow" },
          { Lead: "Rina", Date: "18/08/2026", Note: "Sent quotation", Next: "Visit Friday" },
        ],
      },
    }),
  },
  {
    id: "inventory",
    label: "Inventory",
    blurb: "Items, in, out",
    prompt: "inventory stock in stock out",
    config: {
      meta: baseMeta("Inventory", "Stock movement"),
      hubs: ["Store"],
      users: owner,
      views: [
        view({
          id: "items",
          name: "Items",
          tab: "Items",
          titleCol: "Item",
          subtitleCol: "Location",
          collectionStyle: "cards",
          cols: ["Item", "Unit", "Stock", "Location"],
          addFields: fields(["Item", "Unit", "Stock", "Location"], ["Item"]),
        }),
        view({
          id: "in",
          name: "Stock in",
          tab: "Stock In",
          titleCol: "Item",
          subtitleCol: "Vendor",
          cols: ["Date", "Item", "Qty", "Vendor"],
          addFields: fields(["Date", "Item", "Qty", "Vendor"], ["Item", "Qty"]),
        }),
        view({
          id: "out",
          name: "Stock out",
          tab: "Stock Out",
          titleCol: "Item",
          subtitleCol: "Issued to",
          cols: ["Date", "Item", "Qty", "Issued to"],
          addFields: fields(["Date", "Item", "Qty", "Issued to"], ["Item", "Qty"]),
        }),
      ],
      related: [
        rel({
          id: "ii",
          name: "Stock in",
          parentViewId: "items",
          childTab: "Stock In",
          parentKeys: ["Item"],
          childKeys: ["Item"],
          cols: ["Date", "Qty", "Vendor"],
        }),
        rel({
          id: "io",
          name: "Stock out",
          parentViewId: "items",
          childTab: "Stock Out",
          parentKeys: ["Item"],
          childKeys: ["Item"],
          cols: ["Date", "Qty", "Issued to"],
        }),
      ],
    },
    workbook: book("Inventory Sheet", {
      Items: {
        headers: ["Item", "Unit", "Stock", "Location"],
        rows: [
          { Item: "TMT 12mm", Unit: "MT", Stock: 42, Location: "Yard A" },
          { Item: "Binding wire", Unit: "Kg", Stock: 180, Location: "Store" },
        ],
      },
      "Stock In": {
        headers: ["Date", "Item", "Qty", "Vendor"],
        rows: [{ Date: "18/08/2026", Item: "TMT 12mm", Qty: 20, Vendor: "Rashtriya" }],
      },
      "Stock Out": {
        headers: ["Date", "Item", "Qty", "Issued to"],
        rows: [{ Date: "19/08/2026", Item: "TMT 12mm", Qty: 8, "Issued to": "Site 2" }],
      },
    }),
  },
  {
    id: "attendance",
    label: "Attendance",
    blurb: "Staff, in/out, leave",
    prompt: "attendance and leave",
    config: {
      meta: baseMeta("Attendance", "Mark attendance"),
      hubs: ["HR"],
      users: owner,
      views: [
        view({
          id: "staff",
          name: "Staff",
          tab: "Staff",
          titleCol: "Name",
          subtitleCol: "Role",
          phoneCol: "Phone",
          cols: ["Name", "Role", "Phone", "Shift"],
          addFields: fields(["Name", "Role", "Phone", "Shift"], ["Name"]),
        }),
        view({
          id: "att",
          name: "Attendance",
          tab: "Attendance",
          titleCol: "Name",
          subtitleCol: "Date",
          statusCol: "Status",
          collectionStyle: "table",
          cols: ["Date", "Name", "In", "Out", "Status"],
          addFields: fields(["Date", "Name", "In", "Out", "Status"], ["Date", "Name"]),
        }),
        view({
          id: "leave",
          name: "Leave",
          tab: "Leave",
          titleCol: "Name",
          subtitleCol: "Type",
          statusCol: "Status",
          cols: ["Name", "Type", "From", "To", "Status"],
          addFields: fields(["Name", "Type", "From", "To"], ["Name", "Type"]),
        }),
      ],
      related: [
        rel({
          id: "sa",
          name: "Attendance",
          parentViewId: "staff",
          childTab: "Attendance",
          parentKeys: ["Name"],
          childKeys: ["Name"],
          cols: ["Date", "In", "Out", "Status"],
        }),
      ],
    },
    workbook: book("Attendance Sheet", {
      Staff: {
        headers: ["Name", "Role", "Phone", "Shift"],
        rows: [
          { Name: "Raju", Role: "Loader", Phone: "9000000001", Shift: "Day" },
          { Name: "Sita", Role: "Accounts", Phone: "9000000002", Shift: "Day" },
        ],
      },
      Attendance: {
        headers: ["Date", "Name", "In", "Out", "Status"],
        rows: [
          { Date: "19/08/2026", Name: "Raju", In: "9:02", Out: "18:10", Status: "Present" },
          { Date: "19/08/2026", Name: "Sita", In: "9:30", Out: "17:45", Status: "Present" },
        ],
      },
      Leave: {
        headers: ["Name", "Type", "From", "To", "Status"],
        rows: [{ Name: "Raju", Type: "Casual", From: "22/08/2026", To: "22/08/2026", Status: "Open" }],
      },
    }),
  },
  {
    id: "visitors",
    label: "Visitors",
    blurb: "Gate in/out",
    prompt: "visitor tracking at gate",
    config: {
      meta: baseMeta("Gate visitors", "New visitor"),
      hubs: ["Gate"],
      users: owner,
      views: [
        view({
          id: "visitors",
          name: "Visitors",
          tab: "Visitors",
          titleCol: "Name",
          subtitleCol: "To meet",
          statusCol: "Status",
          phoneCol: "Phone",
          cols: ["Name", "Phone", "To meet", "Purpose", "In", "Status"],
          addFields: fields(["Name", "Phone", "To meet", "Purpose", "In"], ["Name", "To meet"]),
          editFields: fields(["Status", "Out"], ["Status"]),
        }),
      ],
      related: [],
    },
    workbook: book("Visitors Sheet", {
      Visitors: {
        headers: ["Name", "Phone", "To meet", "Purpose", "In", "Out", "Status"],
        rows: [
          { Name: "Courier", Phone: "9898989898", "To meet": "Stores", Purpose: "Delivery", In: "10:12", Out: "", Status: "Inside" },
          { Name: "Tax consultant", Phone: "9777777777", "To meet": "Owner", Purpose: "GST", In: "11:00", Out: "12:10", Status: "Out" },
        ],
      },
    }),
  },
  {
    id: "expenses",
    label: "Expenses",
    blurb: "Cash out, approve",
    prompt: "expense tracker",
    config: {
      meta: baseMeta("Expenses", "New expense"),
      hubs: ["Accounts"],
      users: owner,
      views: [
        view({
          id: "exp",
          name: "Expenses",
          tab: "Expenses",
          titleCol: "What",
          subtitleCol: "Paid by",
          statusCol: "Status",
          collectionStyle: "list",
          cols: ["Date", "What", "Amount", "Paid by", "Status"],
          addFields: fields(["Date", "What", "Amount", "Paid by"], ["What", "Amount"]),
          editFields: fields(["Status", "Amount"], ["Status"]),
        }),
      ],
      related: [],
    },
    workbook: book("Expenses Sheet", {
      Expenses: {
        headers: ["Date", "What", "Amount", "Paid by", "Status"],
        rows: [
          { Date: "18/08/2026", What: "Diesel", Amount: 4200, "Paid by": "Raju", Status: "Open" },
          { Date: "19/08/2026", What: "Tea + snacks", Amount: 380, "Paid by": "Office", Status: "Paid" },
        ],
      },
    }),
  },
  {
    id: "tasks",
    label: "Tasks",
    blurb: "Assign and close",
    prompt: "task list for team",
    config: {
      meta: baseMeta("Tasks", "New task"),
      hubs: ["Work"],
      users: owner,
      views: [
        view({
          id: "tasks",
          name: "Tasks",
          tab: "Tasks",
          titleCol: "Task",
          subtitleCol: "Owner",
          statusCol: "Status",
          collectionStyle: "kanban",
          cols: ["Task", "Owner", "Due", "Status"],
          addFields: fields(["Task", "Owner", "Due", "Status"], ["Task"]),
          editFields: fields(["Status", "Owner", "Due"], ["Status"]),
        }),
      ],
      related: [],
    },
    workbook: book("Tasks Sheet", {
      Tasks: {
        headers: ["Task", "Owner", "Due", "Status"],
        rows: [
          { Task: "Load 12mm for SM Traders", Owner: "Raju", Due: "20/08/2026", Status: "Open" },
          { Task: "Send GST invoice", Owner: "Sita", Due: "19/08/2026", Status: "Doing" },
          { Task: "Call East Steel", Owner: "Owner", Due: "19/08/2026", Status: "Done" },
        ],
      },
    }),
  },
];

export function styleLabel(style?: CollectionStyle): string {
  if (style === "cards") return "Cards";
  if (style === "table") return "Table";
  if (style === "kanban") return "Board";
  return "List";
}
