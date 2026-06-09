import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { tenantPortalOrigin } from "@/lib/workspace-auth-links";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";

const TOKEN_PREFIX = "password-reset:";
const TOKEN_TTL_MS = 60 * 60 * 1000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function tokenIdentifier(email: string) {
  return `${TOKEN_PREFIX}${normalizeEmail(email)}`;
}

export function buildPasswordResetUrl(token: string, orgSlug?: string | null) {
  const base = orgSlug
    ? tenantPortalOrigin(orgSlug)
    : getLoginBaseUrl();
  const url = new URL("/login/reset-password", base);
  url.searchParams.set("token", token);
  if (orgSlug) {
    url.searchParams.set("org", orgSlug);
  }
  return url.toString();
}

export async function createPasswordResetToken(email: string) {
  const normalized = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const identifier = tokenIdentifier(normalized);

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });

  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  return { token, email: user.email };
}

export async function consumePasswordResetToken(token: string) {
  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || !record.identifier.startsWith(TOKEN_PREFIX)) {
    return null;
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  const email = record.identifier.slice(TOKEN_PREFIX.length);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    await prisma.verificationToken.delete({ where: { token } });
    return null;
  }

  await prisma.verificationToken.delete({ where: { token } });
  return user;
}

export async function updateUserPassword(userId: string, newPassword: string) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}
