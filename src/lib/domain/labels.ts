export const LEAD_SOURCES = [
  "website",
  "referral",
  "portal",
  "walk_in",
  "phone",
  "social",
  "other",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const PROPERTY_TYPES = [
  "house",
  "apartment",
  "condo",
  "townhouse",
  "land",
  "office",
  "retail",
  "industrial",
  "mixed_use",
  "other",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  referral: "Referral",
  portal: "Portal",
  walk_in: "Walk-in",
  phone: "Phone",
  social: "Social",
  other: "Other",
};

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "House",
  apartment: "Apartment",
  condo: "Condo",
  townhouse: "Townhouse",
  land: "Land",
  office: "Office",
  retail: "Retail",
  industrial: "Industrial",
  mixed_use: "Mixed use",
  other: "Other",
};

export function titleCaseToken(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
