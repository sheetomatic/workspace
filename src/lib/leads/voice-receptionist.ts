import type { InboundLeadStatus, LeadCallingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logInboundLeadActivity } from "@/lib/leads/activity";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";
import { ingestInboundLead } from "@/lib/leads/ingest";
import {
  parseVoiceLeadConfig,
  parseVoiceProviderConfig,
  voiceLeadTwimlUrl,
  voiceLeadWebhookUrl,
  type VoiceLeadConfig,
  type VoiceProvider,
} from "@/lib/leads/connection-config";
import { findLeadConnectionByWebhookSecret } from "@/lib/leads/webhook-secret";
import { transcribeAudioBuffer } from "@/lib/integrations/openai";
import { resolveDueAtIso, setIstHourMinute } from "@/lib/task-due-ist";

export type MappedVoiceCall = {
  callSid: string;
  status: string;
  from: string | null;
  to: string | null;
  direction: "inbound" | "outbound" | "unknown";
  recordingUrl: string | null;
  digits: string | null;
  speech: string | null;
  leadId: string | null;
  durationSec: number | null;
  raw: Record<string, unknown>;
};

export type VoiceConfirmOutcome =
  | "confirmed"
  | "declined"
  | "callback"
  | "no_answer"
  | "unknown";

export type VoiceConfirmation = {
  outcome: VoiceConfirmOutcome;
  name: string | null;
  phone: string | null;
  visitType: string | null;
  visitAt: Date | null;
  notes: string | null;
  transcript: string | null;
};

export type VoiceConfirmWrite = {
  status: InboundLeadStatus;
  callingStatus: LeadCallingStatus;
  requirement: string | null;
  meetingNotes: string | null;
  nextFollowUpAt: Date | null;
  createMeetingFollowUp: boolean;
};

