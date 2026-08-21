export const TEAM_SIZE_OPTIONS = [
  "1-5",
  "6-15",
  "16-50",
  "51-200",
  "200+",
] as const;

export type TeamSizeOption = (typeof TEAM_SIZE_OPTIONS)[number];

export function isTeamSizeOption(value: string): value is TeamSizeOption {
  return (TEAM_SIZE_OPTIONS as readonly string[]).includes(value);
}

/** Sheetomatic ICP plus common MSME lines. */
export const DEFAULT_INDUSTRIES = [
  "Clinic / Doctor",
  "Law office",
  "Mobile shop",
  "Furniture shop",
  "Computer shop",
  "Jewellery shop",
  "Fashion boutique",
  "Manufacturing",
  "Services",
  "Tour & travel",
  "Electronics shop",
  "Electronic workshop / repair",
  "Trading / distribution",
  "Construction",
  "Education",
  "Other",
] as const;

export const DEFAULT_COUNTRY_ISO2 = "IN";
