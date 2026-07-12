import { Clock3, IndianRupee, Play, UserRound } from "lucide-react";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import {
  courseFormatBullets,
  coursePhases,
  coursesPage,
  coursesWhatsAppUrl,
} from "@/app/courses-content";
import {
  coursesFeaturedVideos,
  coursesLibraryVideos,
  youtubeThumbUrl,
  youtubeWatchUrl,
} from "@/app/video-content";
import { youtubeChannelName, youtubeChannelUrl } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { ContactButtons } from "@/components/marketing/marketing-buttons";
import { VideoEmbed } from "@/components/marketing/video-embed";
import Link from "next/link";
import "./minimal-premium.css";
import "./courses-page.css";
import "./videos.css";

export function CoursesPageContent() {
  return (
    <MarketingPage>
      <SiteHeader />

      <section className="courses-hero">
        <div className="courses-hero-inner mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-hero-copy">
            <p className="type-kicker text-sky-700">{coursesPage.eyebrow}</p>
            <h1 className="minimal-hero-title">{coursesPage.title}</h1>
            <p className="minimal-hero-lead">{coursesPage.lead}</p>
            <div className="courses-hero-actions">
              <a className="btn-cta btn-primary" href={coursesWhatsAppUrl}>
                {coursesPage.ctaLabel}
              </a>
              <Link className="btn-cta btn-secondary" href={WORKSPACE_LOGIN_HREF}>
                {coursesPage.ctaSecondaryLabel}
              </Link>
            </div>
            <p className="courses-instructor">{coursesPage.instructorNote}</p>
          </div>

          <aside className="courses-hero-card" aria-label="Program snapshot">
            <div className="courses-stat">
              <Clock3 size={20} aria-hidden />
              <div>
                <strong>{coursesPage.durationLabel}</strong>
                <span>{coursesPage.durationDetail}</span>
              </div>
            </div>
            <div className="courses-stat">
              <IndianRupee size={20} aria-hidden />
              <div>
                <strong>{coursesPage.priceLabel}</strong>
                <span>{coursesPage.priceNote}</span>
              </div>
            </div>
            <div className="courses-stat">
              <UserRound size={20} aria-hidden />
              <div>
                <strong>Small &amp; medium business owners</strong>
                <span>Not a jobseeker MIS career track</span>
              </div>
            </div>
            <ContactButtons
              className="courses-hero-card-cta"
              whatsappClassName="btn-block"
              whatsappLabel={coursesPage.ctaLabel}
              callClassName="btn-block"
              callLabel="Call now"
              message={coursesPage.whatsappMessage}
            />
          </aside>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">Format</p>
            <h2 className="minimal-section-title mt-2">{coursesPage.formatTitle}</h2>
            <p className="minimal-section-lead">{coursesPage.formatLead}</p>
          </div>
          <ul className="courses-format-list">
            {courseFormatBullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="minimal-strip soft-section pb-16" id="curriculum">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">Curriculum</p>
            <h2 className="minimal-section-title mt-2">
              {coursesPage.curriculumTitle}
            </h2>
            <p className="minimal-section-lead">{coursesPage.curriculumLead}</p>
          </div>

          <div className="courses-phase-stack">
            {coursePhases.map((phase) => (
              <section className="courses-phase" key={phase.id} id={phase.id}>
                <header className="courses-phase-head">
                  <p className="courses-phase-range">{phase.range}</p>
                  <h3>{phase.label}</h3>
                  <p>{phase.summary}</p>
                </header>
                <div className="courses-class-grid">
                  {phase.classes.map((cls) => (
                    <article className="courses-class-card" key={cls.number}>
                      <p className="courses-class-num">
                        Class {String(cls.number).padStart(2, "0")}
                      </p>
                      <h4>{cls.title}</h4>
                      <ul>
                        {cls.outcomes.map((outcome) => (
                          <li key={outcome}>{outcome}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="courses-enroll-band">
            <div>
              <p className="type-kicker text-sky-700">Enroll</p>
              <h3>{coursesPage.priceLabel} · 36 hours live 1:1</h3>
              <p>{coursesPage.priceNote}</p>
            </div>
            <a className="btn-cta btn-primary" href={coursesWhatsAppUrl}>
              {coursesPage.ctaLabel}
            </a>
          </div>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-16" id="watch">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">Free previews</p>
            <h2 className="minimal-section-title mt-2">{coursesPage.videosTitle}</h2>
            <p className="minimal-section-lead">{coursesPage.videosLead}</p>
          </div>
          <div className="courses-featured-videos">
            {coursesFeaturedVideos.map((video) => (
              <div
                id={
                  video.id === "courses-fms"
                    ? "topic-flow-monitoring"
                    : video.id === "courses-looker"
                      ? "topic-dashboards"
                      : undefined
                }
                key={video.id}
              >
                <VideoEmbed video={video} variant="compact" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="minimal-strip soft-section pb-16" id="library">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head" id="topic-whatsapp">
            <p className="type-kicker text-sky-700">{youtubeChannelName}</p>
            <h2 className="minimal-section-title mt-2">{coursesPage.libraryTitle}</h2>
            <p className="minimal-section-lead">{coursesPage.libraryLead}</p>
          </div>
          <div className="courses-thumb-grid">
            {coursesLibraryVideos.map((video) => (
              <a
                className="courses-thumb-card"
                href={youtubeWatchUrl(video.youtubeId)}
                key={video.youtubeId}
                rel="noopener noreferrer"
                target="_blank"
              >
                <span className="courses-thumb-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    loading="lazy"
                    src={youtubeThumbUrl(video.youtubeId)}
                  />
                  <span className="courses-thumb-play" aria-hidden>
                    <Play size={18} fill="currentColor" strokeWidth={0} />
                  </span>
                </span>
                <span className="courses-thumb-tag">{video.category}</span>
                <strong>{video.title}</strong>
              </a>
            ))}
          </div>
          <div className="courses-free-cta">
            <a
              className="btn-cta btn-youtube"
              href={youtubeChannelUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="btn-cta-icon-wrap" aria-hidden>
                <Play size={18} fill="currentColor" strokeWidth={0} />
              </span>
              <span>Open {youtubeChannelName}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="courses-funnel">
            <p className="type-kicker text-sky-700">Next step</p>
            <h2 className="minimal-section-title mt-2">{coursesPage.funnelTitle}</h2>
            <p className="minimal-section-lead">{coursesPage.funnelLead}</p>
            <div className="courses-hero-actions">
              <a className="btn-cta btn-primary" href={coursesWhatsAppUrl}>
                {coursesPage.ctaLabel}
              </a>
              <Link className="btn-cta btn-secondary" href={WORKSPACE_LOGIN_HREF}>
                {coursesPage.ctaSecondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
