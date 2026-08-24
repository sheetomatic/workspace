"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

export const PETAL_BASE = "/petal";

export function petalHref(path: string) {
  if (!path || path === "/") return PETAL_BASE;
  if (path.startsWith(PETAL_BASE)) return path;
  return `${PETAL_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export function PetalLink({
  to,
  children,
  ...props
}: { to: string; children?: ReactNode } & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link href={petalHref(to)} {...props}>
      {children}
    </Link>
  );
}

export function usePetalNav() {
  const router = useRouter();
  return (path: string) => {
    router.push(petalHref(path));
  };
}
