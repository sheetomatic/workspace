export type FmsFromContext =
  | "lines"
  | "my-stops"
  | "ops"
  | "setup"
  | "performance";

function firstParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

export function fmsInstanceHref(
  instanceId: string,
  from: FmsFromContext,
  templateId?: string,
) {
  const params = new URLSearchParams({ from });
  if (from === "my-stops" && templateId) {
    params.set("templateId", templateId);
  }
  return `/app/fms/instances/${instanceId}?${params.toString()}`;
}

export function fmsFormHref(formId: string, from: FmsFromContext) {
  return `/app/fms/forms/${formId}?from=${from}`;
}

export function resolveFmsBackLink(options: {
  from?: string | string[];
  templateId?: string | string[];
  defaultForManager: FmsFromContext;
  defaultForMember: FmsFromContext;
  isManager: boolean;
}) {
  const from = firstParam(options.from) as FmsFromContext | undefined;
  const templateId = firstParam(options.templateId);

  if (from === "my-stops") {
    return {
      href: templateId ? `/app/fms/my-stops/${templateId}` : "/app/fms/my-stops",
      label: templateId ? "Back to workflow" : "Back to my queue",
    };
  }
  if (from === "ops") {
    return { href: "/app/fms/ops", label: "Back to ops monitor" };
  }
  if (from === "setup") {
    return { href: "/app/fms/setup", label: "Back to setup" };
  }
  if (from === "performance") {
    return { href: "/app/fms/performance", label: "Back to performance" };
  }
  if (from === "lines") {
    return { href: "/app/fms/lines", label: "Back to pipelines" };
  }

  const fallback = options.isManager
    ? options.defaultForManager
    : options.defaultForMember;
  if (fallback === "my-stops") {
    return { href: "/app/fms/my-stops", label: "Back to my queue" };
  }
  return { href: "/app/fms/lines", label: "Back to pipelines" };
}
