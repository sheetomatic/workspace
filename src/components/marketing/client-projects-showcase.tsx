import {
  clientProjects,
  clientProjectsShowcase,
  featuredClientProjects,
} from "@/app/projects-showcase";
import { workShowcaseStats } from "@/app/sales-framework-content";
import "./work-showcase.css";

export function WorkShowcaseSection() {
  const marqueeProjects = clientProjects.filter(
    (project) =>
      !featuredClientProjects.some(
        (featured) =>
          featured.client === project.client &&
          featured.location === project.location,
      ),
  );

  return (
    <section className="work-showcase" id="our-work">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="work-showcase-head">
          <p className="work-showcase-eyebrow">{clientProjectsShowcase.eyebrow}</p>
          <h2 className="work-showcase-title">{clientProjectsShowcase.title}</h2>
          <p className="work-showcase-lead">{clientProjectsShowcase.lead}</p>
        </div>

        <div className="work-showcase-stats">
          {workShowcaseStats.map((stat) => (
            <div className="work-showcase-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="work-showcase-featured">
          {featuredClientProjects.map((project) => (
            <article
              className="work-showcase-card"
              key={`${project.client}-${project.location}`}
            >
              <p className="work-showcase-card-meta">
                <span>{project.client}</span>
                <em>{project.location}</em>
              </p>
              <h3>{project.useCase}</h3>
              <p>{project.description}</p>
            </article>
          ))}
        </div>
      </div>

      {marqueeProjects.length > 0 ? (
        <div className="work-showcase-marquee">
          <p className="work-showcase-marquee-label">More industries we serve</p>
          <div className="home-projects-marquee">
            <div className="home-projects-track">
              {[0, 1].map((copy) => (
                <div
                  className="home-projects-group"
                  key={copy}
                  aria-hidden={copy === 1 ? true : undefined}
                >
                  {marqueeProjects.map((project) => (
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
      ) : null}
    </section>
  );
}

/** @deprecated Use WorkShowcaseSection */
export const ClientProjectsShowcase = WorkShowcaseSection;
