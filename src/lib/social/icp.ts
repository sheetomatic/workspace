export const SOCIAL_ICP_VERTICALS = [
  { id: "clinic", label: "Doctor / clinic" },
  { id: "law", label: "Lawyer / law office" },
  { id: "mobile", label: "Mobile shop" },
  { id: "furniture", label: "Furniture shop" },
  { id: "computer", label: "Computer shop" },
  { id: "jewellery", label: "Jewellery shop" },
  { id: "boutique", label: "Fashion boutique" },
  { id: "manufacturing", label: "Manufacturing unit" },
  { id: "services", label: "Services business" },
  { id: "travel", label: "Tour & travel" },
  { id: "electronics", label: "Electronics shop" },
  { id: "workshop", label: "Electronic workshop / repair" },
] as const;

export type SocialIcpId = (typeof SOCIAL_ICP_VERTICALS)[number]["id"];

const BANNED_ICP =
  /\b(kirana|grocery|gift shop|general store|supermarket|hypermarket|mall|kirana store)\b/i;

export function isBannedSocialIcp(text: string) {
  return BANNED_ICP.test(text);
}

export function socialIcpLabel(id: string) {
  return SOCIAL_ICP_VERTICALS.find((row) => row.id === id)?.label ?? id;
}
