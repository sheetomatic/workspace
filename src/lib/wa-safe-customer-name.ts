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
    "indore",
    "bhopal",
    "patna",
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
    "goa",
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
