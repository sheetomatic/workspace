import { Suspense } from "react";
import "@/components/saas/workspace-theme.css";
import { ResetPasswordForm } from "@/components/saas/reset-password-form";
import Link from "next/link";
import Image from "next/image";
import { siteBrand } from "@/app/site-content";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set new password | Sheetomatic",
  description: "Choose a new password for your Sheetomatic account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string; token?: string }>;
}) {
  const { org, token } = await searchParams;
  const orgSlug = org?.trim() ?? "";
  const resetToken = token?.trim() ?? "";

  return (
    <main className="login-page workspace-login">
      <section className="login-brand">
        <Link className="login-logo" href="/">
          <span className="logo-mark">
            <Image
              alt={siteBrand.logoAlt}
              height={40}
              priority
              src={siteBrand.logoSrc}
              width={40}
            />
          </span>
          <span>Sheetomatic</span>
        </Link>
        <div className="login-brand-copy">
          <h1>Choose a new password</h1>
          <p>Use at least 8 characters. You will sign in with this password next time.</p>
        </div>
      </section>
      <section className="login-form-panel">
        <Suspense fallback={<div className="login-card">Loading...</div>}>
          <ResetPasswordForm orgSlug={orgSlug} token={resetToken} />
        </Suspense>
      </section>
    </main>
  );
}
