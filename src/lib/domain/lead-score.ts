export type LeadScoreInput = {
  email: string | null;
  phone: string | null;
  budgetAmount: number | null;
  preferredLocation: string | null;
  propertyType: string | null;
  buyingTimelineDays: number | null;
  consentToContact: boolean;
};

export type LeadScoreRule = {
  id: string;
  label: string;
  points: number;
  awarded: number;
  detail: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPresent(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function scoreLead(input: LeadScoreInput): {
  score: number;
  rules: LeadScoreRule[];
} {
  const emailValid = isPresent(input.email) && EMAIL_PATTERN.test(input.email.trim());
  const phonePresent = isPresent(input.phone);
  const budgetPresent =
    typeof input.budgetAmount === "number" &&
    Number.isFinite(input.budgetAmount) &&
    input.budgetAmount > 0;
  const locationPresent = isPresent(input.preferredLocation);
  const typePresent = isPresent(input.propertyType);
  const timeline = input.buyingTimelineDays;
  const timelineSoon =
    typeof timeline === "number" && Number.isFinite(timeline) && timeline >= 0 && timeline <= 90;
  const timelineLater =
    typeof timeline === "number" && Number.isFinite(timeline) && timeline > 90;
  const consent = input.consentToContact === true;

  const rules: LeadScoreRule[] = [
    {
      id: "email",
      label: "Valid email",
      points: 10,
      awarded: emailValid ? 10 : 0,
      detail: emailValid ? "A valid email is recorded." : "Email is missing or invalid.",
    },
    {
      id: "phone",
      label: "Phone number",
      points: 10,
      awarded: phonePresent ? 10 : 0,
      detail: phonePresent ? "A phone number is recorded." : "Phone number is missing.",
    },
    {
      id: "budget",
      label: "Budget",
      points: 20,
      awarded: budgetPresent ? 20 : 0,
      detail: budgetPresent ? "Budget is greater than zero." : "Budget is missing.",
    },
    {
      id: "location",
      label: "Preferred location",
      points: 15,
      awarded: locationPresent ? 15 : 0,
      detail: locationPresent ? "A preferred location is recorded." : "Preferred location is missing.",
    },
    {
      id: "property_type",
      label: "Property type",
      points: 10,
      awarded: typePresent ? 10 : 0,
      detail: typePresent ? "A property type is recorded." : "Property type is missing.",
    },
    {
      id: "timeline",
      label: "Buying timeline",
      points: 20,
      awarded: timelineSoon ? 20 : timelineLater ? 10 : 0,
      detail: timelineSoon
        ? "Timeline is within 90 days."
        : timelineLater
          ? "Timeline is set and is later than 90 days."
          : "Buying timeline is missing.",
    },
    {
      id: "consent",
      label: "Consent to contact",
      points: 15,
      awarded: consent ? 15 : 0,
      detail: consent
        ? "Consent to be contacted is recorded."
        : "Consent to be contacted is not recorded.",
    },
  ];

  const score = rules.reduce((sum, rule) => sum + rule.awarded, 0);
  return { score, rules };
}