function pick(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const direct = row[key];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    if (typeof direct === "number" && Number.isFinite(direct)) return String(direct);
    const lower = Object.keys(row).find((item) => item.toLowerCase() === key.toLowerCase());
    if (lower) {
      const value = row[lower];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
  }
  return null;
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function e164PatientPhone(phone: string | null | undefined): string | null {
  const digits = leadPhoneDigits(phone);
  if (!digits) return null;
  if (digits.startsWith("91") && digits.length >= 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export function exotelDialNumber(phone: string | null | undefined): string | null {
  const digits = leadPhoneDigits(phone);
  if (!digits) return null;
  const last10 = digits.slice(-10);
  if (last10.length !== 10) return null;
  return `0${last10}`;
}

export function patientPhoneFromCall(mapped: MappedVoiceCall): string | null {
  if (mapped.direction === "outbound") {
    return mapped.to || mapped.from;
  }
  if (mapped.direction === "inbound") {
    return mapped.from || mapped.to;
  }
  return mapped.from || mapped.to;
}

export function mapVoiceCallPayload(payload: unknown): MappedVoiceCall | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const row = payload as Record<string, unknown>;
  const nested =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : row;
  const callSid =
    pick(nested, [
      "CallSid",
      "CallSID",
      "callSid",
      "Sid",
      "callid",
      "call_id",
      "CallUUID",
    ]) ?? pick(row, ["CallSid", "callid", "Sid"]);
  if (!callSid) {
    return null;
  }
  const status = (
    pick(nested, [
      "CallStatus",
      "Status",
      "DialCallStatus",
      "event_type",
      "call_status",
    ]) ?? "unknown"
  ).toLowerCase();
  const directionRaw = (
    pick(nested, ["Direction", "direction", "CallType"]) ?? ""
  ).toLowerCase();
  const direction: MappedVoiceCall["direction"] = directionRaw.includes("inbound") ||
    directionRaw.includes("incoming")
    ? "inbound"
    : directionRaw.includes("outbound") || directionRaw.includes("outgoing")
      ? "outbound"
      : "unknown";
  const durationRaw = pick(nested, [
    "CallDuration",
    "DialCallDuration",
    "duration",
    "ConversationDuration",
  ]);
  const durationSec = durationRaw ? Number(durationRaw) : null;
  return {
    callSid,
    status,
    from: pick(nested, ["From", "from", "CallerId", "customer_number", "CallFrom"]),
    to: pick(nested, ["To", "to", "DialWhomNumber", "agent_number", "CallTo"]),
    direction,
    recordingUrl: pick(nested, [
      "RecordingUrl",
      "recording_url",
      "RecordUrl",
      "RecordingUrl0",
    ]),
    digits: pick(nested, ["Digits", "digits", "dtmf", "DTMF"]),
    speech: pick(nested, ["SpeechResult", "speech", "TranscriptionText"]),
    leadId: pick(nested, ["leadId", "LeadId", "lead_id"]),
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
    raw: nested,
  };
}

const CONFIRM_RE =
  /\b(yes|yeah|yep|confirm(?:ed)?|haan+|ha ji|theek hai|sahi hai|ok(?:ay)?|correct|book(?:ed)? it|i(?:'?| a)m coming)\b/i;
const DECLINE_RE =
  /\b(no\b|nahi|not coming|cancel(?:led)?|don'?t want|not interested|galat)\b/i;
const CALLBACK_RE =
  /\b(call(?:\s+me)?\s+back|later|busy|not now|baad mein|phele call)\b/i;
const VISIT_TYPE_RE =
  /\b(follow[- ]?up|check[- ]?up|consultation|consult|cleaning|vaccine|vaccination|procedure|scan|x[- ]?ray|blood test|report|emergency|new patient)\b/i;

function extractSpokenName(text: string): string | null {
  const match = text.match(
    /\b(?:my name is|this is|i am|main|mera naam)\s+([A-Za-z][A-Za-z.\s]{1,40})/i,
  );
  const name = match?.[1]?.trim().replace(/[.,]+$/, "");
  if (!name || name.length < 2) return null;
  return name
    .split(/\s+/)
    .slice(0, 4)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function extractSpokenTime(text: string): { hour: number; minute: number } | null {
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) {
    const baje = text.match(/\b(\d{1,2})\s*baje\b/i);
    if (!baje) return null;
    const hour = Number(baje[1]);
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) return null;
    return { hour, minute: 0 };
  }
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const mer = (match[3] ?? "").toLowerCase();
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

function extractSpokenPhone(text: string): string | null {
  const match = text.match(/(\+?91[\s-]?)?[6-9]\d(?:[\s-]?\d){8,10}/);
  return leadPhoneDigits(match?.[0] ?? null);
}

export function parseConfirmationTranscript(
  text: string,
  now = new Date(),
): VoiceConfirmation {
  const trimmed = text.trim();
  const dueIso = resolveDueAtIso(trimmed, null, now);
  const spokenTime = extractSpokenTime(trimmed);
  let visitAt = dueIso ? new Date(dueIso) : null;
  if (visitAt && spokenTime) {
    visitAt = setIstHourMinute(visitAt, spokenTime.hour, spokenTime.minute);
  }
  const visitType = trimmed.match(VISIT_TYPE_RE)?.[0]?.toLowerCase() ?? null;
  let outcome: VoiceConfirmOutcome = "unknown";
  if (DECLINE_RE.test(trimmed) && !CONFIRM_RE.test(trimmed)) {
    outcome = "declined";
  } else if (CALLBACK_RE.test(trimmed) && !CONFIRM_RE.test(trimmed)) {
    outcome = "callback";
  } else if (CONFIRM_RE.test(trimmed) || dueIso) {
    outcome = "confirmed";
  }
  return {
    outcome,
    name: extractSpokenName(trimmed),
    phone: extractSpokenPhone(trimmed),
    visitType,
    visitAt,
    notes: trimmed || null,
    transcript: trimmed || null,
  };
}

export function confirmationFromMappedCall(
  mapped: MappedVoiceCall,
  transcript?: string | null,
  now = new Date(),
): VoiceConfirmation {
  const spoken = [mapped.speech, transcript].filter(Boolean).join("\n").trim();
  const parsed = spoken
    ? parseConfirmationTranscript(spoken, now)
    : {
        outcome: "unknown" as const,
        name: null,
        phone: null,
        visitType: null,
        visitAt: null,
        notes: null,
        transcript: spoken || null,
      };

  const digits = mapped.digits?.replace(/\D/g, "") ?? "";
  if (digits === "1") {
    parsed.outcome = "confirmed";
  } else if (digits === "2") {
    parsed.outcome = parsed.outcome === "confirmed" ? parsed.outcome : "declined";
  } else if (digits === "3") {
    parsed.outcome = "callback";
  }

  const status = mapped.status;
  if (
    parsed.outcome === "unknown" &&
    (status === "no-answer" ||
      status === "busy" ||
      status === "failed" ||
      status === "canceled" ||
      status === "cancelled")
  ) {
    parsed.outcome = "no_answer";
  }

  if (!parsed.phone) {
    parsed.phone = leadPhoneDigits(patientPhoneFromCall(mapped));
  }
  return parsed;
}

export function toConfirmWrite(confirmation: VoiceConfirmation): VoiceConfirmWrite {
  if (confirmation.outcome === "confirmed") {
    const hasSlot = Boolean(confirmation.visitAt);
    return {
      status: hasSlot ? "SCHEDULE_MEETING" : "SCHEDULE_MEETING",
      callingStatus: "CONNECTED",
      requirement: confirmation.visitType,
      meetingNotes: confirmation.notes,
      nextFollowUpAt: confirmation.visitAt,
      createMeetingFollowUp: hasSlot,
    };
  }
  if (confirmation.outcome === "declined") {
    return {
      status: "FOLLOW_UP",
      callingStatus: "NOT_INTERESTED",
      requirement: confirmation.visitType,
      meetingNotes: confirmation.notes,
      nextFollowUpAt: null,
      createMeetingFollowUp: false,
    };
  }
  if (confirmation.outcome === "callback") {
    return {
      status: "FOLLOW_UP",
      callingStatus: "WILL_CALL_BACK",
      requirement: confirmation.visitType,
      meetingNotes: confirmation.notes,
      nextFollowUpAt: confirmation.visitAt,
      createMeetingFollowUp: false,
    };
  }
  if (confirmation.outcome === "no_answer") {
    return {
      status: "FOLLOW_UP",
      callingStatus: "NO_ANSWER",
      requirement: confirmation.visitType,
      meetingNotes: confirmation.notes,
      nextFollowUpAt: null,
      createMeetingFollowUp: false,
    };
  }
  return {
    status: "CONTACTED",
    callingStatus: "CONNECTED",
    requirement: confirmation.visitType,
    meetingNotes: confirmation.notes,
    nextFollowUpAt: confirmation.visitAt,
    createMeetingFollowUp: Boolean(confirmation.visitAt),
  };
}

export function previewConfirmWrite(transcript: string, now = new Date()) {
  const confirmation = parseConfirmationTranscript(transcript, now);
  const write = toConfirmWrite(confirmation);
  return { confirmation, write };
}

export function buildTwilioTwiml(params: {
  clinicName: string;
  webhookUrl: string;
}): string {
  const clinic = xmlEscape(params.clinicName || "the clinic");
  const action = xmlEscape(params.webhookUrl);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is the receptionist at ${clinic}. Please confirm your visit.</Say>
  <Gather numDigits="1" action="${action}" method="POST" timeout="8">
    <Say voice="alice">Press 1 to confirm your appointment. Press 2 if you need a different time. Press 3 if we should call you back.</Say>
  </Gather>
  <Say voice="alice">After the beep, say your name and the date and time of your visit.</Say>
  <Record maxLength="60" action="${action}" recordingStatusCallback="${action}" playBeep="true" />
  <Say voice="alice">Thank you. We have noted this.</Say>
</Response>`;
}

export type VoiceCallRequest = {
  url: string;
  method: "POST";
  headers: Record<string, string>;
  body: string;
};

export function buildVoiceCallRequest(params: {
  config: Omit<VoiceLeadConfig, "webhookSecret"> & { webhookSecret?: string };
  patientPhone: string;
  leadId?: string | null;
  webhookSecret: string;
}): VoiceCallRequest | { error: string } {
  const webhookUrl = voiceLeadWebhookUrl(params.webhookSecret);
  const callback = params.leadId
    ? `${webhookUrl}?leadId=${encodeURIComponent(params.leadId)}`
    : webhookUrl;
  const e164 = e164PatientPhone(params.patientPhone);
  if (!e164) {
    return { error: "Patient phone is not valid." };
  }

  if (params.config.provider === "TWILIO") {
    const sid = params.config.twilioAccountSid ?? "";
    const token = params.config.twilioAuthToken ?? "";
    const from = params.config.twilioFromNumber ?? "";
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const body = new URLSearchParams({
      To: e164,
      From: from,
      Url: voiceLeadTwimlUrl(params.webhookSecret),
      StatusCallback: callback,
      Record: "true",
    });
    return {
      url: `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Calls.json`,
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    };
  }

  if (params.config.provider === "EXOTEL") {
    const sid = params.config.exotelSid ?? "";
    const key = params.config.exotelApiKey ?? "";
    const token = params.config.exotelApiToken ?? "";
    const subdomain = (params.config.exotelSubdomain || "api.exotel.com").replace(
      /^https?:\/\//,
      "",
    );
    const from = exotelDialNumber(params.patientPhone);
    const callerId = params.config.exotelCallerId ?? "";
    if (!from) {
      return { error: "Patient phone is not valid." };
    }
    const form = new URLSearchParams({
      From: from,
      CallerId: callerId,
      StatusCallback: callback,
      Record: "true",
    });
    if (params.config.exotelAppId) {
      form.set(
        "Url",
        `http://my.exotel.com/${sid}/exoml/start_voice/${params.config.exotelAppId}`,
      );
    } else {
      form.set("To", callerId);
    }
    const auth = Buffer.from(`${key}:${token}`).toString("base64");
    return {
      url: `https://${subdomain}/v1/Accounts/${encodeURIComponent(sid)}/Calls/connect.json`,
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    };
  }

  const kNumber = params.config.knowlarityKNumber ?? "";
  const payload: Record<string, string> = {
    k_number: kNumber,
    customer_number: e164,
  };
  if (params.config.knowlarityAgentNumber) {
    payload.agent_number = params.config.knowlarityAgentNumber;
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": params.config.knowlarityApiKey ?? "",
  };
  if (params.config.knowlarityAuth) {
    headers.Authorization = params.config.knowlarityAuth;
  }
  return {
    url: "https://kpi.knowlarity.com/Basic/v1/account/call/makecall",
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  };
}

function callSidFromProviderResponse(
  provider: VoiceProvider,
  payload: unknown,
): string | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  if (provider === "TWILIO") {
    return pick(row, ["sid", "Sid", "CallSid"]);
  }
  const call = row.Call && typeof row.Call === "object" ? (row.Call as Record<string, unknown>) : row;
  return pick(call, ["Sid", "sid", "CallSid", "call_id", "callid"]);
}

export async function startVoiceReceptionistCall(params: {
  organizationId: string;
  leadId: string;
  actorUserId?: string | null;
}): Promise<{ ok: true; message: string; callSid: string | null } | { ok: false; message: string }> {
  const [lead, connection] = await Promise.all([
    prisma.inboundLead.findFirst({
      where: { id: params.leadId, organizationId: params.organizationId },
      select: { id: true, phone: true, name: true, rawPayload: true },
    }),
    prisma.leadIngestConnection.findUnique({
      where: {
        organizationId_channel: {
          organizationId: params.organizationId,
          channel: "VOICE",
        },
      },
    }),
  ]);

  if (!lead) {
    return { ok: false, message: "Lead not found." };
  }
  if (!connection?.enabled) {
    return {
      ok: false,
      message: "Enable AI receptionist on Lead sources first.",
    };
  }
  const config = parseVoiceLeadConfig(connection.config);
  if (!config) {
    return {
      ok: false,
      message: "Paste Exotel, Twilio, or Knowlarity keys on Lead sources.",
    };
  }
  if (!leadPhoneDigits(lead.phone)) {
    return { ok: false, message: "This lead needs a phone number before we can call." };
  }

  const request = buildVoiceCallRequest({
    config,
    patientPhone: lead.phone ?? "",
    leadId: lead.id,
    webhookSecret: config.webhookSecret,
  });
  if ("error" in request) {
    return { ok: false, message: request.error };
  }

  let callSid: string | null = null;
  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body || undefined,
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      const detail =
        (json &&
          typeof json === "object" &&
          pick(json as Record<string, unknown>, ["message", "Message", "error"])) ||
        text.slice(0, 180);
      return {
        ok: false,
        message: `Call failed (${response.status}): ${detail || "provider rejected the request."}`,
      };
    }
    callSid = callSidFromProviderResponse(config.provider, json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network error";
    return { ok: false, message: `Could not reach ${config.provider}: ${message}` };
  }

  await prisma.inboundLead.update({
    where: { id: lead.id },
    data: {
      callingStatus: "CALLING",
      modifiedAt: new Date(),
      rawPayload: {
        ...((lead.rawPayload && typeof lead.rawPayload === "object"
          ? lead.rawPayload
          : {}) as Record<string, unknown>),
        aiReceptionist: {
          lastCallSid: callSid,
          lastCallAt: new Date().toISOString(),
          provider: config.provider,
          direction: "outbound",
        },
      } as Prisma.InputJsonValue,
    },
  });

  await logInboundLeadActivity({
    organizationId: params.organizationId,
    leadId: lead.id,
    type: "CALL",
    body: `AI receptionist calling ${lead.name?.trim() || lead.phone} via ${config.provider}.`,
    metadata: {
      callSid,
      provider: config.provider,
      direction: "outbound",
    },
    createdByUserId: params.actorUserId ?? null,
  });

  return {
    ok: true,
    callSid,
    message: callSid
      ? `Calling now (${config.provider} ${callSid}).`
      : `Call placed via ${config.provider}. Waiting for confirm webhook.`,
  };
}

