"use server";

import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { runAssistant } from "@/lib/ai/assistant";
import { WORKSPACE_COOKIE } from "@/lib/auth/demo-session";
import { actorIn, withCrm } from "@/lib/crm/session";
import { validateLeadCsv } from "@/lib/domain/csv";
import { sendEmail } from "@/lib/email/send";
import { postN8n } from "@/lib/integrations/n8n";
import {
  acceptInvitation,
  addPropertyImage,
  approveDraft,
  archiveContact,
  changeDealStage,
  createDeal,
  createInvitation,
  createLead,
  createProperty,
  createTask,
  createViewing,
  createWorkspaceRecord,
  markDraftDelivery,
  prepareSequenceDrafts,
  processReminders,
  saveDraft,
  setMemberRole,
  updateContact,
  updateLead,
  updateTask,
  updateViewing,
  updateWorkspaceSettings,
} from "@/lib/data/operations";
import type { Database } from "@/lib/data/types";
import { CrmError } from "@/lib/data/types";
import { demoUploadPath } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/server";
import {
  dealFormSchema,
  leadFormSchema,
  propertyFormSchema,
  taskFormSchema,
  viewingFormSchema,
} from "@/lib/validation/crm";
import type { PipelineStage } from "@/lib/domain/pipeline";
import type { Actor } from "@/lib/data/types";
import { LEAD_SOURCES, PROPERTY_TYPES } from "@/lib/domain/labels";
import { resolveDataMode } from "@/lib/config";

function failure(error: unknown) {
  if (error instanceof CrmError) return error.message;
  console.error(error);
  return "Something went wrong. Try again.";
}

function redirectNotice(path: string, message: string): never {
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}notice=${encodeURIComponent(message)}`);
}

async function requestedWorkspace() {
  return (await cookies()).get(WORKSPACE_COOKIE)?.value;
}

async function inWorkspace<T>(fn: (db: Database, actor: Actor) => T | Promise<T>) {
  const requested = await requestedWorkspace();
  return withCrm((db, userId) => {
    const membership =
      db.members.find((member) => member.userId === userId && member.active && member.workspaceId === requested) ??
      db.members.find((member) => member.userId === userId && member.active);
    if (!membership) throw new CrmError("Create a workspace before continuing.", 400);
    return fn(db, actorIn(db, userId, membership.workspaceId));
  });
}

export async function createLeadAction(input: unknown) {
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const lead = await inWorkspace((db, actor) =>
      createLead(db, actor, {
        ...parsed.data,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        assignedUserId: parsed.data.assignedUserId || null,
        propertyType: parsed.data.propertyType || null,
        budgetAmount: parsed.data.budgetAmount ?? null,
        buyingTimelineDays: parsed.data.buyingTimelineDays ?? null,
      }),
    );
    const n8n = await postN8n(
      "lead-intake",
      { leadId: lead.id, workspaceId: lead.workspaceId },
      lead.idempotencyKey ?? lead.id,
    );
    const notice =
      n8n.status === "succeeded"
        ? "Lead saved. n8n accepted the intake event."
        : n8n.status === "failed"
          ? "Lead saved. n8n did not accept the event."
          : "Lead saved. n8n is not connected.";
    redirect(`/leads/${lead.id}?notice=${encodeURIComponent(notice)}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: failure(error) };
  }
}

export async function updateLeadAction(leadId: string, input: unknown) {
  const parsed = leadFormSchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await inWorkspace((db, actor) =>
      updateLead(db, actor, leadId, {
        ...parsed.data,
        propertyType: parsed.data.propertyType === "" ? null : parsed.data.propertyType,
        assignedUserId: parsed.data.assignedUserId === "" ? null : parsed.data.assignedUserId,
      }),
    );
  } catch (error) {
    return { error: failure(error) };
  }
  redirect(`/leads/${leadId}?notice=Lead+updated`);
}

