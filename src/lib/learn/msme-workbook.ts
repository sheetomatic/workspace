import * as XLSX from "xlsx";

/** Fictional Raipur electrical shop used across the Sheets track. */
export const MSME_FIRM = {
  name: "Shree Kailash Electricals",
  city: "Tatibandh, Raipur",
  owner: "Ramesh Sahu",
  gstin: "22AABCK1234L1Z5",
};

export const LEARN_WORKBOOK_FILENAME = "kailash-electricals-training.xlsx";

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const CITIES = [
  "Raipur",
  "Bhilai",
  "Durg",
  "Bilaspur",
  "Rajnandgaon",
  "Raigarh",
  "Dhamtari",
  "Mahasamund",
];

const SALESMEN = ["Amit", "Pooja", "Suresh", "Neha", "Ravi"];

const PRODUCTS: Array<[string, string, string, number, number, number]> = [
  ["KE-MCB-06", "MCB 6A single pole", "Switchgear", 92, 18, 140],
  ["KE-MCB-16", "MCB 16A single pole", "Switchgear", 118, 18, 210],
  ["KE-MCB-32", "MCB 32A double pole", "Switchgear", 245, 18, 80],
  ["KE-RCCB-40", "RCCB 40A 30mA", "Switchgear", 1180, 18, 36],
  ["KE-DB-08", "DB 8-way metal", "Switchgear", 890, 18, 28],
  ["KE-WIRE-15", "1.5 sq mm FR wire 90m", "Cable", 1420, 18, 95],
  ["KE-WIRE-25", "2.5 sq mm FR wire 90m", "Cable", 2280, 18, 70],
  ["KE-WIRE-40", "4 sq mm FR wire 90m", "Cable", 3450, 18, 40],
  ["KE-CBL-16", "Armoured cable 16 sq mm", "Cable", 186, 18, 400],
  ["KE-LED-09", "LED bulb 9W", "Lighting", 68, 12, 320],
  ["KE-LED-20", "LED panel 20W", "Lighting", 245, 12, 160],
  ["KE-LED-36", "LED batten 36W", "Lighting", 310, 12, 120],
  ["KE-FAN-12", "Ceiling fan 1200mm", "Fans", 1680, 18, 55],
  ["KE-FAN-EX", "Exhaust fan 9 inch", "Fans", 890, 18, 40],
  ["KE-SW-1W", "1-way switch 6A", "Switches", 28, 18, 800],
  ["KE-SW-2W", "2-way switch 6A", "Switches", 42, 18, 420],
  ["KE-SKT-16", "Socket 16A", "Switches", 78, 18, 260],
  ["KE-CON-20", "PVC conduit 20mm 3m", "Conduit", 42, 18, 600],
  ["KE-CON-25", "PVC conduit 25mm 3m", "Conduit", 58, 18, 380],
  ["KE-TAPE", "Insulation tape red", "Consumable", 12, 18, 900],
  ["KE-TAPE-B", "Insulation tape black", "Consumable", 12, 18, 880],
  ["KE-GLAND", "Cable gland 3/4", "Consumable", 18, 18, 350],
  ["KE-LUG-16", "Copper lug 16 sq mm", "Consumable", 9, 18, 700],
  ["KE-PANEL", "Feeder pillar 4-way", "Panel", 12400, 18, 8],
  ["KE-INV-850", "Home inverter 850VA", "Power", 4200, 18, 18],
  ["KE-BAT-150", "Tubular battery 150Ah", "Power", 11800, 18, 12],
  ["KE-STAB", "Stabilizer 5A", "Power", 1450, 18, 22],
  ["KE-EXT-5", "Extension board 5m", "Accessories", 320, 18, 90],
  ["KE-HOLD", "Batten holder", "Accessories", 22, 18, 240],
  ["KE-CAP", "Fan capacitor 2.5 mfd", "Accessories", 35, 18, 180],
];

