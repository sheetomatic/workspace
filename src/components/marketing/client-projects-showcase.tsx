import { clientProjects, clientProjectsShowcase } from "@/app/projects-showcase";
import "./minimal-premium.css";

export function ClientProjectsShowcase() {
  return (
    <section className="home-projects-showcase" id="client-projects">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="home-projects-head">
          <p className="home-projects-eyebrow">{clientProjectsShowcase.eyebrow}</p>
          <h2 className="home-projects-title">{clientProjectsShowcase.title}</h2>
          <p className="home-projects-lead">{clientProjectsShowcase.lead}</p>
        </div>

        <div className="home-projects-marquee">
          <div className="home-projects-track">
            {[0, 1].map((copy) => (
              <div
                className="home-projects-group"
                key={copy}
                aria-hidden={copy === 1 ? true : undefined}
              >
                {clientProjects.map((project) => (
                  <article
                    className="home-project-card"
                    key={`${copy}-${project.client}-${project.location}`}
                  >
                    <p className="home-project-meta">
                      <span className="home-project-client">{project.client}</span>
                      <span className="home-project-location">{project.location}</span>
                    </p>
                    <h3 className="home-project-use-case">{project.useCase}</h3>
                    <p className="home-project-description">{project.description}</p>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
