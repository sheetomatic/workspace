import { TEMPLATES, type AppPlan } from "@/lib/app-builder";

const RULES: { id: string; keys: string[] }[] = [
  { id: "orders", keys: ["order", "sales", "dispatch", "party", "ऑर्डर", "बिक्री", "पार्टी"] },
  { id: "crm", keys: ["crm", "lead", "enquiry", "follow", "लीड", "एंक्वायरी"] },
  { id: "inventory", keys: ["stock", "inventory", "item", "warehouse", "स्टॉक", "माल", "इन्वेंटरी"] },
  { id: "attendance", keys: ["attend", "leave", "staff", "हाजिरी", "छुट्टी", "कर्मचारी"] },
  { id: "visitors", keys: ["visitor", "gate", "आगंतुक", "गेट"] },
  { id: "expenses", keys: ["expense", "petrol", "diesel", "खर्च", "कैश"] },
  { id: "tasks", keys: ["task", "todo", "assign", "काम", "कार्य"] },
];

export function planFromPrompt(raw: string): AppPlan {
  const q = raw.trim().toLowerCase();
  let best = TEMPLATES[0];
  let score = 0;
  for (const rule of RULES) {
    const hits = rule.keys.filter((k) => q.includes(k)).length;
    if (hits > score) {
      const found = TEMPLATES.find((t) => t.id === rule.id);
      if (found) {
        best = found;
        score = hits;
      }
    }
  }
  return {
    ...best,
    prompt: raw.trim(),
    config: {
      ...best.config,
      meta: { ...best.config.meta },
    },
    workbook: structuredClone(best.workbook),
  };
}

export { TEMPLATES };
