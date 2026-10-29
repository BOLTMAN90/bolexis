export type MatchLead = {
  budgetAmount: number | null;
  budgetCurrency: string;
  preferredLocation: string | null;
  propertyType: string | null;
};

export type MatchProperty = {
  id: string;
  title: string;
  propertyType: string;
  listingType: "sale" | "rental";
  priceAmount: number;
  priceCurrency: string;
  city: string;
  region: string;
  availability: string;
  archived?: boolean;
};

export type PropertyMatch = {
  propertyId: string;
  title: string;
  reasons: string[];
  mismatches: string[];
  suitable: boolean;
};

export function matchProperties(lead: MatchLead, properties: MatchProperty[]): PropertyMatch[] {
  return properties
    .filter((property) => !property.archived)
    .map((property) => {
      const reasons: string[] = [];
      const mismatches: string[] = [];

      if (property.availability === "available") {
        reasons.push("The listing is available.");
      } else {
        mismatches.push(`Availability is ${property.availability.replaceAll("_", " ")}.`);
      }

      if (lead.propertyType) {
        if (lead.propertyType === property.propertyType) {
          reasons.push(`Property type matches ${property.propertyType.replaceAll("_", " ")}.`);
        } else {
          mismatches.push(
            `Property type is ${property.propertyType.replaceAll("_", " ")}, not ${lead.propertyType.replaceAll("_", " ")}.`,
          );
        }
      } else {
        mismatches.push("The lead has no preferred property type, so type was not compared.");
      }

      if (lead.preferredLocation && lead.preferredLocation.trim()) {
        const needle = lead.preferredLocation.trim().toLowerCase();
        const haystack = `${property.city} ${property.region}`.toLowerCase();
        if (haystack.includes(needle) || needle.includes(property.city.toLowerCase())) {
          reasons.push(`Location overlaps ${property.city || property.region}.`);
        } else {
          mismatches.push(`Location ${property.city || "is unset"} does not match the preference.`);
        }
      } else {
        mismatches.push("The lead has no preferred location, so location was not compared.");
      }

      if (lead.budgetAmount && lead.budgetAmount > 0) {
        if (lead.budgetCurrency !== property.priceCurrency) {
          mismatches.push("Budget currency differs from the listing currency.");
        } else if (property.priceAmount <= lead.budgetAmount) {
          reasons.push("The asking price is within the recorded budget.");
        } else {
          mismatches.push("The asking price is above the recorded budget.");
        }
      } else {
        mismatches.push("The lead has no budget, so price was not compared.");
      }

      const suitable =
        property.availability === "available" &&
        reasons.some((reason) => reason.startsWith("Property type")) &&
        reasons.some((reason) => reason.startsWith("The asking price")) &&
        reasons.some((reason) => reason.startsWith("Location"));

      return {
        propertyId: property.id,
        title: property.title,
        reasons,
        mismatches,
        suitable,
      };
    })
    .sort((a, b) => Number(b.suitable) - Number(a.suitable) || b.reasons.length - a.reasons.length);
}
