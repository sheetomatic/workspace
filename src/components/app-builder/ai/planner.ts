import { TEMPLATES, type AppPlan } from "@/lib/app-builder";

const RULES: { id: string; keys: string[] }[] = [
  { id: "custom", keys: ["custom", "blank", "empty", "scratch", "अपना", "कस्टम"] },
  {
    id: "orders",
    keys: ["order", "sales", "dispatch", "party", "purchase", "ऑर्डर", "बिक्री", "पार्टी", "सेल्स", "परचेज", "खरीद"],
  },
  { id: "crm", keys: ["crm", "lead", "enquiry", "follow", "लीड", "एंक्वायरी"] },
  { id: "inventory", keys: ["stock", "inventory", "item", "warehouse", "स्टॉक", "माल", "इन्वेंटरी"] },
  { id: "attendance", keys: ["attend", "leave", "staff", "हाजिरी", "छुट्टी", "कर्मचारी"] },
  { id: "visitors", keys: ["visitor", "gate", "आगंतुक", "गेट"] },
  {
    id: "cashbook",
    keys: [
      "cashbook",
      "cash book",
      "cash +",
      "cash+",
      "cash and expense",
      "cash expense",
      "credit",
      "debit",
      "कैशबुक",
      "खाता",
    ],
  },
  { id: "expenses", keys: ["expense", "petrol", "diesel", "खर्च", "कैश"] },
  { id: "tasks", keys: ["task", "todo", "assign", "काम", "कार्य"] },
];

export function brandFromPrompt(raw: string): string | undefined {
  const match = raw.match(/brand\s*[:\-]\s*([A-Za-z0-9][\w.&-]{0,32})/i);
  const name = match?.[1]?.trim().replace(/[.,;:]+$/, "");
  return name || undefined;
}

const MERGEABLE = new Set(["orders", "crm"]);

function mergePlans(base: AppPlan, extra: AppPlan): AppPlan {
  const workbook = structuredClone(base.workbook);
  for (const [name, tab] of Object.entries(extra.workbook.tabs)) {
    if (!workbook.tabs[name]) workbook.tabs[name] = structuredClone(tab);
  }
  const viewKeys = new Set(base.config.views.map((view) => `${view.id}:${view.tab}`));
  const views = [
    ...base.config.views,
    ...extra.config.views.filter((view) => !viewKeys.has(`${view.id}:${view.tab}`)),
  ];
  const relIds = new Set(base.config.related.map((rel) => rel.id));
  return {
    ...base,
    label: base.label === extra.label ? base.label : `${base.label} + ${extra.label}`,
    config: {
      ...base.config,
      hubs: [...new Set([...base.config.hubs, ...extra.config.hubs])],
      views,
      related: [
        ...base.config.related,
        ...extra.config.related.filter((rel) => !relIds.has(rel.id)),
      ],
    },
    workbook,
  };
}

export function planFromPrompt(raw: string): AppPlan {
  const q = raw.trim().toLowerCase();
  const ranked = RULES.map((rule) => ({
    id: rule.id,
    hits: rule.keys.filter((k) => q.includes(k)).length,
  }))
    .filter((row) => row.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  let best = TEMPLATES.find((t) => t.id === ranked[0]?.id) || TEMPLATES[0];
  if (MERGEABLE.has(best.id)) {
    for (const row of ranked.slice(1)) {
      if (!MERGEABLE.has(row.id)) continue;
      const extra = TEMPLATES.find((t) => t.id === row.id);
      if (extra) best = mergePlans(best, extra);
    }
  }

  const brand = brandFromPrompt(raw);
  return {
    ...best,
    prompt: raw.trim(),
    config: {
      ...best.config,
      meta: {
        ...best.config.meta,
        name: brand || best.config.meta.name,
        brand: brand || best.config.meta.brand,
      },
    },
    workbook: structuredClone(best.workbook),
  };
}

export { TEMPLATES };
