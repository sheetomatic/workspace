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
    ["Item code", "Item name", "Category", "Rate", "GST %", "Min stock", "Rack", "Cost"],
  ];
  PRODUCTS.forEach((row, index) => {
    const cost = Math.round(
      row[3] * (row[2] === "Cable" ? 0.88 : row[2] === "Lighting" ? 0.7 : 0.78),
    );
    products.push([
      row[0],
      row[1],
      row[2],
      row[3],
      row[4],
      row[5],
      `A${1 + (index % 6)}-${1 + (index % 4)}`,
      cost,
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
    ["From data to a selling system — read this first"],
    ["Ramesh does not need 58 functions. He needs: what sold, what is stuck, whom to chase, what to push tomorrow."],
    ["Path: Sales (raw) → Apply (one ARRAYFORMULA cleans and costs every line) → Analyst_Query / Live_Filter (questions) → Pivot_Source + Chart_Data (meeting) → Sell_More (actions)."],
    ["1. File → Make a copy in Google Sheets, or upload this Excel to Drive → Open with Google Sheets."],
    ["2. QUERY, FILTER, ARRAYFORMULA, GOOGLEFINANCE, slicers are Google Sheets. Excel is for the raw dump and simple sums."],
    ["3. Rates_Master is the private price book. ImportHub shows IMPORTRANGE so billing never edits rates."],
    ["4. Market_Watch is USD/INR for cable buying — not for the daily bill."],
    ["5. Do not type on Apply / Analyst_Query / Live_Filter / Sell_More. Those tabs read Sales."],
    [`Firm: ${MSME_FIRM.name}, ${MSME_FIRM.city}. Owner: ${MSME_FIRM.owner}.`],
  ];

  const apply: Array<(string | number | { f: string })[]> = [
    [
      "Inv no",
      "Date",
      "Item code",
      "Qty",
      "Typed rate",
      "List rate",
      "Cost",
      "Category",
      "Margin Rs",
      "Margin %",
      "Rate flag",
      "Month",
      "City",
      "Salesman",
      "Status",
      "Push?",
    ],
    [
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!A2:A))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!B2:B))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!D2:D))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!E2:E))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!F2:F))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IFERROR(VLOOKUP(Sales!D2:D,Products!A:D,4,FALSE),"")))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IFERROR(VLOOKUP(Sales!D2:D,Products!A:H,8,FALSE),"")))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IFERROR(VLOOKUP(Sales!D2:D,Products!A:C,3,FALSE),"")))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IF(G2:G="",,E2:E*D2:D-G2:G*D2:D)))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IF(E2:E="",,ROUND((E2:E-G2:G)/E2:E,3))))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IF(E2:E="",,IF(E2:E<F2:F,"SOLD BELOW LIST","ok"))))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",TEXT(Sales!B2:B,"YYYY-MM")))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!K2:K))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!L2:L))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",Sales!N2:N))' },
      { f: 'ARRAYFORMULA(IF(Sales!A2:A="","",IF((J2:J>=0.22)*(G2:G<>""),"PUSH","")))' },
    ],
    ["This tab is the system layer. One ARRAYFORMULA per column. New Sales rows appear here without a drag-fill."],
  ];

  const ratesMaster: Array<(string | number)[]> = products.map((row) => [...row]);

  const importHub: Array<(string | number | { f: string })[]> = [
    ["IMPORTRANGE — how the shop keeps rates out of the billing file"],
    ["Ramesh's son should not edit Rates_Master. Counter file only imports it."],
    ["Step 1: Right-click Rates_Master → Copy to → New spreadsheet. Name it Kailash-Rates-Private."],
    ["Step 2: Share that file as viewer to this billing file's owner."],
    ["Step 3: Paste the private file URL in B6. Allow access when Sheets asks."],
    ["Private rates URL", "PASTE_RATES_FILE_URL_HERE"],
    ["Imported book", { f: 'IF(B6="PASTE_RATES_FILE_URL_HERE","Paste the Rates_Master copy URL in B6",IFERROR(IMPORTRANGE(B6,"Rates_Master!A1:H8"),"Allow access, then wait 10 seconds"))' }],
    [""],
    ["Until you paste a second file, this file still has Rates_Master as a tab — same columns. That is the drill, not a fake demo."],
    ["After import works, VLOOKUP on Apply should point at the imported range, not Products."],
  ];

  const analystQuery: Array<(string | number | { f: string })[]> = [
    ["Analyst questions — QUERY on Apply / Sales. This is what you take to Ramesh on Monday."],
    [""],
    ["A. What is making money — category this year"],
    [{ f: "QUERY(Apply!A1:P,\"select H, sum(D), sum(I) where A is not null and H is not null group by H order by sum(I) desc label sum(D) 'Qty', sum(I) 'Margin Rs'\",1)" }],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    ["B. Who is selling — salesman, bills, overdue value"],
    [{ f: "QUERY(Sales!A1:N,\"select L, count(A), sum(J) where N = 'Overdue' group by L order by sum(J) desc label count(A) 'Overdue lines', sum(J) 'Stuck Rs'\",1)" }],
    [""],
    [""],
    [""],
    [""],
    [""],
    ["C. Where we are weak — city mix last 90 days (change the date in the query to teach)"],
    [{ f: "QUERY(Sales!A1:N,\"select K, sum(G) where B >= date '2026-05-01' group by K order by sum(G) desc label sum(G) 'Taxable'\",1)" }],
    [""],
    [""],
    [""],
    [""],
    [""],
    ["D. What is stuck in the godown — item, qty sold (low = push or stop buying)"],
    [{ f: "QUERY(Sales!A1:N,\"select D, sum(E) group by D order by sum(E) label sum(E) 'Qty sold'\",1)" }],
  ];

  const liveFilter: Array<(string | number | { f: string })[]> = [
    ["Live lists — FILTER. Change a Sales status and this page moves. That is a system, not a screenshot."],
    [""],
    ["1. Chase today — overdue, fattest first (sort after filter if needed)"],
    [{ f: 'FILTER(Sales!A2:N,Sales!N2:N="Overdue")' }],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    ["2. Sold below list — leakage. Amit giving extra discount without asking."],
    [{ f: 'FILTER(Apply!A2:P,Apply!K2:K="SOLD BELOW LIST")' }],
    [""],
    [""],
    [""],
    [""],
    ["3. Push list — fat margin lines (the owner should call these customers again)"],
    [{ f: 'FILTER(Apply!A2:P,Apply!P2:P="PUSH")' }],
    [""],
    [""],
    [""],
    [""],
    ["4. Quiet cities this month — teach: wrap FILTER with a city cell (B24)"],
    ["City", "Raipur"],
    [{ f: 'IFERROR(FILTER(Sales!A2:N,Sales!K2:K=B24,Sales!B2:B>=DATE(2026,8,1)),"No lines")' }],
  ];

  const market: Array<(string | number | { f: string })[]> = [
    ["Market_Watch — only for buying cable / imported parts. Not for the bill."],
    ["USD / INR now", { f: 'GOOGLEFINANCE("CURRENCY:USDINR")' }],
    ["As of", { f: "TODAY()" }],
    [""],
    ["Last 90 days (needs Google Sheets + internet)"],
    [{ f: 'GOOGLEFINANCE("CURRENCY:USDINR","price",TODAY()-90,TODAY(),"DAILY")' }],
    [""],
    ["How the analyst talks to Ramesh:"],
    ["Armoured cable and inverter batteries move with the dollar. If USDINR jumps 1 rupee, landing cost on KE-CBL-16 is not 186 forever."],
    ["Do not put GOOGLEFINANCE on Sales. Offline billing must still work. This tab is the Monday buying meeting."],
    ["Action: if USDINR is up vs last month, do not dump-stock cable at old rate. If it eases, book a bigger wire lot."],
  ];

  const pivotSource: Array<(string | number | { f: string })[]> = [
    ["Month", "City", "Category", "Salesman", "Qty", "Taxable", "Margin Rs", "Status"],
    [
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!L2:L))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!M2:M))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!H2:H))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!N2:N))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!D2:D))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Sales!G2:G))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!I2:I))' },
      { f: 'ARRAYFORMULA(IF(Apply!A2:A="","",Apply!O2:O))' },
    ],
    ["Insert → Pivot table from A:H. Rows: City. Columns: Month. Values: SUM of Taxable, SUM of Margin Rs. Then Data → Slicer → Salesman."],
    ["Second pivot: Rows Category, Values Qty and Margin. That is the 'what to stock' meeting."],
  ];

  const chartData: Array<(string | number | { f: string })[]> = [
    ["Month", "Taxable", "Margin", "Bills"],
    ["2025-04", { f: 'SUMIF(Apply!L:L,A2,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A2,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A2)' }],
    ["2025-05", { f: 'SUMIF(Apply!L:L,A3,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A3,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A3)' }],
    ["2025-06", { f: 'SUMIF(Apply!L:L,A4,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A4,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A4)' }],
    ["2025-07", { f: 'SUMIF(Apply!L:L,A5,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A5,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A5)' }],
    ["2025-08", { f: 'SUMIF(Apply!L:L,A6,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A6,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A6)' }],
    ["2025-09", { f: 'SUMIF(Apply!L:L,A7,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A7,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A7)' }],
    ["2025-10", { f: 'SUMIF(Apply!L:L,A8,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A8,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A8)' }],
    ["2025-11", { f: 'SUMIF(Apply!L:L,A9,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A9,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A9)' }],
    ["2025-12", { f: 'SUMIF(Apply!L:L,A10,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A10,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A10)' }],
    ["2026-01", { f: 'SUMIF(Apply!L:L,A11,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A11,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A11)' }],
    ["2026-02", { f: 'SUMIF(Apply!L:L,A12,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A12,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A12)' }],
    ["2026-03", { f: 'SUMIF(Apply!L:L,A13,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A13,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A13)' }],
    ["2026-04", { f: 'SUMIF(Apply!L:L,A14,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A14,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A14)' }],
    ["2026-05", { f: 'SUMIF(Apply!L:L,A15,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A15,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A15)' }],
    ["2026-06", { f: 'SUMIF(Apply!L:L,A16,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A16,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A16)' }],
    ["2026-07", { f: 'SUMIF(Apply!L:L,A17,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A17,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A17)' }],
    ["2026-08", { f: 'SUMIF(Apply!L:L,A18,Sales!G:G)' }, { f: 'SUMIF(Apply!L:L,A18,Apply!I:I)' }, { f: 'COUNTIF(Apply!L:L,A18)' }],
    [""],
    ["Insert → Chart → Line: Month vs Taxable and Margin. Title: Kailash — sales vs money kept."],
    ["Second chart: column, Bills. If bills rise and margin falls, they are discounting. That is the talk."],
    ["Category", "Taxable", "Spark"],
    ["Switchgear", { f: 'SUMIF(Apply!H:H,A22,Sales!G:G)' }, { f: 'SPARKLINE(B22,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Cable", { f: 'SUMIF(Apply!H:H,A23,Sales!G:G)' }, { f: 'SPARKLINE(B23,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Lighting", { f: 'SUMIF(Apply!H:H,A24,Sales!G:G)' }, { f: 'SPARKLINE(B24,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Fans", { f: 'SUMIF(Apply!H:H,A25,Sales!G:G)' }, { f: 'SPARKLINE(B25,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Switches", { f: 'SUMIF(Apply!H:H,A26,Sales!G:G)' }, { f: 'SPARKLINE(B26,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Conduit", { f: 'SUMIF(Apply!H:H,A27,Sales!G:G)' }, { f: 'SPARKLINE(B27,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Power", { f: 'SUMIF(Apply!H:H,A28,Sales!G:G)' }, { f: 'SPARKLINE(B28,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
    ["Accessories", { f: 'SUMIF(Apply!H:H,A29,Sales!G:G)' }, { f: 'SPARKLINE(B29,{"charttype","bar";"max",MAX($B$22:$B$29)})' }],
  ];

  const sellMore: Array<(string | number | { f: string })[]> = [
    ["Sell_More — what a data person says to the owner. Not a chart for the wall. A call list."],
    [""],
    ["This month taxable", { f: 'SUMIFS(Sales!G:G,Sales!B:B,">="&DATE(2026,8,1),Sales!B:B,"<"&DATE(2026,9,1))' }],
    ["This month margin (Apply)", { f: 'SUMIFS(Apply!I:I,Apply!B:B,">="&DATE(2026,8,1),Apply!B:B,"<"&DATE(2026,9,1))' }],
    ["Lines sold below list", { f: 'COUNTIF(Apply!K:K,"SOLD BELOW LIST")' }],
    ["Overdue value", { f: 'SUMIF(Sales!N:N,"Overdue",Sales!J:J)' }],
    [""],
    ["Talk 1 — money stuck"],
    ["If overdue is fat, do not push new credit in that city. Chase first. Live_Filter tab 1 is the list."],
    [""],
    ["Talk 2 — leakage"],
    ["Below-list lines are silent discount. Ask Amit/Pooja why. Live_Filter tab 2."],
    [""],
    ["Talk 3 — what to push"],
    ["High margin + we have stock = Monday WhatsApp to old customers. Live_Filter tab 3 and Stock REORDER inverse."],
    [{ f: 'QUERY(Apply!A1:P,"select C, H, sum(D), avg(J) where P = \'PUSH\' group by C, H order by sum(D) desc limit 8 label sum(D) \'Qty\', avg(J) \'Avg margin\'",1)' }],
    [""],
    [""],
    [""],
    [""],
    [""],
    [""],
    ["Talk 4 — quiet customers (no line in last 60 days) — build with FILTER on a last-bill helper in class"],
    ["Pick 10 customers from Customers who are not in FILTER(Sales!C:C,Sales!B:B>=TODAY()-60). That is reactivation, not new leads."],
    [""],
    ["Talk 5 — city that is sleeping"],
    [{ f: "QUERY(Sales!A1:N,\"select K, sum(G) where B >= date '2026-06-01' group by K order by sum(G) label sum(G) 'Recent taxable'\",1)" }],
    ["The bottom city gets one Saturday visit, not more ads. That is how an analyst helps a shop sell more."],
  ];

  return {
    HowTo: howto,
    Products: products,
    Rates_Master: ratesMaster,
    Customers: customers,
    Sales: sales,
    Payments: payments,
    Stock: stock,
    DirtyImport: dirty,
    Practice: practice,
    Apply: apply,
    ImportHub: importHub,
    Analyst_Query: analystQuery,
    Live_Filter: liveFilter,
    Market_Watch: market,
    Pivot_Source: pivotSource,
    Chart_Data: chartData,
    Sell_More: sellMore,
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