export async function importLeadsAction(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File)) redirectNotice("/leads", "Choose a CSV file.");
  const text = await file.text();
  const parsed = validateLeadCsv(text);
  if (parsed.issues.length > 0) {
    redirectNotice("/leads", parsed.issues.map((issue) => `Row ${issue.row}: ${issue.message}`).join(" "));
  }
  try {
    const count = await inWorkspace((db, actor) => {
      let created = 0;
      for (const row of parsed.rows) {
        const source = LEAD_SOURCES.includes(row.source as (typeof LEAD_SOURCES)[number])
          ? (row.source as (typeof LEAD_SOURCES)[number])
          : "other";
        const propertyType = PROPERTY_TYPES.includes(row.property_type as (typeof PROPERTY_TYPES)[number])
          ? (row.property_type as (typeof PROPERTY_TYPES)[number])
          : null;
        createLead(db, actor, {
          fullName: row.full_name,
          email: row.email || null,
          phone: row.phone || null,
          source,
          budgetAmount: row.budget_amount ? Number(row.budget_amount) : null,
          budgetCurrency: row.budget_currency || undefined,
          preferredLocation: row.preferred_location || null,
          propertyType,
          buyingTimelineDays: row.buying_timeline_days ? Number(row.buying_timeline_days) : null,
          notes: row.notes || "",
          consentToContact: row.consent_to_contact === "true",
        });
        created += 1;
      }
      return created;
    });
    redirect(`/leads?notice=${encodeURIComponent(`${count} leads imported`)}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/leads", failure(error));
  }
}

export async function createPropertyAction(input: unknown) {
  const parsed = propertyFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const property = await inWorkspace((db, actor) =>
      createProperty(db, actor, {
        ...parsed.data,
        description: parsed.data.description ?? "",
        addressLine: parsed.data.addressLine ?? "",
        region: parsed.data.region ?? "",
        postalCode: parsed.data.postalCode ?? "",
        country: parsed.data.country ?? "",
        bedrooms: parsed.data.bedrooms ?? null,
        bathrooms: parsed.data.bathrooms ?? null,
        areaValue: parsed.data.areaValue ?? null,
        assignedUserId: parsed.data.assignedUserId || null,
      }),
    );
    redirect(`/properties/${property.id}?notice=Property+saved`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: failure(error) };
  }
}

export async function uploadPropertyImageAction(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  const back = propertyId ? `/properties/${propertyId}` : "/properties";
  const file = formData.get("file");
  if (!(file instanceof File)) redirectNotice(back, "Choose an image.");
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) redirectNotice(back, "Upload a JPEG, PNG, or WebP image.");
  if (file.size > 5 * 1024 * 1024) redirectNotice(back, "Images must be 5 MB or smaller.");
  try {
    const mode = resolveDataMode();
    const supabase = mode.mode === "supabase" ? await createClient() : null;
    await inWorkspace(async (db, actor) => {
      const property = db.properties.find(
        (item) => item.id === propertyId && item.workspaceId === actor.workspaceId,
      );
      if (!property) throw new CrmError("Property not found.", 404);
      const filename = `${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
      if (supabase) {
        const storagePath = `${actor.workspaceId}/${property.id}/${filename}`;
        const { error } = await supabase.storage.from("property-images").upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });
        if (error) throw new CrmError(error.message, 400);
        addPropertyImage(db, actor, { propertyId, storagePath, altText: property.title });
        return;
      }
      const target = demoUploadPath(filename);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(await file.arrayBuffer()));
      addPropertyImage(db, actor, {
        propertyId,
        storagePath: `demo/${filename}`,
        altText: property.title,
      });
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice(back, failure(error));
  }
  redirect(`/properties/${propertyId}?notice=Image+saved`);
}

export async function createDealAction(input: unknown) {
  const parsed = dealFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const deal = await inWorkspace((db, actor) =>
      createDeal(db, actor, {
        ...parsed.data,
        propertyId: parsed.data.propertyId || null,
        assignedUserId: parsed.data.assignedUserId || null,
        expectedCloseDate: parsed.data.expectedCloseDate || null,
      }),
    );
    redirect(`/pipeline?notice=${encodeURIComponent(`Deal ${deal.title} created`)}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: failure(error) };
  }
}

export async function changeDealStageAction(dealId: string, stage: PipelineStage) {
  try {
    await inWorkspace((db, actor) => changeDealStage(db, actor, dealId, stage));
    return { ok: true as const };
  } catch (error) {
    return { error: failure(error) };
  }
}

export async function createTaskAction(input: unknown) {
  const parsed = taskFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await inWorkspace((db, actor) =>
      createTask(db, actor, {
        ...parsed.data,
        dueAt: parsed.data.dueAt || null,
        assignedUserId: parsed.data.assignedUserId || null,
        leadId: parsed.data.leadId || null,
        dealId: parsed.data.dealId || null,
        propertyId: parsed.data.propertyId || null,
      }),
    );
  } catch (error) {
    return { error: failure(error) };
  }
  redirect("/tasks?notice=Task+created");
}

export async function updateTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as "pending" | "in_progress" | "completed" | "cancelled";
  const dueAt = formData.get("dueAt");
  try {
    await inWorkspace((db, actor) =>
      updateTask(db, actor, taskId, {
        status,
        dueAt: typeof dueAt === "string" && dueAt ? new Date(dueAt).toISOString() : undefined,
      }),
    );
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/tasks", failure(error));
  }
  redirect("/tasks?notice=Task+updated");
}

export async function createViewingAction(input: unknown) {
  const parsed = viewingFormSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const viewing = await inWorkspace((db, actor) =>
      createViewing(db, actor, {
        ...parsed.data,
        assignedUserId: parsed.data.assignedUserId || null,
        startsAt: new Date(parsed.data.startsAt).toISOString(),
        endsAt: new Date(parsed.data.endsAt).toISOString(),
      }),
    );
    redirect(`/viewings?notice=${encodeURIComponent(`Viewing saved. Google Calendar is ${viewing.googleSyncStatus.replaceAll("_", " ")}.`)}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    return { error: failure(error) };
  }
}

