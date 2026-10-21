import "server-only";

export const LINKEDIN_SETTINGS_PATH = "/app/leads/linkedin";
export const LINKEDIN_CALLBACK_PATH = "/api/integrations/linkedin/callback";
export const LINKEDIN_STATE_COOKIE = "sheetomatic-linkedin-state";

export function getLinkedInConfig() {
  const clientId = process.env.LINKEDIN_CLIENT_ID?.trim();
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET?.trim();
  const encryptionKey = process.env.LINKEDIN_TOKEN_ENCRYPTION_KEY?.trim();
  const invitationScopes = process.env.LINKEDIN_INVITATION_SCOPES?.trim();
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI?.trim();
  // Operator confirmation of approved Invitations API access AND CRM storage use.
  if (
    process.env.LINKEDIN_CRM_ACCESS_APPROVED !== "true" ||
    !clientId || !clientSecret || !invitationScopes || !redirectUri ||
    !encryptionKey || !/^[a-fA-F0-9]{64}$/.test(encryptionKey)
  ) return null;

  try {
    const callback = new URL(redirectUri);
    if (
      callback.protocol !== "https:" || callback.username || callback.password ||
      callback.pathname !== LINKEDIN_CALLBACK_PATH || callback.search || callback.hash
    ) return null;
    const scopes = [...new Set(["openid", "profile", ...invitationScopes.split(/\s+/)])];
    // Read permissions are supplied from the actual partner grant, never guessed.
    if (scopes.some((scope) => !/^[a-zA-Z0-9_:.-]+$/.test(scope))) return null;
    const allowedFields = ["firstName", "lastName", "headline", "vanityName"];
    const profileFields = (process.env.LINKEDIN_INVITATION_PROFILE_FIELDS ?? "")
      .split(/[,\s]+/).filter(Boolean);
    if (!profileFields.includes("firstName") || !profileFields.includes("lastName") ||
        profileFields.some((field) => !allowedFields.includes(field))) return null;
    return { clientId, clientSecret, encryptionKey, redirectUri, scopes, profileFields };
  } catch {
    return null;
  }
}

export type LinkedInConfig = NonNullable<ReturnType<typeof getLinkedInConfig>>;
