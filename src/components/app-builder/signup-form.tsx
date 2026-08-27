"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  registerAppBuilderAccount,
  type AppBuilderSignupState,
  type AppBuilderSignupValues,
} from "@/app/app-builder/actions";
import { TEAM_SIZE_OPTIONS } from "@/lib/geo/constants";
import { marketingButtonClass } from "@/components/marketing/marketing-button-class";
import { APP_BUILDER_LOGIN_HREF } from "@/lib/workspace-auth-links";

type Option = { id: string; name: string };

const DRAFT_KEY = "sm-appbuilder-signup-draft";

const emptyValues: AppBuilderSignupValues = {
  name: "",
  businessName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  teamSize: "",
  industry: "",
  countryId: "",
  stateId: "",
  cityId: "",
};

const initial: AppBuilderSignupState = { ok: false, message: "" };

function readDraft(): Partial<AppBuilderSignupValues> {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<AppBuilderSignupValues>) : {};
  } catch {
    return {};
  }
}

function writeDraft(values: AppBuilderSignupValues) {
  const { password: _p, confirmPassword: _c, ...safe } = values;
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(safe));
  } catch {
    /* ignore quota */
  }
}

async function jsonGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not load list.");
  return res.json() as Promise<T>;
}

async function addPlace(body: {
  kind: "country" | "state" | "city" | "industry";
  name: string;
  countryId?: string;
  stateId?: string;
}) {
  const res = await fetch("/api/geo/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { id?: string; name?: string; error?: string };
  if (!res.ok || !data.id || !data.name) {
    throw new Error(data.error || "Could not add.");
  }
  return { id: data.id, name: data.name };
}

function AddMissing({
  label,
  onAdd,
}: {
  label: string;
  onAdd: (name: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
        onClick={() => setOpen(true)}
      >
        Not listed? Add {label}
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`Add ${label}`}
        className="min-h-10 flex-1 rounded-lg border border-zinc-200 px-3 text-sm"
      />
      <button
        type="button"
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={() => {
          setErr(null);
          setBusy(true);
          void onAdd(name)
            .then(() => {
              setName("");
              setOpen(false);
            })
            .catch((error: unknown) => {
              setErr(error instanceof Error ? error.message : "Could not add.");
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "Adding…" : "Add"}
      </button>
      {err ? <p className="w-full text-sm text-red-600">{err}</p> : null}
    </div>
  );
}

const fieldClass = "min-h-11 rounded-lg border border-zinc-200 px-3 font-normal";
const fieldErrorClass = `${fieldClass} border-red-400 ring-2 ring-red-100`;

export function AppBuilderSignupForm() {
  const [state, action, pending] = useActionState(registerAppBuilderAccount, initial);
  const [values, setValues] = useState<AppBuilderSignupValues>(emptyValues);
  const [countries, setCountries] = useState<Option[]>([]);
  const [states, setStates] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [industries, setIndustries] = useState<Option[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const lastCountry = useRef("");
  const lastState = useRef("");
  const hydrated = useRef(false);

  function patch(partial: Partial<AppBuilderSignupValues>) {
    setValues((current) => {
      const next = { ...current, ...partial };
      writeDraft(next);
      return next;
    });
  }

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const draft = { ...readDraft(), ...state.values };
    setValues((current) => ({ ...current, ...draft }));
  }, [state.values]);

  useEffect(() => {
    if (state.values) {
      setValues((current) => ({ ...current, ...state.values }));
      writeDraft({ ...emptyValues, ...state.values });
    }
    if (state.field === "email") {
      emailRef.current?.focus();
      emailRef.current?.select();
    }
  }, [state]);

  useEffect(() => {
    void Promise.all([
      jsonGet<{ countries: Option[] }>("/api/geo/countries"),
      jsonGet<{ industries: Option[] }>("/api/geo/industries"),
    ])
      .then(([geo, biz]) => {
        setCountries(geo.countries);
        setIndustries(biz.industries);
        setValues((current) => {
          if (current.countryId) return current;
          const india = geo.countries.find((c) => c.name === "India");
          return india ? { ...current, countryId: india.id } : current;
        });
      })
      .catch(() => setListErr("Could not load country list. Add yours below."));
  }, []);

  useEffect(() => {
    if (!values.countryId) return;
    if (lastCountry.current && lastCountry.current !== values.countryId) {
      setValues((current) => ({ ...current, stateId: "", cityId: "" }));
      setStates([]);
      setCities([]);
    }
    lastCountry.current = values.countryId;
    void jsonGet<{ states: Option[] }>(`/api/geo/states?countryId=${values.countryId}`)
      .then((data) => setStates(data.states))
      .catch(() => setListErr("States did not load. Add yours below."));
  }, [values.countryId]);

  useEffect(() => {
    if (!values.stateId) return;
    if (lastState.current && lastState.current !== values.stateId) {
      setValues((current) => ({ ...current, cityId: "" }));
      setCities([]);
    }
    lastState.current = values.stateId;
    void jsonGet<{ cities: Option[] }>(`/api/geo/cities?stateId=${values.stateId}`)
      .then((data) => setCities(data.cities))
      .catch(() => setListErr("Cities did not load. Add yours below."));
  }, [values.stateId]);

  const emailTaken = state.field === "email";

  return (
    <form action={action} className="mt-8 grid gap-4">
      <label className="grid gap-1 text-sm font-medium text-zinc-700">
        Your name
        <input
          name="name"
          required
          value={values.name}
          onChange={(e) => patch({ name: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-zinc-700">
        Business name
        <input
          name="businessName"
          required
          value={values.businessName}
          onChange={(e) => patch({ businessName: e.target.value })}
          className={fieldClass}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-zinc-700">
        Email
        <input
          ref={emailRef}
          name="email"
          type="email"
          required
          value={values.email}
          onChange={(e) => patch({ email: e.target.value })}
          className={emailTaken ? fieldErrorClass : fieldClass}
          aria-invalid={emailTaken}
        />
      </label>
      <label className="grid gap-1 text-sm font-medium text-zinc-700">
        Mobile (we will call)
        <input
          name="phone"
          type="tel"
          required
          value={values.phone}
          onChange={(e) => patch({ phone: e.target.value })}
          className={fieldClass}
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            value={values.password}
            onChange={(e) => patch({ password: e.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Confirm password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            value={values.confirmPassword}
            onChange={(e) => patch({ confirmPassword: e.target.value })}
            className={fieldClass}
          />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-zinc-700">
        Team size
        <select
          name="teamSize"
          required
          value={values.teamSize}
          onChange={(e) => patch({ teamSize: e.target.value })}
          className={fieldClass}
        >
          <option value="" disabled>
            Select
          </option>
          {TEAM_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} people
            </option>
          ))}
        </select>
      </label>
      <div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Business / industry
          <select
            name="industry"
            required
            value={values.industry}
            onChange={(e) => patch({ industry: e.target.value })}
            className={fieldClass}
          >
            <option value="" disabled>
              Select
            </option>
            {industries.map((row) => (
              <option key={row.id} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <AddMissing
          label="industry"
          onAdd={async (name) => {
            const row = await addPlace({ kind: "industry", name });
            setIndustries((list) =>
              list.some((item) => item.id === row.id) ? list : [...list, row],
            );
            patch({ industry: row.name });
          }}
        />
      </div>
      <div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Country
          <select
            name="countryId"
            required
            value={values.countryId}
            onChange={(e) => patch({ countryId: e.target.value })}
            className={fieldClass}
          >
            <option value="" disabled>
              Select
            </option>
            {countries.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        <AddMissing
          label="country"
          onAdd={async (name) => {
            const row = await addPlace({ kind: "country", name });
            setCountries((list) =>
              list.some((item) => item.id === row.id) ? list : [...list, row],
            );
            patch({ countryId: row.id });
          }}
        />
      </div>
      <div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          State
          <select
            name="stateId"
            required
            value={values.stateId}
            onChange={(e) => patch({ stateId: e.target.value })}
            className={fieldClass}
          >
            <option value="" disabled>
              {values.countryId ? "Select" : "Pick country first"}
            </option>
            {states.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {values.countryId ? (
          <AddMissing
            label="state"
            onAdd={async (name) => {
              const row = await addPlace({ kind: "state", name, countryId: values.countryId });
              setStates((list) =>
                list.some((item) => item.id === row.id) ? list : [...list, row],
              );
              patch({ stateId: row.id });
            }}
          />
        ) : null}
      </div>
      <div>
        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          City
          <select
            name="cityId"
            required
            value={values.cityId}
            onChange={(e) => patch({ cityId: e.target.value })}
            className={fieldClass}
          >
            <option value="" disabled>
              {values.stateId ? "Select" : "Pick state first"}
            </option>
            {cities.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </label>
        {values.stateId ? (
          <AddMissing
            label="city"
            onAdd={async (name) => {
              const row = await addPlace({ kind: "city", name, stateId: values.stateId });
              setCities((list) =>
                list.some((item) => item.id === row.id) ? list : [...list, row],
              );
              patch({ cityId: row.id });
            }}
          />
        ) : null}
      </div>

      {listErr ? <p className="text-sm text-zinc-600">{listErr}</p> : null}
      {state.message ? (
        <p className={state.ok ? "text-sm text-emerald-700" : "text-sm text-red-600"} role="alert">
          {state.message}
        </p>
      ) : null}

      <button className={marketingButtonClass("primary")} type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account & open App Builder"}
      </button>
      <p className="text-sm text-zinc-500">
        Already have an account?{" "}
        <a className="font-medium text-zinc-900 underline" href={APP_BUILDER_LOGIN_HREF}>
          Sign in
        </a>
      </p>
    </form>
  );
}
