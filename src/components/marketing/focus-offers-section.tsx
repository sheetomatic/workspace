import "./focus-offers.css";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { focusOffers } from "@/app/marketing-content";
import { offerVideos } from "@/app/video-content";
import { WhatsAppButton } from "@/components/marketing/marketing-buttons";
import { whatsappDisplayNumber } from "@/app/site-content";
import { VideoEmbed } from "./video-embed";

export function FocusOffersSection() {
  return (
    <section className="section bg-white" id="offers">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>Why Sheetomatic</p>
          <h2>Three problems we solve for growing MSMEs.</h2>
          <div className="section-subcopy">
            Off-site MIS on our payroll, custom apps instead of scattered ERPs,
            and professional websites at practical cost - all start with one
            consultation.
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
              <WhatsAppButton
                className={offer.featured ? "btn-primary" : "btn-secondary"}
                label={whatsappDisplayNumber}
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
