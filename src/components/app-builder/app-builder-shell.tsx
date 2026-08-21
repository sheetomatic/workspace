"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { BrandIconMark } from "@/components/brand/brand-icon-mark";
import "./app-builder-shell.css";

export function AppBuilderShell({
  children,
  organizationName,
  userEmail,
}: {
  children: React.ReactNode;
  organizationName: string;
  userEmail: string;
}) {
  return (
    <div className="ab-product">
      <header className="ab-product-bar">
        <Link className="ab-product-brand" href="/app/app-builder">
          <BrandIconMark size={22} theme="dark" />
          <div>
            <strong>App Builder</strong>
            <span>{organizationName}</span>
          </div>
        </Link>
        <div className="ab-product-user">
          <span>{userEmail}</span>
          <button
            type="button"
            onClick={() =>
              void signOut({ callbackUrl: "/login?product=app-builder" })
            }
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="ab-product-main">{children}</div>
    </div>
  );
}
