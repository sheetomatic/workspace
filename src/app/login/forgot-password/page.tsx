import { Suspense } from "react";
import "@/components/saas/workspace-login.css";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import { ForgotPasswordForm } from "@/components/saas/forgot-password-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Forgot password | Sheetomatic",
  description: "Reset your Sheetomatic workspace password.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;
  const orgSlug = org?.trim() ?? "";

  return (
    <main className="login-page workspace-login">
      <section className="login-brand">
        <Link className="login-logo" href="/">
          <span className="logo-mark">
            <BrandIconMark size={26} priority theme="light" />
          </span>
          <span>Sheetomatic</span>
        </Link>
        <div className="login-brand-copy">
          <h1>Reset your password</h1>
          <p>We will email a secure link to reset your workspace password.</p>
        </div>
      </section>
      <section className="login-form-panel">
        <Suspense fallback={<div className="login-card">Loading...</div>}>
          <ForgotPasswordForm orgSlug={orgSlug} />
        </Suspense>
      </section>
    </main>
  );
}
