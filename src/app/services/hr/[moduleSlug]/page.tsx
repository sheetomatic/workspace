import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  getHrModuleStaticParams,
  HrServiceDetailContent,
} from "@/components/marketing/hr-service-detail-content";
import {
  hrModuleById,
  isHrModuleSlug,
  type HrModuleSlug,
} from "@/app/hr-module-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

type PageProps = {
  params: Promise<{ moduleSlug: string }>;
};

export async function generateStaticParams() {
  // Field is peer-only at /services/field-tracking — never regenerate under HR.
  return getHrModuleStaticParams().filter(
    (entry) => entry.moduleSlug !== "field-tracking",
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { moduleSlug } = await params;
  if (moduleSlug === "field-tracking") {
    return marketingMetadata({
      title: "Field Executive Management Systems",
      description:
        "Client geo check-ins, visit notes, and manager visibility for field teams.",
      path: "/services/field-tracking",
    });
  }
  if (!isHrModuleSlug(moduleSlug)) {
    return marketingMetadata({
      title: "HR Services",
      description: "HR modules for Indian MSME teams.",
      path: "/services/hr",
    });
  }

  const mod = hrModuleById[moduleSlug as HrModuleSlug];
  return marketingMetadata({
    title: `${mod.name} | HR Services`,
    description: mod.heroLead,
    path: mod.marketingHref,
  });
}

export default async function HrServiceDetailPage({ params }: PageProps) {
  const { moduleSlug } = await params;
  if (moduleSlug === "field-tracking") {
    redirect("/services/field-tracking");
  }
  if (!isHrModuleSlug(moduleSlug)) {
    notFound();
  }

  return <HrServiceDetailContent moduleSlug={moduleSlug} />;
}
