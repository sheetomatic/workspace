import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { studentLearnLoginAction } from "@/app/learn/actions";
import { redirect } from "next/navigation";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/learn/learn-panel.css";

export const metadata: Metadata = marketingMetadata({
  title: "Student login | Sheetomatic Training",
  description: "Sign in to your Sheets, AppSheet, and Looker Studio learning panel.",
  path: "/learn/login",
});

export default async function LearnLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  if (token) {
    redirect(`/learn/go?token=${encodeURIComponent(token)}`);
  }

  return (
    <MarketingPage>
      <SiteHeader />
      <main className="learn-shell">
        <div className="learn-narrow">
          <p className="learn-kicker">Student panel</p>
          <h1>Sign in to training</h1>
          <p className="learn-lead">
            Use the email and WhatsApp number from your enrollment. After login
            you will see your schedule and the learning library (Sheets,
            AppSheet, Looker Studio).
          </p>

          {params.error === "token" ? (
            <p className="learn-banner is-error">
              That booking link was not found. Sign in with email and phone
              instead.
            </p>
          ) : null}

          <form action={studentLearnLoginAction} className="learn-login-form">
            {token ? <input type="hidden" name="token" value={token} /> : null}
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@email.com"
              />
            </label>
            <label>
              WhatsApp / phone
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="9198XXXXXXXX"
              />
            </label>
            <button type="submit" className="learn-btn-primary">
              Open my panel
            </button>
          </form>

          <p className="learn-help">
            Need a booking link? Check your confirmation WhatsApp / email, or{" "}
            <Link href="/contact">contact us</Link>.
          </p>
        </div>
      </main>
      <SiteFooter />
    </MarketingPage>
  );
}
