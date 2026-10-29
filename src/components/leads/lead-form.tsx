"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";

import { createLeadAction } from "@/lib/actions/crm";
import { LEAD_SOURCES, PROPERTY_TYPES, SOURCE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/domain/labels";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/domain/pipeline";
import { leadFormSchema, type LeadFormValues } from "@/lib/validation/crm";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";

export function LeadForm({
  agents,
}: {
  agents: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema) as Resolver<LeadFormValues>,
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      source: "website",
      status: "new",
      assignedUserId: "",
      budgetCurrency: "USD",
      preferredLocation: "",
      propertyType: "",
      notes: "",
      preferEmail: true,
      preferPhone: false,
      preferSms: false,
      consentToContact: false,
    },
  });

  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={form.handleSubmit(async (values) => {
        setError(null);
        const result = await createLeadAction(values);
        if (result?.error) setError(result.error);
      })}
    >
      <Field label="Full name" error={form.formState.errors.fullName?.message}>
        <Input {...form.register("fullName")} />
      </Field>
      <Field label="Email" error={form.formState.errors.email?.message}>
        <Input type="email" {...form.register("email")} />
      </Field>
      <Field label="Phone">
        <Input {...form.register("phone")} />
      </Field>
      <Field label="Source">
        <Select {...form.register("source")}>
          {LEAD_SOURCES.map((source) => (
            <option key={source} value={source}>
              {SOURCE_LABELS[source]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select {...form.register("status")}>
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Assigned agent">
        <Select {...form.register("assignedUserId")}>
          <option value="">Use assignment rule</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Budget">
        <Input type="number" min="0" step="1" {...form.register("budgetAmount")} />
      </Field>
      <Field label="Currency">
        <Input maxLength={3} {...form.register("budgetCurrency")} />
      </Field>
      <Field label="Preferred location">
        <Input {...form.register("preferredLocation")} />
      </Field>
      <Field label="Property type">
        <Select {...form.register("propertyType")}>
          <option value="">Not specified</option>
          {PROPERTY_TYPES.map((type) => (
            <option key={type} value={type}>
              {PROPERTY_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Buying timeline (days)">
        <Input type="number" min="0" {...form.register("buyingTimelineDays")} />
      </Field>
      <div className="md:col-span-2">
        <Field label="Notes">
          <Textarea {...form.register("notes")} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("consentToContact")} />
        Consent to be contacted is recorded
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" {...form.register("preferEmail")} />
        Prefers email
      </label>
      {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}
      <div className="md:col-span-2">
        <Button type="submit">Save lead</Button>
      </div>
    </form>
  );
}