export async function updateViewingAction(formData: FormData) {
  const viewingId = String(formData.get("viewingId") ?? "");
  const status = String(formData.get("status") ?? "") as "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  try {
    await inWorkspace((db, actor) => updateViewing(db, actor, viewingId, { status }));
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/viewings", failure(error));
  }
  redirect("/viewings?notice=Viewing+updated");
}

export async function updateContactAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  try {
    await inWorkspace((db, actor) =>
      updateContact(db, actor, contactId, {
        fullName: String(formData.get("fullName") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        contactType: String(formData.get("contactType") ?? "buyer") as "buyer",
        notes: String(formData.get("notes") ?? ""),
      }),
    );
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice(contactId ? `/contacts/${contactId}` : "/contacts", failure(error));
  }
  redirect(`/contacts/${contactId}?notice=Contact+updated`);
}

export async function archiveContactAction(formData: FormData) {
  const contactId = String(formData.get("contactId") ?? "");
  try {
    await inWorkspace((db, actor) => archiveContact(db, actor, contactId));
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/contacts", failure(error));
  }
  redirect("/contacts?notice=Contact+archived");
}

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  try {
    const workspace = await withCrm((db, userId) => createWorkspaceRecord(db, userId, name, slug));
    const jar = await cookies();
    jar.set(WORKSPACE_COOKIE, workspace.id, { httpOnly: true, sameSite: "lax", path: "/" });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/onboarding", failure(error));
  }
  redirect("/overview?notice=Workspace+created");
}

export async function updateSettingsAction(formData: FormData) {
  try {
    await inWorkspace((db, actor) =>
      updateWorkspaceSettings(db, actor, {
        name: String(formData.get("name") ?? ""),
        currency: String(formData.get("currency") ?? "USD").toUpperCase(),
        timezone: String(formData.get("timezone") ?? "America/New_York"),
        assignmentStrategy: String(formData.get("assignmentStrategy") ?? "round_robin") as "round_robin",
        followUpDueHours: Number(formData.get("followUpDueHours") ?? 24),
        taskReminderHours: Number(formData.get("taskReminderHours") ?? 2),
        viewingReminderHours: Number(formData.get("viewingReminderHours") ?? 24),
      }),
    );
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/settings", failure(error));
  }
  redirect("/settings?notice=Settings+saved");
}

export async function setMemberRoleAction(formData: FormData) {
  try {
    await inWorkspace((db, actor) =>
      setMemberRole(
        db,
        actor,
        String(formData.get("memberId") ?? ""),
        String(formData.get("role") ?? "agent") as "agent",
      ),
    );
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/settings", failure(error));
  }
  redirect("/settings?notice=Role+updated");
}

export async function updateProfileAction(formData: FormData) {
  try {
    await withCrm((db, userId) => {
      const profile = db.profiles.find((item) => item.id === userId);
      if (!profile) throw new CrmError("Profile not found.", 404);
      profile.fullName = String(formData.get("fullName") ?? profile.fullName).trim();
      profile.phone = String(formData.get("phone") ?? "") || null;
      profile.timezone = String(formData.get("timezone") ?? profile.timezone);
      profile.updatedAt = new Date().toISOString();
      return profile;
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/settings", failure(error));
  }
  redirect("/settings?notice=Profile+saved");
}

export async function rotateIntakeKeyAction() {
  const token = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  try {
    await inWorkspace((db, actor) => {
      if (actor.role !== "owner" && actor.role !== "admin") {
        throw new CrmError("Only an owner or admin can rotate the intake key.", 403);
      }
      const workspace = db.workspaces.find((item) => item.id === actor.workspaceId);
      if (!workspace) throw new CrmError("Workspace not found.", 404);
      workspace.intakeKeyHash = hash;
      workspace.updatedAt = new Date().toISOString();
    });
  } catch (error) {
    return { error: failure(error) };
  }
  return { token };
}

const INVITE_ROLES = ["admin", "agent", "viewer"] as const;

export async function createInvitationAction(input: { email: string; role: string }) {
  const role = INVITE_ROLES.find((item) => item === input.role);
  if (!role) return { error: "Choose admin, agent, or viewer." };
  const token = randomBytes(24).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    await inWorkspace((db, actor) =>
      createInvitation(db, actor, {
        email: input.email,
        role,
        tokenHash,
      }),
    );
  } catch (error) {
    return { error: failure(error) };
  }
  return { token };
}

export async function acceptInvitationAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  let workspaceId = "";
  try {
    const member = await withCrm((db, userId) => acceptInvitation(db, userId, token));
    workspaceId = member.workspaceId;
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/settings", failure(error));
  }
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, workspaceId, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect("/overview?notice=Invitation+accepted");
}

