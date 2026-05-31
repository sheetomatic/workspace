import type { WaLeadCaptureStep } from "@prisma/client";
import { formatWhatsAppPhone } from "@/lib/phone";

export type LeadCaptureContact = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  requirementDescription: string | null;
  leadCaptureStep: WaLeadCaptureStep;
  leadCaptureComplete: boolean;
};

export type LeadFormFields = {
  name: string;
  email: string;
  city: string;
  requirement: string;
};

export type ParseLeadFormOptions = {
  missingKeys?: Array<keyof LeadFormFields>;
};

const GREETING_WORDS = new Set([
  "hi",
  "hello",
  "hey",
  "hii",
  "hola",
  "namaste",
  "good morning",
  "good afternoon",
  "good evening",
  "start",
  "menu",
  "thanks",
  "thank you",
  "ok",
  "okay",
]);

const REQUIREMENT_KEYWORDS =
  /\b(api|whatsapp|whats\s*app|automation|excel|sheet|sheets|crm|bot|chatbot|integration|dashboard|appsheet|google|mis|training|software|website|app|digital|marketing|course|consult|support|help|service|business|workflow|invoice|inventory|erp|pos)\b/i;

const FIELD_ORDER: Array<keyof LeadFormFields> = [
  "name",
  "email",
  "city",
  "requirement",
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function cleanFieldValue(value: string, max: number) {
  return value.replace(/^\*|\*$/g, "").trim().slice(0, max);
}

function extractEmail(text: string) {
  const match = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i);
  return match?.[0]?.toLowerCase() ?? null;
}

function removeExtractedEmail(line: string, email: string) {
  const lowerLine = line.toLowerCase();
  const lowerEmail = email.toLowerCase();
  const index = lowerLine.indexOf(lowerEmail);
  if (index === -1) {
    return line.trim();
  }
  return `${line.slice(0, index)}${line.slice(index + email.length)}`.trim();
}

export function isPhoneLikeName(value: string | null | undefined) {
  if (!value?.trim()) {
    return false;
  }
  const trimmed = value.trim();
  if (/^\+?\d[\d\s\-()]{8,}$/.test(trimmed)) {
    return true;
  }
  const digits = trimmed.replace(/\D/g, "");
  return digits.length >= 10 && digits.length / trimmed.length > 0.5;
}

function looksLikeRequirement(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 5) {
    return false;
  }
  if (REQUIREMENT_KEYWORDS.test(trimmed)) {
    return true;
  }
  return trimmed.length >= 12;
}

function looksLikePersonName(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length < 2 ||
    trimmed.length > 80 ||
    isValidEmail(trimmed) ||
    isPhoneLikeName(trimmed) ||
    looksLikeRequirement(trimmed) ||
    GREETING_WORDS.has(trimmed.toLowerCase())
  ) {
    return false;
  }
  return /^[\p{L}\s'.-]+$/u.test(trimmed);
}

function looksLikeCity(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length < 2 ||
    trimmed.length > 60 ||
    isValidEmail(trimmed) ||
    isPhoneLikeName(trimmed) ||
    looksLikeRequirement(trimmed)
  ) {
    return false;
  }
  return /^[\p{L}\s'.-]+$/u.test(trimmed);
}

function firstNameFrom(value: string | undefined) {
  return value?.split(/\s+/)[0]?.replace(/[,.!?;:]+$/g, "") ?? undefined;
}

function parseLabeledLine(line: string) {
  const patterns: Array<{ key: keyof LeadFormFields; regex: RegExp }> = [
    { key: "name", regex: /^(?:\d+[.)]\s*)?(?:\*?name\*?|full name)\s*[:.\-]\s*(.+)$/i },
    { key: "email", regex: /^(?:\d+[.)]\s*)?(?:\*?email\*?|e-mail)\s*[:.\-]\s*(.+)$/i },
    { key: "city", regex: /^(?:\d+[.)]\s*)?(?:\*?city\*?|location)\s*[:.\-]\s*(.+)$/i },
    {
      key: "requirement",
      regex:
        /^(?:\d+[.)]\s*)?(?:\*?requirement\*?|\*?need\*?|\*?query\*?|\*?message\*?|\*?help\*?)\s*[:.\-]\s*(.+)$/i,
    },
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern.regex);
    if (match?.[1]) {
      return { key: pattern.key, value: cleanFieldValue(match[1], 2000) };
    }
  }

  return null;
}

