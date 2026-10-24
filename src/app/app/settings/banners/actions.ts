"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBannerAdmin } from "@/lib/marketing-banner-store";
import { bannersSchema } from "@/lib/marketing-banners";

export async function saveWebsiteBanners(input: unknown, version: number) {
  const organization = await requireBannerAdmin();
  const parsed = bannersSchema.safeParse(input);
  if (!parsed.success || !Number.isSafeInteger(version) || version < 0) return {ok: false, error: "Check banner fields, link URLs and the 12-banner limit."};
  const config = JSON.stringify({version: version + 1, banners: parsed.data});
  // Atomic nested update preserves theme settings; version check rejects stale admin tabs.
  const changed = await prisma.$executeRaw`
    UPDATE "Organization"
    SET "workspaceAppearance" = jsonb_set(CASE WHEN jsonb_typeof("workspaceAppearance") = 'object' THEN "workspaceAppearance" ELSE '{}'::jsonb END, '{websiteBanners}', ${config}::jsonb), "updatedAt" = NOW()
    WHERE "id" = ${organization.id} AND "isPrimary" = true
      AND COALESCE("workspaceAppearance" #>> '{websiteBanners,version}', '0') = ${String(version)}
  `;
  if (changed !== 1) return {ok: false, error: "Another admin changed these banners. Reload before saving."};
  revalidatePath("/"); revalidatePath("/app/settings/banners");
  return {ok: true, version: version + 1};
}
