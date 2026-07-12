import "./focus-offers.css";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { focusOffers } from "@/app/marketing-content";
import { offerVideos } from "@/app/video-content";
import { ContactButtons } from "@/components/marketing/marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";
import { VideoEmbed } from "./video-embed";

export function FocusOffersSection() {
  const offerMessage = (offerId: string) =>
    offerId === "ai-workspace"
      ? "Hi Sheetomatic, I want to know more about your workspace systems like FMS, IMS, Checklist, and Tasks for my business."
      : "Hi Sheetomatic, I want to know more about your official WhatsApp AI, CRM, and team inbox setup for my business.";

  return (
    <section className="section bg-white" id="offers">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>Core offers</p>
          <h2>Watch FMS and WhatsApp → Tasks</h2>
          <div className="section-subcopy">
            Two latest demos — AI-enabled Flow Monitoring, then tasks assigned
            and updated from WhatsApp. Same operating system: Monday clarity
            without owner firefighting.
          </div>
        </div>

        <div className="focus-offers-grid mt-10">
          {focusOffers.map((offer) => (
            <article
              className={`focus-offer-card ${offer.featured ? "featured" : ""}`}
              id={offer.id}
              key={offer.id}
            >
              <span className="focus-offer-tag">{offer.tag}</span>
              <h3>{offer.title}</h3>

              {offerVideos[offer.id] ? (
                <div className="offer-video-slot">
                  <VideoEmbed video={offerVideos[offer.id]} variant="compact" />
                </div>
              ) : null}

              <div className="focus-offer-block focus-offer-why">
                <p className="focus-offer-label">
                  <AlertCircle size={16} />
                  {offer.whyTitle}
                </p>
                <p>{offer.whyText}</p>
              </div>

              <div className="focus-offer-block focus-offer-solution">
                <p className="focus-offer-label">
                  <Sparkles size={16} />
                  {offer.solutionTitle}
                </p>
                <p>{offer.solutionText}</p>
              </div>

              <ul className="focus-offer-savings">
                {offer.savings.map((item) => (
                  <li key={item}>
                    <CheckCircle2 size={16} />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="focus-offer-note">{offer.ctaNote}</p>
              <ContactButtons
                whatsappClassName={offer.featured ? "btn-primary" : "btn-secondary"}
                whatsappLabel={whatsappDisplayNumber}
                callClassName="btn-secondary"
                callLabel="Call now"
                message={offerMessage(offer.id)}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
