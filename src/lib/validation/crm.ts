import { z } from "zod";

import { LEAD_SOURCES, PROPERTY_TYPES } from "@/lib/domain/labels";
import { PIPELINE_STAGES } from "@/lib/domain/pipeline";

const emptyToNull = (value: unknown) => (value === "" || value === undefined ? null : value);

export const leadFormSchema = z.object({
  fullName: z.string().trim().min(1, "Name is required.").max(160),
  email: z.string().trim().email("Enter a valid email.").or(z.literal("")).optional(),
  phone: z.string().trim().max(40).optional(),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(PIPELINE_STAGES).optional(),
  assignedUserId: z.string().uuid().or(z.literal("")).optional(),
  budgetAmount: z.preprocess(
    emptyToNull,
    z.coerce.number().nonnegative("Budget cannot be negative.").nullable().optional(),
  ),
  budgetCurrency: z.string().trim().length(3).optional(),
  preferredLocation: z.string().trim().max(120).optional(),
  propertyType: z.enum(PROPERTY_TYPES).or(z.literal("")).optional(),
  buyingTimelineDays: z.preprocess(
    emptyToNull,
    z.coerce.number().int().nonnegative().nullable().optional(),
  ),
  notes: z.string().max(5000).optional(),
  preferEmail: z.boolean().optional(),
  preferPhone: z.boolean().optional(),
  preferSms: z.boolean().optional(),
  consentToContact: z.boolean(),
});

export const propertyFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(8000).optional(),
  category: z.enum(["residential", "commercial"]),
  propertyType: z.enum(PROPERTY_TYPES),
  listingType: z.enum(["sale", "rental"]),
  priceAmount: z.coerce.number().nonnegative(),
  priceCurrency: z.string().trim().length(3),
  addressLine: z.string().trim().max(180).optional(),
  city: z.string().trim().min(1).max(80),
  region: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
  bedrooms: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  bathrooms: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  areaValue: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  areaUnit: z.enum(["sqft", "sqm"]),
  availability: z.enum([
    "available",
    "under_offer",
    "pending",
    "leased",
    "sold",
    "off_market",
  ]),
  assignedUserId: z.string().uuid().or(z.literal("")).optional(),
});

export const dealFormSchema = z.object({
  leadId: z.string().uuid(),
  propertyId: z.string().uuid().or(z.literal("")).optional(),
  title: z.string().trim().min(1).max(180),
  expectedValue: z.coerce.number().nonnegative(),
  currency: z.string().trim().length(3).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  stage: z.enum(PIPELINE_STAGES).optional(),
  assignedUserId: z.string().uuid().or(z.literal("")).optional(),
});

export const taskFormSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().max(4000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueAt: z.string().optional(),
  assignedUserId: z.string().uuid().or(z.literal("")).optional(),
  leadId: z.string().uuid().or(z.literal("")).optional(),
  dealId: z.string().uuid().or(z.literal("")).optional(),
  propertyId: z.string().uuid().or(z.literal("")).optional(),
});

export const viewingFormSchema = z.object({
  leadId: z.string().uuid(),
  propertyId: z.string().uuid(),
  assignedUserId: z.string().uuid().or(z.literal("")).optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  timezone: z.string().min(1).max(80),
  notes: z.string().max(4000).optional(),
});

export const intakeSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(200),
  fullName: z.string().trim().min(1).max(160),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
  source: z.enum(LEAD_SOURCES).default("website"),
  budgetAmount: z.number().nonnegative().nullable().optional(),
  budgetCurrency: z.string().length(3).optional(),
  preferredLocation: z.string().max(120).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  buyingTimelineDays: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().max(5000).optional(),
  consentToContact: z.boolean(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
export type PropertyFormValues = z.infer<typeof propertyFormSchema>;
