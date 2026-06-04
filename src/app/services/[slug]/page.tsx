import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getServiceCategoryStaticParams,
  ServicesCategoryContent,
} from "@/components/marketing/services-category-content";
import {
  isServiceCategorySlug,
  serviceCategoryBySlug,
  type ServiceCategorySlug,
} from "@/app/services-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getServiceCategoryStaticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isServiceCategorySlug(slug)) {
    return marketingMetadata({
      title: "Services",
      description: "Sheetomatic services for Indian MSMEs.",
      path: "/services",
    });
  }

  const category = serviceCategoryBySlug[slug as ServiceCategorySlug];
  return marketingMetadata({
    title: category.name,
    description: category.lead,
    path: `/services/${slug}`,
  });
}

export default async function ServiceCategoryPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isServiceCategorySlug(slug)) {
    notFound();
  }

  return <ServicesCategoryContent slug={slug} />;
}
