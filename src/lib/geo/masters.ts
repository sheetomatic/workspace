import { prisma } from "@/lib/db";
import { DEFAULT_INDUSTRIES } from "@/lib/geo/constants";
import { isValidPlaceName, normalizePlaceName } from "@/lib/geo/normalize";
import {
  fetchTrustedCities,
  fetchTrustedCountries,
  fetchTrustedStates,
} from "@/lib/geo/sources";

const FALLBACK_COUNTRIES = [
  { iso2: "IN", iso3: "IND", name: "India" },
  { iso2: "AE", iso3: "ARE", name: "United Arab Emirates" },
  { iso2: "US", iso3: "USA", name: "United States" },
  { iso2: "GB", iso3: "GBR", name: "United Kingdom" },
  { iso2: "SG", iso3: "SGP", name: "Singapore" },
  { iso2: "NP", iso3: "NPL", name: "Nepal" },
  { iso2: "BD", iso3: "BGD", name: "Bangladesh" },
  { iso2: "LK", iso3: "LKA", name: "Sri Lanka" },
];

export async function ensureCountries() {
  const count = await prisma.geoCountry.count();
  if (count > 0) return;

  const remote = await fetchTrustedCountries();
  const rows = remote.length ? remote : FALLBACK_COUNTRIES;
  await prisma.geoCountry.createMany({
    data: rows.map((row) => ({
      iso2: row.iso2,
      iso3: row.iso3,
      name: row.name,
      source: remote.length ? "restcountries" : "fallback",
    })),
    skipDuplicates: true,
  });
}

export async function ensureIndustries() {
  const count = await prisma.businessIndustry.count();
  if (count > 0) return;
  await prisma.businessIndustry.createMany({
    data: DEFAULT_INDUSTRIES.map((name, sortOrder) => ({
      name,
      sortOrder,
      source: "sheetomatic",
    })),
    skipDuplicates: true,
  });
}

export async function listCountries() {
  await ensureCountries();
  return prisma.geoCountry.findMany({
    orderBy: { name: "asc" },
    select: { id: true, iso2: true, name: true },
  });
}

export async function listIndustries() {
  await ensureIndustries();
  return prisma.businessIndustry.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

export async function listStates(countryId: string) {
  const country = await prisma.geoCountry.findUnique({
    where: { id: countryId },
    select: { id: true, name: true },
  });
  if (!country) return [];

  const existing = await prisma.geoState.count({ where: { countryId } });
  if (existing === 0) {
    const remote = await fetchTrustedStates(country.name);
    if (remote.length) {
      await prisma.geoState.createMany({
        data: remote.map((row) => ({
          countryId,
          name: row.name,
          isoCode: row.isoCode,
          source: "countriesnow",
        })),
        skipDuplicates: true,
      });
    }
  }

  return prisma.geoState.findMany({
    where: { countryId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function listCities(stateId: string) {
  const state = await prisma.geoState.findUnique({
    where: { id: stateId },
    select: { id: true, name: true, country: { select: { name: true } } },
  });
  if (!state) return [];

  const existing = await prisma.geoCity.count({ where: { stateId } });
  if (existing === 0) {
    const remote = await fetchTrustedCities(state.country.name, state.name);
    if (remote.length) {
      await prisma.geoCity.createMany({
        data: remote.map((name) => ({
          stateId,
          name,
          source: "countriesnow",
        })),
        skipDuplicates: true,
      });
    }
  }

  return prisma.geoCity.findMany({
    where: { stateId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

function uniqueUserIso2() {
  return `U-${Date.now().toString(36)}`;
}

export async function addUserCountry(rawName: string) {
  const name = normalizePlaceName(rawName);
  if (!isValidPlaceName(name)) {
    return { ok: false as const, message: "Enter a country name (2–80 characters)." };
  }
  const existing = await prisma.geoCountry.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return { ok: true as const, id: existing.id, name: existing.name };
  }
  const created = await prisma.geoCountry.create({
    data: {
      name,
      iso2: uniqueUserIso2(),
      source: "user",
      userAdded: true,
    },
  });
  return { ok: true as const, id: created.id, name: created.name };
}

export async function addUserState(countryId: string, rawName: string) {
  const name = normalizePlaceName(rawName);
  if (!isValidPlaceName(name)) {
    return { ok: false as const, message: "Enter a state name (2–80 characters)." };
  }
  const country = await prisma.geoCountry.findUnique({
    where: { id: countryId },
    select: { id: true },
  });
  if (!country) {
    return { ok: false as const, message: "Pick a country first." };
  }
  const existing = await prisma.geoState.findFirst({
    where: { countryId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return { ok: true as const, id: existing.id, name: existing.name };
  }
  const created = await prisma.geoState.create({
    data: { countryId, name, source: "user", userAdded: true },
  });
  return { ok: true as const, id: created.id, name: created.name };
}

export async function addUserCity(stateId: string, rawName: string) {
  const name = normalizePlaceName(rawName);
  if (!isValidPlaceName(name)) {
    return { ok: false as const, message: "Enter a city name (2–80 characters)." };
  }
  const state = await prisma.geoState.findUnique({
    where: { id: stateId },
    select: { id: true },
  });
  if (!state) {
    return { ok: false as const, message: "Pick a state first." };
  }
  const existing = await prisma.geoCity.findFirst({
    where: { stateId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return { ok: true as const, id: existing.id, name: existing.name };
  }
  const created = await prisma.geoCity.create({
    data: { stateId, name, source: "user", userAdded: true },
  });
  return { ok: true as const, id: created.id, name: created.name };
}

export async function addUserIndustry(rawName: string) {
  const name = normalizePlaceName(rawName);
  if (!isValidPlaceName(name)) {
    return { ok: false as const, message: "Enter a business / industry (2–80 characters)." };
  }
  const existing = await prisma.businessIndustry.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
  });
  if (existing) {
    return { ok: true as const, id: existing.id, name: existing.name };
  }
  const created = await prisma.businessIndustry.create({
    data: { name, source: "user", userAdded: true, sortOrder: 900 },
  });
  return { ok: true as const, id: created.id, name: created.name };
}

export async function resolvePlaceNames(input: {
  countryId?: string;
  stateId?: string;
  cityId?: string;
}) {
  const [country, state, city] = await Promise.all([
    input.countryId
      ? prisma.geoCountry.findUnique({
          where: { id: input.countryId },
          select: { id: true, name: true },
        })
      : null,
    input.stateId
      ? prisma.geoState.findUnique({
          where: { id: input.stateId },
          select: { id: true, name: true, countryId: true },
        })
      : null,
    input.cityId
      ? prisma.geoCity.findUnique({
          where: { id: input.cityId },
          select: { id: true, name: true, stateId: true },
        })
      : null,
  ]);
  return { country, state, city };
}
