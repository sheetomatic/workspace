import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { LinkedInConfig } from "./config";

export function newOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function hashState(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function sameSecret(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function encryptLinkedInToken(token: string, context: string, config: LinkedInConfig) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(config.encryptionKey, "hex"), iv);
  cipher.setAAD(Buffer.from(context));
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptLinkedInToken(value: string, context: string, config: LinkedInConfig) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Reconnect your LinkedIn account.");
  const [iv, tag, body] = parts.map((part) => Buffer.from(part, "base64url"));
  if (iv.length !== 12 || tag.length !== 16) throw new Error("Reconnect your LinkedIn account.");
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(config.encryptionKey, "hex"), iv);
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
