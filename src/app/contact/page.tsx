import type { Metadata } from "next";
import {
  FinalCta,
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import {
  ContactButtons,
  ConsultTodayButton,
} from "@/components/marketing/marketing-buttons";
import { SocialLinks } from "@/components/marketing/social-links";
import { contactDetails, contactPage } from "../page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";

export const metadata: Metadata = marketingMetadata({
  title: "Contact",
  description:
    "WhatsApp Sheetomatic at +91 93291 03106 for MIS, automation, and AI workflows.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero
        eyebrow={contactPage.eyebrow}
        title={contactPage.title}
        text={contactPage.lead}
      />

      <section className="contact-page minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <p className="type-kicker text-center text-sky-700">WhatsApp</p>
          <ContactButtons
            className="contact-actions centered cta-stack mx-auto mt-4"
            whatsappClassName="btn-block"
            whatsappLabel={contactDetails.whatsappNumber}
            callClassName="btn-block"
            message="Hi Sheetomatic, I want to discuss automation for my business."
          />
          <div className="mx-auto mt-3 flex max-w-sm justify-center">
            <ConsultTodayButton className="btn-block" label="Schedule a meeting" />
          </div>
          <p className="contact-website-link mt-6 text-center">
            <a href={contactDetails.websiteUrl} target="_blank" rel="noopener noreferrer">
              {contactDetails.website}
            </a>
          </p>

          <p className="type-kicker mt-10 text-center text-sky-700">Follow us</p>
          <SocialLinks className="mt-4" />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
