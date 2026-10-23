import type { Metadata } from "next";
import Image from "next/image";
import { ArrowDownToLine, ArrowUpRight, Mail } from "lucide-react";
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
import "@/components/marketing/contact-page.css";

export const metadata: Metadata = marketingMetadata({
  title: "Contact",
  description:
    "WhatsApp or call Sheetomatic at +91 97557 33107 for MIS, automation, and AI workflows.",
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
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="contact-connect-grid">
            <div className="contact-connect-card">
              <p className="type-kicker text-sky-700">Talk through your workflow</p>
              <h2>Start with the part that feels harder than it should.</h2>
              <p className="contact-connect-intro">
                Tell us what your team is managing manually. We can help identify
                a first system, app, or automation that fits the way you work.
              </p>
              <ContactButtons
                className="contact-actions cta-stack mt-6"
                whatsappClassName="btn-block"
                whatsappLabel={contactDetails.whatsappNumber}
                callClassName="btn-block"
                message="Hi Sheetomatic, I want to discuss automation for my business."
              />
              <div className="contact-direct-links">
                <a href={`mailto:${contactDetails.email}`}><Mail size={17} aria-hidden="true" /> {contactDetails.email}</a>
                <a href={contactDetails.websiteUrl} rel="noopener noreferrer" target="_blank">{contactDetails.website} <ArrowUpRight size={15} aria-hidden="true" /></a>
              </div>
              <ConsultTodayButton className="btn-block contact-schedule-btn" label="Schedule a meeting" />
            </div>

            <aside className="contact-qr-card" aria-labelledby="contact-qr-title">
              <div className="contact-qr-topline"><span>Keep Sheetomatic close</span><span className="contact-qr-mark">QR</span></div>
              <div className="contact-qr-image">
                <Image
                  src="/contact/sheetomatic-contact-qr.svg"
                  alt="Scan to add Sheetomatic to your contacts"
                  width={854}
                  height={854}
                  sizes="(max-width: 700px) 70vw, 280px"
                />
              </div>
              <h2 id="contact-qr-title">Scan to save our contact.</h2>
              <p>Open your camera, scan the code, then choose Add Contact. You can also save the contact card directly.</p>
              <div className="contact-qr-downloads">
                <a href="/contact/sheetomatic-contact.vcf" download>
                  <Mail size={16} aria-hidden="true" /> Add contact card
                </a>
                <a href="/contact/sheetomatic-contact-qr.svg" download>
                  <ArrowDownToLine size={16} aria-hidden="true" /> Download QR
                </a>
              </div>
            </aside>
          </div>
          <p className="type-kicker mt-14 text-center text-sky-700">Follow us</p>
          <SocialLinks className="mt-4" />
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
