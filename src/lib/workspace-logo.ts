import { prisma } from "@/lib/db";
import { parseLogoDataUrl } from "@/lib/logo-data";
import { siteBrand } from "@/app/site-content";
import fs from "fs/promises";
import path from "path";

export async function getWorkspaceLogoForOrganization(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { logoUrl: true },
  });

  if (org?.logoUrl) {
    const parsed = parseLogoDataUrl(org.logoUrl);
    if (parsed) {
      return parsed;
    }
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    siteBrand.iconLightSrc.replace(/^\//, ""),
  );
  const buffer = await fs.readFile(filePath);
  return { mime: "image/svg+xml", buffer };
}
