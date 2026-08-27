"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { AuthError } from "next-auth";
import { validateAppBuilderSignup } from "@/lib/app-builder/signup";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolvePlaceNames } from "@/lib/geo/masters";
import { ingestInboundLead } from "@/lib/leads/ingest";
import { leadPhoneDigits } from "@/lib/leads/contact-validation";
import { createUniqueOrganizationSlug } from "@/lib/org-slug";
import { getPrimaryOrganization } from "@/lib/platform";
import { checkRateLimit } from "@/lib/rate-limit";
import { APP_BUILDER_STUDIO_HREF } from "@/lib/workspace-auth-links";

export type AppBuilderSignupValues = {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  teamSize: string;
  industry: string;
  countryId: string;
  stateId: string;
  cityId: string;
};

export type AppBuilderSignupState = {
  ok: boolean;
  message: string;
  field?: string;
  values?: AppBuilderSignupValues;
};

function formValue(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

export async function registerAppBuilderAccount(
  _prev: AppBuilderSignupState,
  formData: FormData,
): Promise<AppBuilderSignupState> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    hdrs.get("x-real-ip")?.trim() ||
    "unknown";
  const rate = await checkRateLimit(`app-builder-signup:${ip}`, 8, 60_000);
  if (!rate.allowed) {
    return {
      ok: false,
      message: `Too many signups. Try again in ${rate.retryAfterSec}s.`,
    };
  }

  const input = {
    name: formValue(formData, "name"),
    businessName: formValue(formData, "businessName"),
    email: formValue(formData, "email").trim().toLowerCase(),
    phone: formValue(formData, "phone"),
    password: formValue(formData, "password"),
    confirmPassword: formValue(formData, "confirmPassword"),
    teamSize: formValue(formData, "teamSize"),
    industry: formValue(formData, "industry"),
    countryId: formValue(formData, "countryId"),
    stateId: formValue(formData, "stateId"),
    cityId: formValue(formData, "cityId"),
  };

  const fail = (message: string, field?: string): AppBuilderSignupState => ({
    ok: false,
    message,
    field,
    values: input,
  });

  const invalid = validateAppBuilderSignup(input);
  if (invalid) {
    return fail(invalid.message, invalid.field);
  }

  const places = await resolvePlaceNames({
    countryId: input.countryId,
    stateId: input.stateId,
    cityId: input.cityId,
  });
  if (!places.country || !places.state || !places.city) {
    return fail("Country, state, and city must be chosen from the list (or added).");
  }
  if (places.state.countryId !== places.country.id || places.city.stateId !== places.state.id) {
    return fail("City must belong to the selected state and country.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) {
    return fail(
      "This email is already registered. Change only the email, or sign in.",
      "email",
    );
  }

  const phone = leadPhoneDigits(input.phone) ?? input.phone.trim();
  const slug = await createUniqueOrganizationSlug(input.businessName);
  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.businessName.trim(),
          slug,
          status: "ACTIVE",
          product: "APP_BUILDER",
          industry: input.industry.trim(),
        },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name.trim(),
          passwordHash,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
          modules: [],
        },
      });
    });
  } catch (error) {
    console.error("[registerAppBuilderAccount]", error);
    return fail("Could not create your account. Please try again.");
  }

  const primary = await getPrimaryOrganization();
  if (primary) {
    try {
      await ingestInboundLead({
        organizationId: primary.id,
        channel: "API",
        externalId: `app-builder-signup:${input.email}`,
        name: input.name.trim(),
        phone,
        email: input.email,
        company: input.businessName.trim(),
        city: places.city.name,
        requirement: `App Builder signup. ${input.industry.trim()}. Team ${input.teamSize}. ${places.city.name}, ${places.state.name}, ${places.country.name}.`,
        sourceDetail: "App Builder website signup",
        landingPage: "/app-builder/signup",
        campaign: "app-builder",
        status: "NEW",
        createFmsJob: false,
        rawPayload: {
          product: "app-builder",
          teamSize: input.teamSize,
          industry: input.industry.trim(),
          country: places.country.name,
          state: places.state.name,
          city: places.city.name,
        },
      });
    } catch (error) {
      console.error("[registerAppBuilderAccount] lead", error);
    }
  }

  try {
    await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo: APP_BUILDER_STUDIO_HREF,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        ok: true,
        message: "Account created. Sign in to open App Builder.",
      };
    }
    throw error;
  }

  return { ok: true, message: "" };
}
