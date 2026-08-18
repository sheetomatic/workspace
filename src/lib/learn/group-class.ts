import { learnPortalOrigin } from "@/lib/workspace-auth-links";

export type StudentLoginShareInput = {
  name: string;
  email: string;
  phone: string;
  bookingToken?: string | null;
  groupMeetUrl?: string | null;
  groupLabel?: string | null;
  origin?: string;
};

/** Accept a pasted group join URL. Meet/Zoom preferred; any https join link is ok. */
export function normalizeGroupJoinUrl(raw: string | null | undefined): string | null {
  let value = (raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!value) return null;

  const extracted = value.match(/https?:\/\/[^\s<>"']+/i)?.[0];
  if (extracted) {
    value = extracted;
  } else if (/^(meet\.google\.com|zoom\.us|[\w.-]+\.daily\.co)\//i.test(value)) {
    value = `https://${value}`;
  }

  value = value.replace(/[.,);]+$/g, "").slice(0, 500);
  if (!/^https:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function studentLearnLoginUrl(
  bookingToken: string | null | undefined,
  origin = learnPortalOrigin(),
) {
  const token = bookingToken?.trim();
  if (!token) return null;
  return `${origin.replace(/\/$/, "")}/learn/login?token=${token}`;
}

export function studentLearnLoginHost(origin = learnPortalOrigin()) {
  return origin.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export function buildStudentLoginShareText(input: StudentLoginShareInput): string {
  const origin = (input.origin ?? learnPortalOrigin()).replace(/\/$/, "");
  const host = studentLearnLoginHost(origin);
  const tokenUrl = studentLearnLoginUrl(input.bookingToken, origin);
  const lines = [
    "Sheetomatic Learn — student login",
    `Name: ${input.name.trim() || "—"}`,
    `Email: ${input.email.trim() || "—"}`,
    `WhatsApp: ${input.phone.trim() || "—"}`,
  ];
  if (tokenUrl) {
    lines.push(`Open: ${tokenUrl}`);
  }
  lines.push(`Or ${host}/learn/login with email + WhatsApp number.`);
  const groupUrl = input.groupMeetUrl?.trim();
  if (groupUrl) {
    const label = input.groupLabel?.trim();
    lines.push("");
    lines.push(
      label
        ? `Join group class (${label}): ${groupUrl}`
        : `Join group class: ${groupUrl}`,
    );
  }
  return lines.join("\n");
}

export function buildGroupLoginShareText(students: StudentLoginShareInput[]): string {
  if (students.length === 0) return "";
  if (students.length === 1) {
    return buildStudentLoginShareText(students[0]!);
  }

  const first = students[0]!;
  const header: string[] = ["Sheetomatic Learn — group class logins"];
  const label = students.map((row) => row.groupLabel?.trim()).find(Boolean);
  const groupUrl = students.map((row) => row.groupMeetUrl?.trim()).find(Boolean);
  if (label) header.push(`Group: ${label}`);
  if (groupUrl) header.push(`Join group class: ${groupUrl}`);
  header.push("");

  const blocks = students.map((student) =>
    buildStudentLoginShareText({
      ...student,
      groupMeetUrl: null,
      groupLabel: null,
    }),
  );
  return `${header.join("\n")}\n${blocks.join("\n\n---\n\n")}`;
}