function parseDelimitedLine(line: string) {
  const parts = line
    .split(/\s*[|,]\s*|\s+\/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const parsed: Partial<LeadFormFields> = {};

  for (const part of parts) {
    const email = extractEmail(part);
    if (email && !parsed.email) {
      parsed.email = email;
    }
  }

  if (parts.length >= 4) {
    const emailPart = parts.find((part) => extractEmail(part));
    const nonEmailParts = parts.filter((part) => part !== emailPart);
    parsed.name = cleanFieldValue(nonEmailParts[0] ?? parts[0], 120);
    parsed.email = emailPart ? extractEmail(emailPart) ?? undefined : parsed.email;
    parsed.city = cleanFieldValue(nonEmailParts[1] ?? parts[2], 120);
    parsed.requirement = cleanFieldValue(
      (nonEmailParts.slice(2).join(", ") || parts.slice(3).join(", ")),
      2000,
    );
    return parsed;
  }

  if (parts.length === 3) {
    const [first, second, third] = parts;
    const secondEmail = extractEmail(second);
    if (secondEmail) {
      parsed.name = cleanFieldValue(first, 120);
      parsed.email = secondEmail;
      if (looksLikeRequirement(third)) {
        parsed.requirement = cleanFieldValue(third, 2000);
      } else {
        parsed.city = cleanFieldValue(third, 120);
      }
    } else if (looksLikeRequirement(third)) {
      parsed.name = cleanFieldValue(first, 120);
      parsed.city = cleanFieldValue(second, 120);
      parsed.requirement = cleanFieldValue(third, 2000);
    } else {
      parsed.city = cleanFieldValue(first, 120);
      parsed.requirement = cleanFieldValue([second, third].join(", "), 2000);
    }
    return parsed;
  }

  if (parts.length === 2) {
    const [first, second] = parts;
    const firstEmail = extractEmail(first);
    const secondEmail = extractEmail(second);
    if (firstEmail) {
      parsed.email = firstEmail;
      if (looksLikeRequirement(second)) {
        parsed.requirement = cleanFieldValue(second, 2000);
      } else {
        parsed.city = cleanFieldValue(second, 120);
      }
      return parsed;
    }
    if (secondEmail) {
      parsed.name = cleanFieldValue(first, 120);
      parsed.email = secondEmail;
      return parsed;
    }
    if (looksLikeRequirement(second)) {
      if (looksLikePersonName(first)) {
        parsed.name = cleanFieldValue(first, 120);
        parsed.requirement = cleanFieldValue(second, 2000);
      } else if (looksLikeCity(first)) {
        parsed.city = cleanFieldValue(first, 120);
        parsed.requirement = cleanFieldValue(second, 2000);
      }
      return Object.keys(parsed).length > 0 ? parsed : null;
    }
  }

  return Object.keys(parsed).length >= 2 ? parsed : null;
}

function parseMultilineStack(lines: string[]) {
  const parsed: Partial<LeadFormFields> = {};
  const contentLines: string[] = [];

  for (const line of lines) {
    const labeled = parseLabeledLine(line);
    if (labeled) {
      parsed[labeled.key] = cleanFieldValue(
        labeled.value,
        labeled.key === "requirement" ? 2000 : labeled.key === "email" ? 160 : 120,
      );
      if (labeled.key === "email") {
        parsed.email = parsed.email?.toLowerCase();
      }
      continue;
    }

    const email = extractEmail(line);
    if (email) {
      parsed.email = email;
      const remainder = removeExtractedEmail(line, email).replace(
        /^[,|\s-]+|[,|\s-]+$/g,
        "",
      );
      if (remainder) {
        contentLines.push(remainder);
      }
      continue;
    }

    contentLines.push(line);
  }

  const unassigned = [...contentLines];

  while (unassigned.length > 0) {
    const last = unassigned[unassigned.length - 1];
    if (!parsed.requirement && looksLikeRequirement(last)) {
      parsed.requirement = cleanFieldValue(last, 2000);
      unassigned.pop();
      continue;
    }
    break;
  }

  if (unassigned.length === 1) {
    const [only] = unassigned;
    if (!parsed.name && looksLikePersonName(only)) {
      parsed.name = cleanFieldValue(only, 120);
    } else if (!parsed.city && looksLikeCity(only)) {
      parsed.city = cleanFieldValue(only, 120);
    } else if (!parsed.requirement) {
      parsed.requirement = cleanFieldValue(only, 2000);
    }
  } else if (unassigned.length === 2) {
    if (!parsed.name) {
      parsed.name = cleanFieldValue(unassigned[0], 120);
    }
    if (!parsed.city) {
      parsed.city = cleanFieldValue(unassigned[1], 120);
    }
  } else if (unassigned.length >= 3) {
    if (!parsed.name) {
      parsed.name = cleanFieldValue(unassigned[0], 120);
    }
    if (!parsed.city) {
      parsed.city = cleanFieldValue(unassigned[1], 120);
    }
    if (!parsed.requirement) {
      parsed.requirement = cleanFieldValue(unassigned.slice(2).join(", "), 2000);
    }
  }

  return parsed;
}

function parseExplicitNameCityPhrase(text: string) {
  const fromMatch = text.match(
    /^(?:i\s*am|i'm|my\s*name\s*is)\s+(.+?)\s+(?:from|in|at|based in)\s+(.+)$/i,
  );
  if (fromMatch) {
    return {
      name: cleanFieldValue(fromMatch[1], 120),
      city: cleanFieldValue(fromMatch[2], 120),
    };
  }

  return null;
}

function parseContextualReply(
  text: string,
  missingKeys: Array<keyof LeadFormFields>,
) {
  const trimmed = text.trim();
  if (!trimmed || missingKeys.length === 0) {
    return {};
  }

  if (missingKeys.length === 1) {
    const key = missingKeys[0];
    if (key === "email") {
      const email = extractEmail(trimmed);
      return email ? { email } : {};
    }
    return {
      [key]: cleanFieldValue(
        trimmed,
        key === "requirement" ? 2000 : 120,
      ),
    };
  }

  if (/[,|]/.test(trimmed)) {
    const parts = trimmed
      .split(/\s*[,|]\s*/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const result: Partial<LeadFormFields> = {};
      result[missingKeys[0]] = cleanFieldValue(
        parts[0],
        missingKeys[0] === "requirement" ? 2000 : 120,
      );
      result[missingKeys[1]] = cleanFieldValue(
        parts.slice(1).join(", "),
        missingKeys[1] === "requirement" ? 2000 : 120,
      );
      return result;
    }
  }

  const delimited = parseDelimitedLine(trimmed);
  if (delimited) {
    const result: Partial<LeadFormFields> = {};
    for (const key of missingKeys) {
      if (delimited[key]) {
        result[key] = delimited[key];
      }
    }
    if (Object.keys(result).length > 0) {
      return result;
    }
  }

  if (missingKeys.includes("requirement") && looksLikeRequirement(trimmed)) {
    return { requirement: cleanFieldValue(trimmed, 2000) };
  }

  return {};
}

function inferSingleValue(
  text: string,
  known: Partial<LeadFormFields>,
  missingKeys?: Array<keyof LeadFormFields>,
): Partial<LeadFormFields> {
  if (missingKeys && missingKeys.length > 0 && missingKeys.length <= 2) {
    return parseContextualReply(text, missingKeys);
  }

  const trimmed = text.trim();
  if (!trimmed || GREETING_WORDS.has(trimmed.toLowerCase())) {
    return {};
  }

  const email = extractEmail(trimmed);
  if (email) {
    return { email };
  }

  const effectiveKnown = {
    ...known,
    name:
      known.name && !isPhoneLikeName(known.name) ? known.name : undefined,
  };

  if (looksLikeRequirement(trimmed) && !effectiveKnown.requirement) {
    return { requirement: cleanFieldValue(trimmed, 2000) };
  }

  if (!effectiveKnown.name && looksLikePersonName(trimmed)) {
    return { name: cleanFieldValue(trimmed, 120) };
  }

  if (!effectiveKnown.city && looksLikeCity(trimmed)) {
    return { city: cleanFieldValue(trimmed, 120) };
  }

  if (!effectiveKnown.requirement && trimmed.length >= 8) {
    return { requirement: cleanFieldValue(trimmed, 2000) };
  }

  return {};
}

export function buildKnownLeadFields(
  contact: Pick<
    LeadCaptureContact,
    "name" | "email" | "city" | "requirementDescription"
  >,
): Partial<LeadFormFields> {
  return {
    name:
      contact.name && !isPhoneLikeName(contact.name)
        ? contact.name
        : undefined,
    email: contact.email ?? undefined,
    city: contact.city ?? undefined,
    requirement: contact.requirementDescription ?? undefined,
  };
}

export function parseLeadFormMessage(
  rawText: string,
  known: Partial<LeadFormFields> = {},
  options: ParseLeadFormOptions = {},
): Partial<LeadFormFields> {
  const parsed: Partial<LeadFormFields> = {};
  const text = rawText.trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const missingKeys = options.missingKeys ?? [];

  if (missingKeys.length > 0 && missingKeys.length <= 2 && lines.length === 1) {
    Object.assign(parsed, parseContextualReply(lines[0], missingKeys));
    if (Object.keys(parsed).length > 0) {
      return parsed;
    }
  }

  if (lines.length >= 2) {
    Object.assign(parsed, parseMultilineStack(lines));
  }

  for (const line of lines) {
    const labeled = parseLabeledLine(line);
    if (labeled) {
      parsed[labeled.key] = cleanFieldValue(
        labeled.value,
        labeled.key === "requirement" ? 2000 : labeled.key === "email" ? 160 : 120,
      );
      if (labeled.key === "email") {
        parsed.email = parsed.email?.toLowerCase();
      }
    }
  }

  if (lines.length === 1) {
    const delimited = parseDelimitedLine(lines[0]);
    if (delimited) {
      for (const [key, value] of Object.entries(delimited) as Array<
        [keyof LeadFormFields, string | undefined]
      >) {
        parsed[key] = parsed[key] ?? value;
      }
    }
  }

  const email = extractEmail(text);
  if (email) {
    parsed.email = email;
  }

  if (!parsed.name || !parsed.city) {
    const nameCity = parseExplicitNameCityPhrase(lines.length === 1 ? lines[0] : "");
    if (nameCity) {
      parsed.name = parsed.name ?? nameCity.name;
      parsed.city = parsed.city ?? nameCity.city;
    }
  }

  if (Object.keys(parsed).length === 0 && lines.length === 1) {
    Object.assign(parsed, inferSingleValue(lines[0], known, missingKeys));
  }

  return parsed;
}

export function mergeLeadFormFields(
  contact: Pick<
    LeadCaptureContact,
    "name" | "email" | "city" | "requirementDescription"
  >,
  parsed: Partial<LeadFormFields>,
): Partial<LeadFormFields> {
  const existingName =
    contact.name && !isPhoneLikeName(contact.name) ? contact.name : undefined;

  return {
    name: parsed.name ?? existingName ?? undefined,
    email: parsed.email ?? contact.email ?? undefined,
    city: parsed.city ?? contact.city ?? undefined,
    requirement:
      parsed.requirement ?? contact.requirementDescription ?? undefined,
  };
}

function validateField(
  key: keyof LeadFormFields,
  value: string | undefined,
): { ok: true; value: string } | { ok: false; key: keyof LeadFormFields } {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return { ok: false, key };
  }

  switch (key) {
    case "name":
      if (
        trimmed.length < 2 ||
        /^\d+$/.test(trimmed) ||
        isPhoneLikeName(trimmed) ||
        GREETING_WORDS.has(trimmed.toLowerCase())
      ) {
        return { ok: false, key };
      }
      return { ok: true, value: trimmed.slice(0, 120) };
    case "email":
      if (!isValidEmail(trimmed.toLowerCase())) {
        return { ok: false, key };
      }
      return { ok: true, value: trimmed.toLowerCase().slice(0, 160) };
    case "city":
      if (trimmed.length < 2 || isValidEmail(trimmed) || looksLikeRequirement(trimmed)) {
        return { ok: false, key };
      }
      return { ok: true, value: trimmed.slice(0, 120) };
    case "requirement":
      if (trimmed.length < 5) {
        return { ok: false, key };
      }
      return { ok: true, value: trimmed.slice(0, 2000) };
    default:
      return { ok: false, key };
  }
}

export function validateLeadFormFields(fields: Partial<LeadFormFields>) {
  const validated: Partial<LeadFormFields> = {};
  const missingKeys: Array<keyof LeadFormFields> = [];

  for (const key of FIELD_ORDER) {
    const result = validateField(key, fields[key]);
    if (result.ok) {
      validated[key] = result.value;
    } else {
      missingKeys.push(key);
    }
  }

  return { validated, missingKeys };
}

export function shouldRunLeadCapture(contact: LeadCaptureContact) {
  return !contact.leadCaptureComplete;
}

export function isLeadCaptureFormStep(step: WaLeadCaptureStep) {
  return (
    step === "FORM" ||
    step === "NAME" ||
    step === "EMAIL" ||
    step === "CITY" ||
    step === "REQUIREMENT"
  );
}

export function leadCaptureWelcomeText(organizationName: string, phone: string) {
  const formattedPhone = formatWhatsAppPhone(phone);
  return [
    `Hi! Welcome to *${organizationName}*.`,
    "",
    "Share these details in one message and our team will connect with you:",
    "",
    "Name | Email | City | What you need",
    "",
    "Example:",
    "_Rahul Sharma | rahul@email.com | Mumbai | Excel automation for my business_",
    "",
    `Your WhatsApp (${formattedPhone}) is already saved.`,
  ].join("\n");
}

const FIELD_PROMPTS: Record<keyof LeadFormFields, string> = {
  name: "your full name",
  email: "your email address",
  city: "your city",
  requirement: "what you need help with",
};

function formatSavedSummary(validated: Partial<LeadFormFields>) {
  const parts: string[] = [];
  if (validated.name) {
    parts.push(`Name: ${validated.name}`);
  }
  if (validated.city) {
    parts.push(`City: ${validated.city}`);
  }
  if (validated.email) {
    parts.push(`Email: ${validated.email}`);
  }
  return parts;
}

export function leadCaptureFollowUpText(
  validated: Partial<LeadFormFields>,
  missingKeys: Array<keyof LeadFormFields>,
  organizationName: string,
) {
  const firstName = firstNameFrom(validated.name);
  const greeting = firstName
    ? `Got it, ${firstName}!`
    : `Thanks for reaching out to *${organizationName}*.`;

  const saved = formatSavedSummary(validated);
  const savedLine = saved.length > 0 ? `\n\nSaved: ${saved.join(" | ")}` : "";

  if (missingKeys.length === 1) {
    return `${greeting}${savedLine}\n\nPlease share ${FIELD_PROMPTS[missingKeys[0]]}.`;
  }

  const needList = missingKeys.map((key) => `- ${FIELD_PROMPTS[key]}`).join("\n");
  return [
    greeting + savedLine,
    "",
    "Just a few details still needed:",
    needList,
    "",
    "Reply in one message - plain text is fine, no special format required.",
  ].join("\n");
}

export function leadCaptureCompleteText(organizationName: string, name?: string | null) {
  const firstName = firstNameFrom(name ?? undefined);
  return [
    firstName
      ? `All set, ${firstName}! Your details are saved with *${organizationName}*.`
      : `All set! Your details are saved with *${organizationName}*.`,
    "",
    "Our team will review your request and reply here shortly.",
    "",
    "Reply *menu* to browse FAQs and videos anytime.",
  ].join("\n");
}

export function leadCaptureBlockedMenuText(
  organizationName: string,
  phone: string,
  contact: LeadCaptureContact,
  validated?: Partial<LeadFormFields>,
  missingKeys?: Array<keyof LeadFormFields>,
) {
  if (missingKeys && missingKeys.length > 0 && validated) {
    return leadCaptureFollowUpText(validated, missingKeys, organizationName);
  }

  if (contact.leadCaptureStep === "PENDING") {
    return leadCaptureWelcomeText(organizationName, phone);
  }

  return [
    "Please share your details first so we can assist you.",
    "",
    leadCaptureWelcomeText(organizationName, phone),
  ].join("\n");
}

/** @deprecated Use leadCaptureWelcomeText */
export function leadCaptureFormText(organizationName: string, phone: string) {
  return leadCaptureWelcomeText(organizationName, phone);
}

/** @deprecated Use leadCaptureFollowUpText */
export function leadCaptureMissingFieldsText(
  missing: string[],
  organizationName: string,
  _phone: string,
) {
  const keyMap: Record<string, keyof LeadFormFields> = {
    Name: "name",
    Email: "email",
    City: "city",
    Requirement: "requirement",
  };
  const missingKeys = missing
    .map((label) => keyMap[label])
    .filter(Boolean) as Array<keyof LeadFormFields>;
  return leadCaptureFollowUpText({}, missingKeys, organizationName);
}
