import { clientProjects } from "@/app/projects-showcase";
import "./work-showcase.css";

export function WorkShowcaseSection() {
  const clients = clientProjects.filter(
    (project, index, all) =>
      all.findIndex((candidate) => candidate.client === project.client) === index,
  );

  const logoByClient: Record<string, string> = {
    "Kavlin Struc": "https://www.kavlin.in/kavlin-logo-full.png",
    Altasnim: "https://www.altasnimgroup.com/company-profile-logo.png",
  };

  const ClientLogos = ({ hidden = false }: { hidden?: boolean }) => (
    <div className="client-logo-group" aria-hidden={hidden || undefined}>
      {clients.map((project) => {
        const logo = logoByClient[project.client];
        const compactName = project.client.replace(/\s*\(.+\)/, "");

        return (
          <article className="client-logo-card" key={`${hidden ? "copy-" : ""}${project.client}`}>
            {logo ? (
              <img className="client-logo-image" src={logo} alt={hidden ? "" : `${compactName} logo`} />
            ) : (
              <strong className="client-logo-wordmark">{compactName}</strong>
            )}
            <span>{project.location}</span>
          </article>
        );
      })}
    </div>
  );

  return (
    <section className="client-logo-showcase" id="our-work" aria-labelledby="client-logo-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="client-logo-showcase-head">
          <p className="type-kicker">Built for teams doing real work</p>
          <h2 id="client-logo-title">Trusted across the workday.</h2>
          <p>From construction and manufacturing to logistics, retail, and field operations.</p>
        </div>
      </div>
      <div className="client-logo-marquee" aria-label="Sheetomatic client list">
        <div className="client-logo-track">
          <ClientLogos />
          <ClientLogos hidden />
        </div>
      </div>
      <p className="client-logo-note">Client names and marks are shown for identification only.</p>
    </section>
  );
}

/** @deprecated Use WorkShowcaseSection */
export const ClientProjectsShowcase = WorkShowcaseSection;
