import { notFound } from "next/navigation";
import { getOfferLetterByToken } from "@/lib/hr/offer-letter";
import { offerStatusLabel } from "@/lib/hr/offer-letter-labels";
import { OfferLetterRespondForm } from "@/components/hr/offer-letter-respond-form";
import "@/components/hr/offer-letter.css";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function PublicOfferLetterPage({ params }: PageProps) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken);
  const offer = await getOfferLetterByToken(token);
  if (!offer) {
    notFound();
  }

  const canRespond = offer.status === "SENT";
  const logoUrl = offer.organization.logoUrl?.trim() || null;

  return (
    <main className="hr-offer-public">
      <article className="hr-offer-sheet">
        <header className="hr-offer-header">
          <div>
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={offer.organization.name}
                className="hr-offer-logo"
              />
            ) : null}
            <p className="hr-offer-kicker">Offer of employment</p>
            <h1>{offer.organization.name}</h1>
          </div>
          <div className="hr-offer-meta">
            <p>
              <strong>Status:</strong> {offerStatusLabel(offer.status)}
            </p>
            <p>
              <strong>Role:</strong> {offer.roleTitle}
            </p>
            {offer.joiningDate ? (
              <p>
                <strong>Joining:</strong>{" "}
                {offer.joiningDate.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                })}
              </p>
            ) : null}
          </div>
        </header>

        <div
          className="hr-offer-body"
          dangerouslySetInnerHTML={{ __html: offer.bodyHtml }}
        />

        <footer className="hr-offer-footer">
          <OfferLetterRespondForm token={token} canRespond={canRespond} />
          {!canRespond ? (
            <p className="hr-offer-msg">
              This offer is {offerStatusLabel(offer.status).toLowerCase()}.
              Contact HR if you need help.
            </p>
          ) : null}
        </footer>
      </article>
    </main>
  );
}
