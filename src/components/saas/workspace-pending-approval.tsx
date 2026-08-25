import { Clock, MessageCircle } from "lucide-react";
import { buildWhatsAppUrl, whatsappDisplayNumber } from "@/app/site-content";
import { logoutHref } from "@/lib/auth-logout";

/** Full-page hold screen shown while a workspace is pending, on hold, or inactive. */
export function WorkspacePendingApproval({
  organizationName,
  status = "ONBOARDING",
}: {
  organizationName: string;
  status?: "ONBOARDING" | "ACTIVE" | "HOLD" | "INACTIVE";
}) {
  const copy =
    status === "HOLD"
      ? {
          title: "This workspace is on hold",
          body: (
            <>
              <strong>{organizationName}</strong> is paused. Staff cannot use
              it until Sheetomatic takes it off hold.
            </>
          ),
          wa: `Hi, the workspace "${organizationName}" is on hold. Please resume it.`,
        }
      : status === "INACTIVE"
        ? {
            title: "This workspace is deactivated",
            body: (
              <>
                <strong>{organizationName}</strong> has been turned off. Ask
                Sheetomatic if you need it switched back on.
              </>
            ),
            wa: `Hi, the workspace "${organizationName}" is deactivated. Please reactivate it.`,
          }
        : {
            title: "Your workspace is being activated",
            body: (
              <>
                Thanks for creating <strong>{organizationName}</strong>. Our team
                reviews every new workspace before switching it on - usually within a
                few business hours. We will confirm on WhatsApp once you are live.
              </>
            ),
            wa: `Hi, I just created the workspace "${organizationName}" on Sheetomatic and would like to get it activated.`,
          };

  const whatsappUrl = buildWhatsAppUrl(copy.wa);

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Clock size={24} aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{copy.body}</p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <a
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle size={16} aria-hidden />
            WhatsApp us at {whatsappDisplayNumber}
          </a>
          <a
            className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline"
            href={logoutHref("/login")}
          >
            Sign out
          </a>
        </div>
      </div>
    </main>
  );
}
