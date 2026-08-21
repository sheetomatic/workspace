import { normalizePlaceName } from "@/lib/geo/normalize";

type RestCountry = {
  cca2?: string;
  cca3?: string;
  name?: { common?: string };
};

type CountriesNowStates = {
  error?: boolean;
  data?: { states?: Array<{ name?: string; state_code?: string }> };
};

type CountriesNowCities = {
  error?: boolean;
  data?: string[];
};

const FETCH_MS = 8000;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(FETCH_MS),
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** REST Countries — ISO 3166-1. */
export async function fetchTrustedCountries() {
  const rows = await fetchJson<RestCountry[]>(
    "https://restcountries.com/v3.1/all?fields=name,cca2,cca3",
  );
  if (!rows?.length) return [];
  return rows
    .map((row) => ({
      iso2: (row.cca2 ?? "").trim().toUpperCase(),
      iso3: (row.cca3 ?? "").trim().toUpperCase() || null,
      name: normalizePlaceName(row.name?.common ?? ""),
    }))
    .filter((row) => row.iso2.length === 2 && row.name);
}

/** CountriesNow — admin-1 names for a country. */
export async function fetchTrustedStates(countryName: string) {
  const body = await fetchJson<CountriesNowStates>(
    "https://countriesnow.space/api/v0.1/countries/states",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName }),
    },
  );
  if (body?.error || !body?.data?.states) return [];
  return body.data.states
    .map((row) => ({
      name: normalizePlaceName(row.name ?? ""),
      isoCode: row.state_code?.trim() || null,
    }))
    .filter((row) => row.name);
}

/** CountriesNow — cities in a state. */
export async function fetchTrustedCities(countryName: string, stateName: string) {
  const body = await fetchJson<CountriesNowCities>(
    "https://countriesnow.space/api/v0.1/countries/state/cities",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country: countryName, state: stateName }),
    },
  );
  if (body?.error || !body?.data) return [];
  return body.data.map((name) => normalizePlaceName(name)).filter(Boolean);
}
