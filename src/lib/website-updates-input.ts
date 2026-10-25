import { z } from "zod";
export const updatesConsentVersion = "monthly-digest-features-v1";
export const updatesSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().max(80).optional(),
  consent: z.literal(true),
  website: z.string().max(0).optional(),
});
export const updatesManageSchema = z.object({ action: z.enum(["confirm", "unsubscribe"]), token: z.string().regex(/^[a-f0-9]{64}$/) });