async function priorCallOutcome(organizationId: string, callSid: string) {
  const existing = await prisma.inboundLeadActivity.findFirst({
    where: {
      organizationId,
      type: "CALL",
      metadata: { path: ["callSid"], equals: callSid },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, leadId: true, metadata: true },
  });
  if (!existing) return null;
  const metadata =
    existing.metadata && typeof existing.metadata === "object"
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const outcome =
    typeof metadata.outcome === "string" ? metadata.outcome : null;
  return { ...existing, outcome };
}

export async function persistVoiceConfirmation(params: {
  organizationId: string;
  connectionId: string;
  confirmation: VoiceConfirmation;
  mapped: MappedVoiceCall;
  existingLeadId?: string | null;
}): Promise<{ ok: true; leadId: string; created: boolean } | { ok: false; message: string }> {
  const write = toConfirmWrite(params.confirmation);
  let phone =
    params.confirmation.phone ||
    leadPhoneDigits(patientPhoneFromCall(params.mapped));
  let name = params.confirmation.name;

  if (params.existingLeadId) {
    const existing = await prisma.inboundLead.findFirst({
      where: {
        id: params.existingLeadId,
        organizationId: params.organizationId,
      },
      select: { phone: true, name: true },
    });
    phone = phone || leadPhoneDigits(existing?.phone);
    name = name || existing?.name || null;
  }

  if (!phone) {
    return { ok: false, message: "No patient phone on this call — nothing saved." };
  }

  if (params.mapped.callSid) {
    const prior = await priorCallOutcome(
      params.organizationId,
      params.mapped.callSid,
    );
    if (
      prior?.outcome === "confirmed" ||
      prior?.outcome === "declined"
    ) {
      return { ok: true, leadId: prior.leadId, created: false };
    }
  }

  const result = await ingestInboundLead({
    organizationId: params.organizationId,
    channel: "VOICE",
    connectionId: params.connectionId,
    skipConnectionSetup: true,
    suppressOwnerNotify: Boolean(params.existingLeadId),
    externalId: `call:${params.mapped.callSid}`,
    name,
    phone,
    requirement: write.requirement,
    meetingNotes: write.meetingNotes,
    callingStatus: write.callingStatus,
    status: write.status,
    nextFollowUpAt: write.nextFollowUpAt,
    sourceDetail: "AI receptionist",
    utmSource: "voice",
    utmMedium: "ai_receptionist",
    capturedAt: new Date(),
    rawPayload: {
      aiReceptionist: {
        callSid: params.mapped.callSid,
        outcome: params.confirmation.outcome,
        transcript: params.confirmation.transcript,
        recordingUrl: params.mapped.recordingUrl,
        digits: params.mapped.digits,
        providerStatus: params.mapped.status,
        confirmedAt: new Date().toISOString(),
      },
      voiceWebhook: params.mapped.raw,
    },
  });

  const lead = result.lead;
  if (!lead) {
    return { ok: false, message: "Could not save the confirmed lead." };
  }

  if (write.createMeetingFollowUp && write.nextFollowUpAt) {
    const existingFollowUp = await prisma.inboundLeadFollowUp.findFirst({
      where: {
        organizationId: params.organizationId,
        leadId: lead.id,
        type: "MEETING",
        scheduledAt: write.nextFollowUpAt,
      },
      select: { id: true },
    });
    if (!existingFollowUp) {
      await prisma.inboundLeadFollowUp.create({
        data: {
          organizationId: params.organizationId,
          leadId: lead.id,
          type: "MEETING",
          scheduledAt: write.nextFollowUpAt,
          notes:
            params.confirmation.notes ||
            `Visit confirmed by AI receptionist${
              params.confirmation.visitType ? ` · ${params.confirmation.visitType}` : ""
            }`,
        },
      });
    }
  }

  const already = params.mapped.callSid
    ? await priorCallOutcome(params.organizationId, params.mapped.callSid)
    : null;
  if (!already?.outcome) {
    await logInboundLeadActivity({
      organizationId: params.organizationId,
      leadId: lead.id,
      type: "CALL",
      body:
        params.confirmation.outcome === "confirmed"
          ? `Confirmed by AI receptionist${
              params.confirmation.visitType ? ` · ${params.confirmation.visitType}` : ""
            }${
              write.nextFollowUpAt
                ? ` · ${write.nextFollowUpAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`
                : ""
            }`
          : `AI receptionist call: ${params.confirmation.outcome.replaceAll("_", " ")}`,
      metadata: {
        callSid: params.mapped.callSid,
        outcome: params.confirmation.outcome,
        digits: params.mapped.digits,
      },
    });
  }

  return { ok: true, leadId: lead.id, created: result.created };
}

async function transcribeRecording(
  recordingUrl: string,
  config: VoiceLeadConfig,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = {};
    if (config.provider === "TWILIO" && config.twilioAccountSid && config.twilioAuthToken) {
      headers.Authorization = `Basic ${Buffer.from(
        `${config.twilioAccountSid}:${config.twilioAuthToken}`,
      ).toString("base64")}`;
    } else if (
      config.provider === "EXOTEL" &&
      config.exotelApiKey &&
      config.exotelApiToken
    ) {
      headers.Authorization = `Basic ${Buffer.from(
        `${config.exotelApiKey}:${config.exotelApiToken}`,
      ).toString("base64")}`;
    }
    const url = recordingUrl.endsWith(".mp3") ? recordingUrl : `${recordingUrl}.mp3`;
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) return null;
    const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY || null;
    return await transcribeAudioBuffer(buffer, "audio/mpeg", apiKey);
  } catch (error) {
    console.error("voice receptionist transcribe", error);
    return null;
  }
}