export async function toggleWorkflowAction(formData: FormData) {
  const workflowId = String(formData.get("workflowId") ?? "");
  try {
    await inWorkspace((db, actor) => {
      if (actor.role === "viewer") throw new CrmError("Viewers cannot change automations.", 403);
      const workflow = db.workflows.find((item) => item.id === workflowId && item.workspaceId === actor.workspaceId);
      if (!workflow) throw new CrmError("Workflow not found.", 404);
      workflow.enabled = formData.get("enabled") === "true";
      workflow.updatedAt = new Date().toISOString();
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/automations", failure(error));
  }
  redirect("/automations?notice=Workflow+updated");
}

export async function runRemindersAction() {
  try {
    const result = await inWorkspace((db, actor) => processReminders(db, actor.workspaceId));
    redirect(
      `/automations?notice=${encodeURIComponent(`Queued ${result.taskReminders} task reminders and ${result.viewingReminders} viewing reminders. Email was not sent where the provider is not configured.`)}`,
    );
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/automations", failure(error));
  }
}

export async function prepareSequenceAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  try {
    const drafts = await inWorkspace((db, actor) => prepareSequenceDrafts(db, actor, leadId));
    redirect(`/leads/${leadId}?notice=${encodeURIComponent(`${drafts.length} drafts are waiting for approval. Nothing was sent.`)}`);
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice(leadId ? `/leads/${leadId}` : "/leads", failure(error));
  }
}

export async function saveDraftAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  try {
    await inWorkspace((db, actor) =>
      saveDraft(db, actor, {
        leadId: leadId || null,
        subject: String(formData.get("subject") ?? ""),
        body: String(formData.get("body") ?? ""),
        source: formData.get("source") === "ai" ? "ai" : "agent",
      }),
    );
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice(leadId ? `/leads/${leadId}` : "/assistant", failure(error));
  }
  redirect(leadId ? `/leads/${leadId}?notice=Draft+saved` : "/assistant?notice=Draft+saved");
}

export async function approveAndSendAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  try {
    await inWorkspace(async (db, actor) => {
      const approved = approveDraft(db, actor, draftId);
      const lead = db.leads.find((item) => item.id === approved.leadId);
      if (!lead?.email || !lead.consentToContact || !lead.preferEmail) {
        markDraftDelivery(db, actor, draftId, {
          status: "not_sent",
          errorDetail: "The lead has no email consent or email preference.",
        });
        return;
      }
      const result = await sendEmail({ to: lead.email, subject: approved.subject, text: approved.body });
      if (result.status === "sent") {
        markDraftDelivery(db, actor, draftId, { status: "sent", providerMessageId: result.providerMessageId });
      } else {
        markDraftDelivery(db, actor, draftId, { status: result.status === "failed" ? "failed" : "not_sent", errorDetail: result.error });
      }
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    redirectNotice("/assistant", failure(error));
  }
  redirect("/assistant?notice=Send+attempt+recorded");
}

export async function askAssistantAction(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  const kind = String(formData.get("kind") ?? "summary") as "summary";
  try {
    const facts = await inWorkspace((db, actor) => {
      const lead = db.leads.find((item) => item.id === leadId && item.workspaceId === actor.workspaceId);
      if (!lead) throw new CrmError("Lead not found.", 404);
      const tasks = db.tasks.filter((task) => task.leadId === lead.id).map((task) => ({ title: task.title, status: task.status, dueAt: task.dueAt }));
      const activities = db.activities
        .filter((activity) => activity.recordId === lead.id)
        .map((activity) => ({ eventType: activity.eventType, at: activity.createdAt }));
      return {
        userId: actor.userId,
        facts: {
          name: lead.fullName,
          status: lead.status,
          budget: lead.budgetAmount,
          currency: lead.budgetCurrency,
          location: lead.preferredLocation,
          propertyType: lead.propertyType,
          timelineDays: lead.buyingTimelineDays,
          score: lead.qualificationScore,
          scoreRules: lead.scoreExplanation,
          tasks,
          activities,
          untrustedNotes: lead.notes,
        },
      };
    });
    const result = await runAssistant({ userId: facts.userId, kind, facts: facts.facts });
    if (result.available && "output" in result && result.output?.draftBody) {
      await inWorkspace((db, actor) =>
        saveDraft(db, actor, {
          leadId,
          subject: result.output?.draftSubject || "Follow up",
          body: result.output?.draftBody || "",
          source: "ai",
        }),
      );
    }
    return result;
  } catch (error) {
    return { available: true as const, error: failure(error) };
  }
}
