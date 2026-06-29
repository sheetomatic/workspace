"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import {
  DEFAULT_WORKSPACE_APPEARANCE,
  THEME_PRESETS,
  listThemePresets,
  type ThemePreset,
  type WorkspaceAppearance,
} from "@/lib/workspace-appearance";

const LOGO_MAX_BYTES = 500_000;
const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function revalidateAppearance() {
  ["/app", "/app/settings", "/login", "/api/workspace/logo"].forEach((path) =>
    revalidatePath(path),
  );
}

function parsePreset(value: FormDataEntryValue | null): ThemePreset {
  const preset = String(value ?? "default");
  return listThemePresets().includes(preset as ThemePreset)
    ? (preset as ThemePreset)
    : "default";
}

function buildAppearanceFromForm(
  formData: FormData,
  organizationName: string,
): WorkspaceAppearance {
  const preset = parsePreset(formData.get("preset"));
  const presetColors =
    preset !== "custom" ? THEME_PRESETS[preset] : THEME_PRESETS.default;

  return {
    preset,
    primary: String(formData.get("primary") || presetColors.primary),
    sidebar: String(formData.get("sidebar") || presetColors.sidebar),
    sidebarHover: String(formData.get("sidebarHover") || presetColors.sidebarHover),
    background: String(formData.get("background") || presetColors.background),
    productName: String(formData.get("productName") || DEFAULT_WORKSPACE_APPEARANCE.productName),
    brandName: String(formData.get("brandName") || organizationName),
  };
}

export async function saveWorkspaceAppearance(formData: FormData) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, error: "Admin only." };
  }

  const appearance = buildAppearanceFromForm(formData, user.organizationName);

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { workspaceAppearance: appearance as Prisma.InputJsonValue },
  });

  revalidateAppearance();
  return { ok: true };
}

export async function uploadWorkspaceLogo(formData: FormData) {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, error: "Admin only." };
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a logo file." };
  }
  if (file.size > LOGO_MAX_BYTES) {
    return { ok: false, error: "Logo must be under 500 KB." };
  }
  if (!ALLOWED_LOGO_TYPES.has(file.type)) {
    return { ok: false, error: "Use PNG, JPG, WebP, GIF, or SVG." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { logoUrl: dataUrl },
  });

  revalidateAppearance();
  return { ok: true };
}

export async function removeWorkspaceLogo() {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, error: "Admin only." };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { logoUrl: null },
  });

  revalidateAppearance();
  return { ok: true };
}

export async function resetWorkspaceAppearance() {
  const user = await requireSession();
  if (!hasMinimumRole(user.role, "ADMIN")) {
    return { ok: false, error: "Admin only." };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      workspaceAppearance: DEFAULT_WORKSPACE_APPEARANCE as Prisma.InputJsonValue,
      logoUrl: null,
    },
  });

  revalidateAppearance();
  return { ok: true };
}
