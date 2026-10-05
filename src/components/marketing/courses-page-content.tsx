import { Play } from "lucide-react";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import { coursesPage } from "@/app/courses-content";
import { coursePrograms } from "@/lib/content/course-programs";
import {
  COURSE_GOOGLE_CALENDAR_BOOKING_URL,
  courseEnrollmentPriceLabel,
} from "@/lib/content/courses-enrollment";
import {
  coursesFeaturedVideos,
  coursesLibraryVideos,
  youtubeThumbUrl,
  youtubeWatchUrl,
} from "@/app/video-content";
import { youtubeChannelName, youtubeChannelUrl } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { CoursesEnrollPay } from "@/components/marketing/courses-enroll-pay";
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
              <a className="btn-cta btn-primary" href="#programs">
                See the two programs
              </a>
              <a
                className="btn-cta btn-secondary"
                href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book slots
              </a>
              <Link className="btn-cta btn-secondary" href="/courses/book-slots">
                Booking page
              </Link>
              <Link className="btn-cta btn-secondary" href="/learn/login">
                Student login
              </Link>
              <Link className="btn-cta btn-secondary" href={WORKSPACE_LOGIN_HREF}>
                {coursesPage.ctaSecondaryLabel}
              </Link>
            </div>
            <p className="courses-instructor">{coursesPage.instructorNote}</p>
          </div>

          <aside className="courses-offer-grid" id="programs" aria-label="Programs">
            {coursePrograms.map((program) => (
              <article className="courses-offer" key={program.id} id={program.id === "BUSINESS_OWNER" ? "business-owners" : "working-professionals"}>
                <p className="courses-phase-range">{program.eyebrow}</p>
                <h2>{program.name}</h2>
                <p className="courses-offer-price">
                  {courseEnrollmentPriceLabel(program.priceInr)}
                  <span> GST extra</span>
                </p>
                <p>
                  {program.totalClasses} classes × {program.sessionDurationLabel} ·{" "}
                  {program.totalHours} hours · {program.weeksLabel}
                </p>
                <p>
                  Mon + Fri or Tue + Sat · {program.sessionTimeLabel}
                </p>
                <p>{program.promise}</p>
                <p className="courses-offer-pay">
                  Pay {courseEnrollmentPriceLabel(program.advanceInr)} now. Balance
                  before class 1.
                </p>
                <CoursesEnrollPay
                  programId={program.id}
                  triggerLabel={coursesPage.ctaLabel}
                  triggerClassName="btn-cta btn-primary btn-block"
                />
              </article>
            ))}
          </aside>
        </div>
      </section>

      {coursePrograms.map((program) => (
        <section
          className="minimal-strip soft-section pb-16"
          id={program.id === "BUSINESS_OWNER" ? "curriculum-owners" : "curriculum-professionals"}
          key={program.id}
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="courses-section-head">
              <p className="type-kicker text-sky-700">{program.name}</p>
              <h2 className="minimal-section-title mt-2">
                {program.totalClasses} classes · {program.totalHours} hours
              </h2>
              <p className="minimal-section-lead">{program.classRhythm}</p>
              <p className="minimal-section-lead">{program.tools}</p>
            </div>
            <ul className="courses-format-list">
              {program.terms.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="courses-phase-stack">
              {program.phases.map((phase) => (
                <section className="courses-phase" key={phase.id}>
                  <header className="courses-phase-head">
                    <p className="courses-phase-range">{phase.range}</p>
                    <h3>{phase.label}</h3>
                    <p>{phase.summary}</p>
                  </header>
                  <div className="courses-class-grid">
                    {phase.classes.map((item) => (
                      <article className="courses-class-card" key={item.number}>
                        <p className="courses-class-num">
                          Class {String(item.number).padStart(2, "0")}
                        </p>
                        <h4>{item.title}</h4>
                        <ul>
                          <li>{item.outcome}</li>
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
                <h3>
                  {courseEnrollmentPriceLabel(program.priceInr)} · {program.totalHours}{" "}
                  hours live 1:1
                </h3>
                <p>
                  Pay {courseEnrollmentPriceLabel(program.advanceInr)} now. GST extra.
                  Balance before class 1. {program.sessionTimeLabel}.
                </p>
              </div>
              <CoursesEnrollPay
                programId={program.id}
                triggerLabel={coursesPage.ctaLabel}
              />
            </div>
          </div>
        </section>
      ))}

      <section className="minimal-strip bg-white pb-16" id="watch">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">Free previews</p>
            <h2 className="minimal-section-title mt-2">
              Sheets, AppSheet, and Looker Studio
            </h2>
            <p className="minimal-section-lead">{coursesPage.videosLead}</p>
          </div>
          <div className="courses-featured-videos">
            {coursesFeaturedVideos.map((video) => (
              <div
                id={
                  video.id === "courses-sheets"
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
              <a className="btn-cta btn-primary" href="#programs">
                See the two programs
              </a>
              <a
                className="btn-cta btn-secondary"
                href={COURSE_GOOGLE_CALENDAR_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Book slots
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
