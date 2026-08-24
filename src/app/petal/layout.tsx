import type { Metadata } from "next";
import "@/components/petal/petal.css";

export const metadata: Metadata = {
  title: "Petal — Surya Minerals",
  description: "Jar water deliveries, monthly bills, empties, cash/UPI, and expenses. One store, five users.",
  robots: { index: false, follow: false },
};

export default function PetalLayout({ children }: { children: React.ReactNode }) {
  return <div className="petal-root">{children}</div>;
}