export async function processVoiceLeadWebhook(params: {
  webhookSecret: string;
  payload: unknown;
  leadIdFromQuery?: string | null;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const connection = await findLeadConnectionByWebhookSecret({
    channel: "VOICE",
    secret: params.webhookSecret,
  });
  if (!connection) {
    return { ok: false, message: "Unknown webhook." };
  }
  const config = parseVoiceLeadConfig(connection.config);
  if (!config) {
    return { ok: false, message: "Voice connection is incomplete." };
  }

  const mapped = mapVoiceCallPayload(params.payload);
  if (!mapped) {
    return { ok: false, message: "Missing CallSid." };
  }
  mapped.leadId = mapped.leadId || params.leadIdFromQuery || null;

  const terminal =
    mapped.digits ||
    mapped.speech ||
    mapped.recordingUrl ||
    [
      "completed",
      "no-answer",
      "busy",
      "failed",
      "canceled",
      "cancelled",
    ].includes(mapped.status);
  if (!terminal) {
    return { ok: true };
  }

  let transcript = mapped.speech;
  if (!transcript && mapped.recordingUrl) {
    transcript = await transcribeRecording(mapped.recordingUrl, config);
  }

  const confirmation = confirmationFromMappedCall(mapped, transcript);
  const saved = await persistVoiceConfirmation({
    organizationId: connection.organizationId,
    connectionId: connection.id,
    confirmation,
    mapped,
    existingLeadId: mapped.leadId,
  });

  await prisma.leadIngestConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastSyncError: saved.ok ? null : saved.message,
      syncStatus: saved.ok ? "IDLE" : "ERROR",
    },
  });

  return saved.ok ? { ok: true } : saved;
}

export async function verifyVoiceLeadConnection(organizationId: string) {
  const connection = await prisma.leadIngestConnection.findUnique({
    where: {
      organizationId_channel: { organizationId, channel: "VOICE" },
    },
  });
  const config = parseVoiceProviderConfig(connection?.config);
  if (!config) {
    return { ok: false as const, message: "Save provider keys first." };
  }
  const sample = previewConfirmWrite(
    "Haan, confirm. My name is Priya Sharma, tomorrow 4 pm checkup.",
  );
  return {
    ok: true as const,
    message: `${config.provider} keys look complete. Sample confirm would set ${sample.write.status} / ${sample.write.callingStatus}${
      sample.write.createMeetingFollowUp ? " and a MEETING follow-up" : ""
    }. Place a real call from a lead to test the provider.`,
  };
}

export { parseVoiceLeadConfig, parseVoiceProviderConfig };