const FIRST = [
  "Ramesh", "Sunita", "Deepak", "Kavita", "Manoj", "Anjali", "Vikas", "Preeti",
  "Gopal", "Nidhi", "Santosh", "Meena", "Ajay", "Bharti", "Hemant", "Lata",
  "Prakash", "Usha", "Yogesh", "Rekha",
];
const LAST = [
  "Sahu", "Verma", "Patel", "Agrawal", "Jaiswal", "Tiwari", "Yadav", "Sharma",
  "Dewangan", "Kashyap", "Chandrakar", "Soni",
];

function ymd(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function buildMsmeWorkbookAoa() {
  const rand = mulberry32(20260816);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)]!;

  const customers: Array<(string | number)[]> = [
    ["Cust ID", "Name", "City", "Phone", "GSTIN", "Credit days", "Owner"],
  ];
  for (let i = 1; i <= 80; i += 1) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const city = pick(CITIES);
    const credit = pick([0, 7, 15, 21, 30]);
    customers.push([
      `C${String(i).padStart(3, "0")}`,
      i % 17 === 0 ? `  ${name.toLowerCase()}  ` : name,
      city,
      `98${String(10000000 + Math.floor(rand() * 80000000)).slice(0, 8)}`,
      i % 5 === 0 ? "" : `22${pick(["AAB", "AAC", "AAD"])}K${1000 + i}L1Z${i % 9}`,
      credit,
      pick(SALESMEN),
    ]);
  }

  const products: Array<(string | number)[]> = [
    ["Item code", "Item name", "Category", "Rate", "GST %", "Min stock", "Rack"],
  ];
  PRODUCTS.forEach((row, index) => {
    products.push([
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      `A${1 + (index % 6)}-${1 + (index % 4)}`,
    ]);
  });

  const sales: Array<(string | number)[]> = [
    [
      "Inv no",
      "Date",
      "Cust ID",
      "Item code",
      "Qty",
      "Rate (type)",
      "Taxable",
      "GST %",
      "GST amt",
      "Total",
      "City",
      "Salesman",
      "Pay mode",
      "Status",
    ],
  ];

  let inv = 1400;
  let line = 0;
  for (let monthOffset = 0; monthOffset < 16; monthOffset += 1) {
    const year = monthOffset < 12 ? 2025 : 2026;
    const month = monthOffset < 12 ? monthOffset + 4 : monthOffset - 8;
    const invoicesThisMonth = 38 + Math.floor(rand() * 18);
    for (let n = 0; n < invoicesThisMonth; n += 1) {
      inv += 1;
      const day = 1 + Math.floor(rand() * 27);
      const date = ymd(year, month, day);
      const cust = customers[1 + Math.floor(rand() * (customers.length - 1))]!;
      const lines = 1 + Math.floor(rand() * 3);
      const status = rand() > 0.18 ? "Paid" : rand() > 0.45 ? "Partial" : "Overdue";
      const pay = pick(["UPI", "Cash", "NEFT", "Credit"]);
      for (let L = 0; L < lines; L += 1) {
        line += 1;
        const product = PRODUCTS[Math.floor(rand() * PRODUCTS.length)]!;
        const qty = 1 + Math.floor(rand() * (product[2] === "Cable" ? 12 : 6));
        const typedRate =
          rand() > 0.92 ? Math.round(product[3] * (0.9 + rand() * 0.2)) : product[3];
        const taxable = qty * typedRate;
        const gstAmt = Math.round(taxable * (product[4] / 100));
        sales.push([
          `KE-${inv}`,
          date,
          cust[0],
          product[0],
          qty,
          typedRate,
          taxable,
          product[4],
          gstAmt,
          taxable + gstAmt,
          String(cust[2]),
          String(cust[6] ?? pick(SALESMEN)),
          pay,
          status,
        ]);
      }
    }
  }

  const payments: Array<(string | number)[]> = [
    ["Txn", "Date", "Cust ID", "Amount", "Mode", "Ref"],
  ];
  for (let i = 1; i <= 420; i += 1) {
    const cust = customers[1 + Math.floor(rand() * (customers.length - 1))]!;
    const month = 1 + Math.floor(rand() * 12);
    payments.push([
      `TXN${22000 + i}`,
      ymd(2025 + (month > 10 ? 1 : 0), month > 10 ? month - 10 : month + 2, 1 + (i % 27)),
      cust[0],
      500 + Math.floor(rand() * 18000),
      pick(["UPI", "NEFT", "Cash", "Cheque"]),
      i % 9 === 0 ? "" : `UPI${800000 + i}`,
    ]);
  }

  const stock: Array<(string | number)[]> = [
    ["Item code", "Opening", "In", "Out", "Closing", "Min", "Alert"],
  ];
  PRODUCTS.forEach((row, index) => {
    const r = index + 2;
    const opening = row[5] + Math.floor(rand() * 80);
    const inn = Math.floor(rand() * 40);
    const out = Math.floor(rand() * 55);
    stock.push([
      row[0],
      opening,
      inn,
      out,
      { f: `B${r}+C${r}-D${r}` } as unknown as number,
      row[5],
      { f: `IF(E${r}<F${r},"REORDER","ok")` } as unknown as number,
    ]);
  });

  const dirty: Array<(string | number)[]> = [
    ["Raw name", "Phone", "City", "Item", "Qty"],
  ];
  for (let i = 0; i < 180; i += 1) {
    const name = `${pick(FIRST)}  ${pick(LAST).toUpperCase()}`;
    dirty.push([
      i % 6 === 0 ? ` ${name} ` : name,
      i % 8 === 0 ? `+91 ${9800000000 + i}` : `${9800000000 + i}`,
      i % 5 === 0 ? pick(CITIES).toUpperCase() : ` ${pick(CITIES)}`,
      i % 7 === 0 ? "mcb 16a" : pick(PRODUCTS)[1],
      i % 11 === 0 ? "" : 1 + (i % 5),
    ]);
  }

  const practice: Array<(string | number | { f: string })[]> = [
    [
      "Item code",
      "Name (VLOOKUP)",
      "List rate (VLOOKUP)",
      "Typed rate",
      "Rate OK?",
      "GST (XLOOKUP)",
      "Line GST",
      "Bill label (TEXTJOIN)",
    ],
  ];
  for (let i = 0; i < 40; i += 1) {
    const r = i + 2;
    const product = PRODUCTS[i % PRODUCTS.length]!;
    practice.push([
      product[0],
      { f: `IFERROR(VLOOKUP(A${r},Products!A:B,2,FALSE),"")` },
      { f: `IFERROR(VLOOKUP(A${r},Products!A:D,4,FALSE),"")` },
      product[3],
      { f: `IF(ABS(C${r}-D${r})>1,"CHECK RATE","ok")` },
      { f: `IFERROR(XLOOKUP(A${r},Products!A:A,Products!E:E),"")` },
      { f: `IFERROR(D${r}*F${r}/100,0)` },
      { f: `TEXTJOIN(" | ",TRUE,A${r},B${r})` },
    ]);
  }

  const dashboard: Array<(string | number | { f: string })[]> = [
    ["Shree Kailash Electricals — control sheet", "", "", "", ""],
    ["Do not type over yellow cells. Formulas read Sales / Products / Payments.", "", "", "", ""],
    ["", "", "", "", ""],
    ["This month taxable", { f: 'SUMIFS(Sales!G:G,Sales!B:B,">="&DATE(2026,8,1),Sales!B:B,"<"&DATE(2026,9,1))' }, "", "Overdue bills", { f: 'COUNTIF(Sales!N:N,"Overdue")' }],
    ["This month GST", { f: 'SUMIFS(Sales!I:I,Sales!B:B,">="&DATE(2026,8,1),Sales!B:B,"<"&DATE(2026,9,1))' }, "", "Blank GSTIN customers", { f: 'COUNTBLANK(Customers!E:E)-1' }],
    ["Paid lines", { f: 'COUNTIF(Sales!N:N,"Paid")' }, "", "Cities billed", { f: "COUNTA(UNIQUE(Sales!K2:K))" }],
    ["", "", "", "", ""],
    ["City", "Taxable", "Spark", "", ""],
    ...CITIES.map((city, index) => {
      const r = 9 + index;
      return [
        city,
        { f: `SUMIF(Sales!K:K,A${r},Sales!G:G)` },
        { f: `SPARKLINE(B${r},{"charttype","bar";"max",MAX($B$9:$B$16)})` },
        "",
        "",
      ];
    }),
    ["", "", "", "", ""],
    ["QUERY — overdue by salesman", "", "", "", ""],
    [{ f: 'QUERY(Sales!A:N,"select L, count(A), sum(J) where N = \'Overdue\' group by L label count(A) \'Bills\', sum(J) \'Value\'",1)' }, "", "", "", ""],
  ];

  const ageing: Array<(string | number | { f: string })[]> = [
    ["Inv no", "Date", "Cust ID", "Total", "Days out", "Bucket"],
  ];
  for (let i = 2; i <= 41; i += 1) {
    ageing.push([
      { f: `INDEX(Sales!A:A,${i + 20})` },
      { f: `INDEX(Sales!B:B,${i + 20})` },
      { f: `INDEX(Sales!C:C,${i + 20})` },
      { f: `INDEX(Sales!J:J,${i + 20})` },
      { f: `IF(B${i}="","",DAYS(TODAY(),B${i}))` },
      { f: `IFS(E${i}="", "",E${i}<=7,"0-7",E${i}<=15,"8-15",E${i}<=30,"16-30",TRUE,"30+")` },
    ]);
  }

  const gst: Array<(string | number | { f: string })[]> = [
    ["GST %", "Taxable", "GST"],
    [12, { f: "SUMIF(Sales!H:H,A2,Sales!G:G)" }, { f: "SUMIF(Sales!H:H,A2,Sales!I:I)" }],
    [18, { f: "SUMIF(Sales!H:H,A3,Sales!G:G)" }, { f: "SUMIF(Sales!H:H,A3,Sales!I:I)" }],
    ["Total", { f: "B2+B3" }, { f: "C2+C3" }],
  ];

  const howto: Array<(string | number)[]> = [
    ["How to use this file"],
    ["1. File → Make a copy (if this is a Google Sheet) or upload this Excel to Drive and Open with Google Sheets."],
    ["2. Keep Products as the master. Do not type rates on Sales if you can look them up."],
    ["3. Sales has 1,000+ real-looking lines for a Raipur electrical shop. That is enough to build a dashboard."],
    ["4. Practice tab already has VLOOKUP / XLOOKUP / TEXTJOIN. Break a formula, then fix it."],
    ["5. Dashboard, Ageing, GST read the same Sales tab — this is how an MSME system stays one source of truth."],
    ["6. DirtyImport is the messy Tally / WhatsApp dump. Use it for TRIM, cleanup, validation."],
    [`Firm: ${MSME_FIRM.name}, ${MSME_FIRM.city}. Owner on paper: ${MSME_FIRM.owner}.`],
  ];

  return {
    HowTo: howto,
    Products: products,
    Customers: customers,
    Sales: sales,
    Payments: payments,
    Stock: stock,
    DirtyImport: dirty,
    Practice: practice,
    Dashboard: dashboard,
    Ageing: ageing,
    GST: gst,
    meta: {
      salesLines: sales.length - 1,
      customers: customers.length - 1,
      products: products.length - 1,
    },
  };
}

function sheetFromAoa(
  name: string,
  aoa: Array<Array<string | number | { f: string }>>,
) {
  const values = aoa.map((row) =>
    row.map((cell) =>
      cell && typeof cell === "object" && "f" in cell ? null : cell,
    ),
  );
  const ws = XLSX.utils.aoa_to_sheet(values);
  aoa.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell && typeof cell === "object" && "f" in cell) {
        const addr = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
        ws[addr] = { t: "n", f: cell.f };
      }
    });
  });
  ws["!cols"] = Array.from({ length: 14 }, () => ({ wch: 16 }));
  return { name, ws };
}

export function buildMsmeWorkbookBuffer() {
  const tabs = buildMsmeWorkbookAoa();
  const book = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(tabs)) {
    if (name === "meta") continue;
    const { ws } = sheetFromAoa(
      name,
      aoa as Array<Array<string | number | { f: string }>>,
    );
    XLSX.utils.book_append_sheet(book, ws, name.slice(0, 31));
  }
  return XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
