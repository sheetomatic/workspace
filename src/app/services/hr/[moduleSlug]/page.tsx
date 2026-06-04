import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  return getHrModuleStaticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { moduleSlug } = await params;
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
  if (!isHrModuleSlug(moduleSlug)) {
    notFound();
  }

  return <HrServiceDetailContent moduleSlug={moduleSlug} />;
}
