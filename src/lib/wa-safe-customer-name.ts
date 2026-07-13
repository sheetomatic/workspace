/** Common city tokens often mis-stored as WaContact.name (WhatsApp profile / form mixups). */
const CITY_ONLY_NAMES = new Set(
  [
    "delhi",
    "new delhi",
    "mumbai",
    "bombay",
    "bangalore",
    "bengaluru",
    "hyderabad",
    "chennai",
    "madras",
    "kolkata",
    "calcutta",
    "pune",
    "ahmedabad",
    "jaipur",
    "surat",
    "lucknow",
    "kanpur",
    "nagpur",
    "nashik",
    "nasik",
    "aurangabad",
    "chhatrapati sambhajinagar",
    "indore",
    "bhopal",
    "patna",
    "ludhiana",
    "amritsar",
    "ranchi",
    "guwahati",
    "gauhati",
    "bhubaneswar",
    "bhubaneshwar",
    "chandigarh",
    "gurgaon",
    "gurugram",
    "noida",
    "ghaziabad",
    "faridabad",
    "coimbatore",
    "kochi",
    "cochin",
    "trivandrum",
    "thiruvananthapuram",
    "mysore",
    "mysuru",
    "vadodara",
    "rajkot",
    "visakhapatnam",
    "vizag",
    "vijayawada",
    "madurai",
    "varanasi",
    "agra",
    "meerut",
    "allahabad",
    "prayagraj",
    "jodhpur",
    "raipur",
    "dehradun",
    "shimla",
    "jammu",
    "srinagar",
    "jamshedpur",
    "dhanbad",
    "cuttack",
    "siliguri",
    "howrah",
    "thane",
    "navi mumbai",
    "kalyan",
    "pimpri",
    "chinchwad",
    "pimpri chinchwad",
    "nanded",
    "solapur",
    "kolhapur",
    "sangli",
    "goa",
    "panaji",
    "mangalore",
    "mangaluru",
    "hubli",
    "hubballi",
    "belgaum",
    "belagavi",
    "warangal",
    "tirupati",
    "india",
  ].map((city) => city.toLowerCase()),
);

export function isPhoneLikeName(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  const trimmed = value.trim();
  if (/^\+?\d[\d\s\-()]{8,}$/.test(trimmed)) {
    return true;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length / trimmed.length > 0.5;
}

export function isCityOnlyName(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  return CITY_ONLY_NAMES.has(value.trim().toLowerCase());
}

/**
 * Returns a person-safe display name for greetings / AI, or null if the stored
 * value looks like a phone, city, or other non-name placeholder.
 */
export function safeCustomerDisplayName(
  name: string | null | undefined,
): string | null {
  const trimmed = name?.trim();
  if (!trimmed) {
    return null;
  }
  if (isPhoneLikeName(trimmed) || isCityOnlyName(trimmed)) {
    return null;
  }
  // Reject bare country codes / short numeric leftovers.
  if (/^\+?\d+$/.test(trimmed)) {
    return null;
  }
  if (!/^[\p{L}\s'.-]+$/u.test(trimmed)) {
    return null;
  }
  if (trimmed.length < 2 || trimmed.length > 80) {
    return null;
  }
  return trimmed;
}

export function safeCustomerFirstName(
  name: string | null | undefined,
): string | null {
  const safe = safeCustomerDisplayName(name);
  if (!safe) {
    return null;
  }
  return safe.split(/\s+/)[0]?.replace(/[,.!?;:]+$/g, "") || null;
}

/**
 * One-shot cleanup helper (not a migration). Clears phone-like / city-only values
 * wrongly stored on WaContact.name. Run manually when needed, e.g.:
 *
 *   npx tsx -e "
 *   import { prisma } from './src/lib/db';
 *   import { isPhoneLikeName, isCityOnlyName } from './src/lib/wa-safe-customer-name';
 *   const rows = await prisma.waContact.findMany({ where: { name: { not: null } }, select: { id: true, name: true } });
 *   const bad = rows.filter((r) => isPhoneLikeName(r.name) || isCityOnlyName(r.name));
 *   for (const row of bad) {
 *     await prisma.waContact.update({ where: { id: row.id }, data: { name: null } });
 *   }
 *   console.log('cleared', bad.length);
 *   "
 */
export function isBadStoredCustomerName(value: string | null | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  return (
    isPhoneLikeName(value) ||
    isCityOnlyName(value) ||
    /^\+?\d+$/.test(value.trim())
  );
}
