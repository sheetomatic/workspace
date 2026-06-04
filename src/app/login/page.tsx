import "@/components/saas/workspace-theme.css";
import { Suspense } from "react";
import { LoginForm } from "@/components/saas/login-form";
import { CheckCircle2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { siteBrand } from "@/app/site-content";

export const metadata = {
  title: "Sign in | Sheetomatic Workspace",
  description: "Secure client login for Sheetomatic business control systems.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; intent?: string }>;
}) {
  const { product, intent } = await searchParams;
  const isAiProduct = product === "ai";
  const isAiLogin = isAiProduct && intent === "login";
  const isAiSignup = isAiProduct && intent === "start";
  const isWorkspaceSignup = !isAiProduct && intent === "start";
  const isSignup = isAiSignup || isWorkspaceSignup;

  return (
    <main className="login-page workspace-login">
      <section className="login-brand">
        <Link className="login-logo" href={isAiProduct ? "/ai" : "/"}>
          <span className="logo-mark">
            <Image
              src={siteBrand.logoSrc}
              alt={isAiProduct ? "Sheetomatic AI" : siteBrand.logoAlt}
              width={40}
              height={40}
              priority
            />
          </span>
          <span>{isAiProduct ? "Sheetomatic AI" : "Sheetomatic"}</span>
        </Link>
        <div className="login-brand-copy">
          <p className="login-kicker">
            {isAiProduct ? "WhatsApp AI workspace" : "Client workspace"}
          </p>
          <h1>
            {isAiLogin
              ? "Welcome back"
              : isSignup
                ? isAiProduct
                  ? "Start free on Sheetomatic AI"
                  : "Create your company workspace"
                : isAiProduct
                  ? "Automate WhatsApp with AI"
                  : "Sign in to your workspace"}
          </h1>
          <p>
            {isAiLogin
              ? "Enter your email and password to open Chats, Campaign, and AI settings."
              : isAiSignup
                ? "Create a free workspace, connect WhatsApp, and train your AI in minutes."
                : isWorkspaceSignup
                  ? "Sign up as the owner, then add team members with login credentials from Team."
                  : isAiProduct
                    ? "Sign in with your email and password to connect WhatsApp and go live."
                    : "Owners sign in with the email they registered. Team members use credentials from their admin."}
          </p>
        </div>
        <ul className="login-trust-list">
          {isAiProduct ? (
            <>
              <li>
                <CheckCircle2 size={18} />
                AI replies, team inbox, and CRM in one place
              </li>
              <li>
                <CheckCircle2 size={18} />
                Official WhatsApp Business API via RedLava
              </li>
            </>
          ) : isWorkspaceSignup ? (
            <>
              <li>
                <CheckCircle2 size={18} />
                One owner account creates the workspace
              </li>
              <li>
                <CheckCircle2 size={18} />
                Admins add staff logins from Team settings
              </li>
            </>
          ) : (
            <>
              <li>
                <CheckCircle2 size={18} />
                One secure login per company
              </li>
              <li>
                <CheckCircle2 size={18} />
                Owners see what matters; staff see only their work
              </li>
            </>
          )}
        </ul>
      </section>

      <section className="login-form-panel">
        <Suspense fallback={<div className="login-card">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}
