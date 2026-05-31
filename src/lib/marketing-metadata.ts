import type { Metadata } from "next";

type MarketingPageMeta = {
  title: string;
  description: string;
  path: string;
};

export function marketingMetadata({
  title,
  description,
  path,
}: MarketingPageMeta): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
    },
  };
}
