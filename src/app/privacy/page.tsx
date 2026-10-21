import type { Metadata } from "next";
import Link from "next/link";
import {
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";

export const metadata: Metadata = marketingMetadata({
  title: "Privacy Policy",
  description:
    "How Sheetomatic collects, uses, shares, and protects personal information.",
  path: "/privacy",
});

const sections = [
  {
    title: "Who we are",
    paragraphs: [
      "This Privacy Policy applies to Sheetomatic Technologies, operated by Shyam Kumar Banjare, and to sheetomatic.com, Sheetomatic products, demonstrations, lead forms, and related support services.",
      "Our registered business address is Shop No. 2 & 3, SH 16, Near Dinesh Cycle Store, Kalmi, Sakti, Chhattisgarh 495691, India. GSTIN: 22BPFPK7002F1ZG.",
    ],
  },
  {
    title: "Information we collect",
    paragraphs: [
      "When you contact us, request a demonstration, submit a Meta lead form, book a meeting, purchase a product, or use our services, we may collect your name, phone number, email address, company or business type, city or address, number of employees, requirements, preferred appointment time, correspondence, and information you choose to provide.",
      "For billing, we may collect billing name, address, GSTIN, order details, and payment status. Payment credentials such as full card numbers are handled by the payment provider and are not stored by Sheetomatic.",
      "When you use Ask Pulse, we process the questions and conversation context you submit. If you use its voice feature, your browser requests microphone permission and the recorded audio is sent for transcription. Please do not submit sensitive personal information unless it is necessary for your request.",
      "Our services may also receive technical information such as IP address, browser or device information, page and referral details, and security or diagnostic logs. Signed-in services use essential authentication and security cookies. Optional analytics or advertising technologies, if introduced, will be described or presented with appropriate controls where required.",
    ],
  },
  {
    title: "How we use information",
    paragraphs: [
      "We use information to respond to enquiries, qualify and assign leads, arrange demonstrations and meetings, provide quotations and services, operate the CRM and business systems you request, deliver purchases, send transactional communications, provide support, prevent abuse, secure our services, comply with law, and improve our products.",
      "Where permitted, we may follow up about the Sheetomatic product or service you requested. You may ask us to stop promotional follow-ups at any time. We do not sell personal information.",
    ],
  },
  {
    title: "Meta lead ads and customer relationship management",
    paragraphs: [
      "If you submit a lead form on Facebook or Instagram, Meta provides the submitted fields and campaign details to us. We may store that information in Sheetomatic CRM, check for duplicate enquiries, assign it to a team member, and contact you by phone, email, or WhatsApp about your request.",
      "Submitting a form does not guarantee eligibility, availability, pricing, or a particular response time. Any consent wording displayed on the Meta form also applies to that submission.",
    ],
  },
  {
    title: "Service providers and data sharing",
    paragraphs: [
      "We share information only as needed to operate the service, complete your request, meet legal obligations, or protect legitimate rights. Providers may include Meta for lead advertising, Google for forms, calendar bookings, sign-in and connected Workspace services, WhatsApp for messaging, Vercel for website hosting, Neon or other PostgreSQL infrastructure for application data, OpenAI for AI assistance and transcription, Resend for transactional email, and payment providers such as Razorpay for payment processing.",
      "These providers process information under their own terms and privacy policies. Some processing may occur outside India. We may also disclose information to professional advisers, authorities, or a successor organisation where required by law or a legitimate business transaction.",
    ],
  },
  {
    title: "Retention and security",
    paragraphs: [
      "We keep personal information only for as long as reasonably necessary for the purpose collected, to maintain business and tax records, resolve disputes, enforce agreements, or meet legal requirements. Retention varies by record type and service. You may contact us to request deletion, subject to records we must retain.",
      "We use reasonable technical and organisational safeguards, including access controls and authenticated systems. No internet transmission or storage system can be guaranteed completely secure.",
    ],
  },
  {
    title: "Your choices and rights",
    paragraphs: [
      "You may request access to or correction of your personal information, ask us to delete or restrict it where applicable, withdraw consent, or opt out of promotional communications. We may need to verify your identity before fulfilling a request.",
      "You can manage browser cookies through your browser settings and can avoid using optional third-party booking, messaging, or AI features. Disabling essential cookies may prevent signed-in features from working.",
    ],
  },
  {
    title: "Children and external services",
    paragraphs: [
      "Sheetomatic business services are not directed to children under 18, and we do not knowingly collect their personal information through lead-generation campaigns.",
      "Our website links to third-party services such as Meta, Google Calendar, WhatsApp, and payment providers. Their privacy practices are governed by their own policies.",
    ],
  },
  {
    title: "Updates and contact",
    paragraphs: [
      "We may update this policy when our services or legal requirements change. The current version and effective date will remain available on this page.",
      "For privacy questions or requests, email sheetomatic@gmail.com or call +91 97557 33107. You may also write to the business address listed above.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero
        eyebrow="Legal"
        title="Privacy policy"
        text="Effective 21 October 2026"
      />
      <section className="section bg-white pb-20">
        <div className="mx-auto max-w-3xl space-y-8 px-5 sm:px-8">
          <p className="type-body text-slate-700">
            This policy explains what information Sheetomatic collects, why we use it,
            and the choices available to you.
          </p>
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="type-h3">{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="type-body mt-3 text-slate-700">
                  {paragraph}
                </p>
              ))}
            </article>
          ))}
          <p>
            <Link className="text-sky-700 underline" href="/terms">
              Read our terms and conditions
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </MarketingPage>
  );
}
