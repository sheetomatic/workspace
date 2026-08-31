import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { normalizeWhatsAppPhone } from "@/lib/phone";

export const LEARN_COOKIE = "so_learn_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function sessionSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "sheetomatic-learn-dev"
  );
}

function sign(value: string) {
  return createHmac("sha256", sessionSecret()).update(value).digest("base64url");
}

export type LearnSession = {
  enrollmentId: string;
  exp: number;
};

export function encodeLearnSession(enrollmentId: string) {
  const payload: LearnSession = {
    enrollmentId,
    exp: Date.now() + MAX_AGE_SEC * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeLearnSession(raw: string | undefined | null): LearnSession | null {
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as LearnSession;
    if (!parsed.enrollmentId || !parsed.exp || parsed.exp < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setLearnSessionCookie(enrollmentId: string) {
  const store = await cookies();
  store.set(LEARN_COOKIE, encodeLearnSession(enrollmentId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearLearnSessionCookie() {
  const store = await cookies();
  store.delete(LEARN_COOKIE);
}

export async function getLearnEnrollment() {
  const store = await cookies();
  const session = decodeLearnSession(store.get(LEARN_COOKIE)?.value);
  if (!session) return null;

  return prisma.courseEnrollment.findUnique({
    where: { id: session.enrollmentId },
    include: {
      slots: {
        orderBy: { startsAt: "asc" },
        take: 80,
        include: {
          materials: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              kind: true,
              title: true,
              url: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
            },
          },
        },
      },
    },
  });
}

export async function requireLearnEnrollment() {
  const enrollment = await getLearnEnrollment();
  if (!enrollment) {
    return null;
  }
  return enrollment;
}

export function phonesMatch(left: string, right: string) {
  const a = normalizeWhatsAppPhone(left);
  const b = normalizeWhatsAppPhone(right);
  if (a && b) return a === b;
  const da = left.replace(/\D/g, "").slice(-10);
  const db = right.replace(/\D/g, "").slice(-10);
  return da.length === 10 && da === db;
}

export async function findEnrollmentForStudentLogin(params: {
  email?: string;
  phone?: string;
  token?: string;
}) {
  const token = params.token?.trim();
  if (token) {
    return prisma.courseEnrollment.findFirst({
      where: { bookingToken: token },
    });
  }

  const email = params.email?.trim().toLowerCase();
  const phone = params.phone?.trim();
  if (!email || !phone) {
    return null;
  }

  const candidates = await prisma.courseEnrollment.findMany({
    where: {
      email,
      status: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return candidates.find((row) => phonesMatch(row.phone, phone)) ?? null;
}
