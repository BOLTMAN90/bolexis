import { createPropertyAction } from "@/lib/actions/crm";
import { PageHeader, Panel } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/fields";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS } from "@/lib/domain/labels";
import { canMutateCrm } from "@/lib/domain/assignment";
import { requireActor } from "@/lib/crm/session";

export default async function NewPropertyPage() {
  const actor = await requireActor();
  if (!canMutateCrm(actor.role)) return <p>Your role cannot create listings.</p>;
  return (
    <div>
      <PageHeader title="New property" description="Images can be added after the listing is saved." />
      <Panel>
        <form
          className="grid gap-3 md:grid-cols-2"
          action={async (formData) => {
            "use server";
            await createPropertyAction(Object.fromEntries(formData));
          }}
        >
          <Field label="Title"><Input name="title" required /></Field>
          <Field label="City"><Input name="city" required /></Field>
          <Field label="Category">
            <Select name="category" defaultValue="residential">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
            </Select>
          </Field>
          <Field label="Property type">
            <Select name="propertyType" defaultValue="apartment">
              {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{PROPERTY_TYPE_LABELS[type]}</option>)}
            </Select>
          </Field>
          <Field label="Listing type">
            <Select name="listingType" defaultValue="sale">
              <option value="sale">For sale</option>
              <option value="rental">Rental</option>
            </Select>
          </Field>
          <Field label="Price"><Input name="priceAmount" type="number" min="0" required /></Field>
          <Field label="Currency"><Input name="priceCurrency" defaultValue={actor.workspace.currency} maxLength={3} /></Field>
          <Field label="Availability">
            <Select name="availability" defaultValue="available">
              <option value="available">Available</option>
              <option value="under_offer">Under offer</option>
              <option value="pending">Pending</option>
              <option value="off_market">Off market</option>
            </Select>
          </Field>
          <Field label="Area unit">
            <Select name="areaUnit" defaultValue="sqft">
              <option value="sqft">Square feet</option>
              <option value="sqm">Square meters</option>
            </Select>
          </Field>
          <Field label="Area"><Input name="areaValue" type="number" min="0" /></Field>
          <Field label="Bedrooms"><Input name="bedrooms" type="number" min="0" /></Field>
          <Field label="Bathrooms"><Input name="bathrooms" type="number" min="0" /></Field>
          <div className="md:col-span-2"><Field label="Description"><Textarea name="description" /></Field></div>
          <Button type="submit">Save property</Button>
        </form>
      </Panel>
    </div>
  );
}
