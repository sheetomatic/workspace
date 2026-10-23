import { ArrowDown, ArrowRight, Check, ChevronDown, Play } from "lucide-react";
import type { ReactNode } from "react";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import { coursesPage } from "@/app/courses-content";
import { coursePrograms, type CourseProgram } from "@/lib/content/course-programs";
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
import { youtubeChannelName, youtubeChannelUrl, consultationUrl } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import { CoursesEnrollPay } from "@/components/marketing/courses-enroll-pay";
import { VideoEmbed } from "@/components/marketing/video-embed";
import { ResilientImage } from "@/components/marketing/resilient-image";
import Link from "next/link";
import "./minimal-premium.css";
import "./courses-page.css";
import "./videos.css";

const recordedCourseUrl =
  "https://sheetomatic.graphy.com/courses/Google-Sheets-Essentials-to-Pro-Unlocking-Advanced-Skills-for-Productivity-65b389d8e4b0a394eb2a306c";

const upcomingRecordedCourses = [
  {
    category: "Google Sheets",
    title: "Query from Basics to Advanced",
    description: "Turn long data tables into filtered, grouped, and useful answers.",
  },
  {
    category: "Google Sheets",
    title: "IF Statements",
    description: "Make Sheets respond clearly to conditions, exceptions, and next actions.",
  },
  {
    category: "No-code apps",
    title: "AppSheet Guide",
    description: "Take the same business data onto a practical mobile workflow.",
  },
  {
    category: "Data collection",
    title: "Google Forms",
    description: "Collect clean updates from your team without chasing messages.",
  },
  {
    category: "Dashboards",
    title: "Data Studio",
    description: "Turn live operational data into clear owner and management reports.",
  },
  {
    category: "AI & productivity",
    title: "AI in Google Workspace: Smarter Everyday Workflows",
    description:
      "Use AI to draft, organize, and analyze work across Gmail, Docs, Sheets, and Drive—with your review in control.",
  },
] as const;

function CourseDisclosure({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <details className="courses-disclosure">
      <summary>
        <span className="courses-disclosure-copy">
          <span className="courses-disclosure-title">{title}</span>
          {description ? <span className="courses-disclosure-description">{description}</span> : null}
        </span>
        <span className="courses-disclosure-control" aria-hidden="true">
          <span className="courses-disclosure-show">View</span>
          <span className="courses-disclosure-hide">Hide</span>
          <ChevronDown size={18} />
        </span>
      </summary>
      <div className="courses-disclosure-body">{children}</div>
    </details>
  );
}

function CourseProgramCard({ program }: { program: CourseProgram }) {
  const isOwner = program.id === "BUSINESS_OWNER";
  return (
    <article
      className={`courses-program-card${isOwner ? " courses-program-card--owner" : ""}`}
      id={isOwner ? "business-owners" : "working-professionals"}
      aria-labelledby={`program-${program.id}`}
    >
      <div className="courses-program-intro">
        <p className="courses-program-type">{isOwner ? "For your business & team" : "For your professional growth"}</p>
        <h3 id={`program-${program.id}`}>{program.name}</h3>
        <p className="courses-program-tagline">{program.eyebrow}</p>
        <p className="courses-program-price">
          {courseEnrollmentPriceLabel(program.priceInr)} <span>+ GST</span>
        </p>
        <p className="courses-program-included">
          <Check size={16} aria-hidden="true" />
          {isOwner ? "Development cost + team training included" : "Live 1:1 training with Shyam"}
        </p>
        {isOwner ? <p className="courses-program-scope-note">Within the scope agreed at your requirement meeting.</p> : null}
        <p className="courses-program-duration">
          {program.totalClasses} classes × {program.sessionDurationLabel} · {program.totalHours} hours · {program.weeksLabel}
        </p>
        <p className="courses-program-promise">{program.promise}</p>
        <div className="courses-offer-actions">
          {program.bookFirst ? (
            <a className="btn-cta btn-primary btn-block" href={consultationUrl} target="_blank" rel="noopener noreferrer">
              Book a requirement meeting <ArrowRight size={16} aria-hidden="true" />
            </a>
          ) : null}
          <CoursesEnrollPay
            programId={program.id}
            triggerLabel={program.bookFirst ? "Enrol after your requirement meeting" : coursesPage.ctaLabel}
            triggerClassName={program.bookFirst ? "btn-cta btn-secondary btn-block" : "btn-cta btn-primary btn-block"}
          />
        </div>
        <p className="courses-program-payment">
          {program.bookFirst ? "After the meeting: " : "To confirm your seat: "}
          {courseEnrollmentPriceLabel(program.advanceInr)} advance. Balance before class 1. GST extra.
        </p>
      </div>

      <div className="courses-program-details" id={isOwner ? "curriculum-owners" : "curriculum-professionals"}>
        <CourseDisclosure
          title={isOwner ? "How we build & train" : "How you’ll learn"}
          description={isOwner ? "Your workflow. Your chosen technology." : "Practical builds, with a mentor alongside."}
        >
          <p>{program.classRhythm}</p>
          <h4>{isOwner ? "You choose the technology. We build the system." : "Tools you’ll use"}</h4>
          <p>{program.tools}</p>
          {isOwner ? (
            <ol className="courses-build-steps">
              <li><strong>Map the work</strong><span>Discuss your organization chart, processes, and agreed deliverables.</span></li>
              <li><strong>Build the system</strong><span>Turn the agreed workflows into working systems on your business data.</span></li>
              <li><strong>Train your team</strong><span>Show your team how to use the system, follow the workflow, and understand how it works.</span></li>
            </ol>
          ) : null}
        </CourseDisclosure>

        {program.areas ? (
          <CourseDisclosure title="From organization chart to exit" description="Explore the areas we can scope for your business.">
            <p>Need a customised system? We start with your organization chart and map the workflows through employee exit. The areas and deliverables for your company are agreed before enrolment.</p>
            <div className="courses-scope-list">
              {program.areas.map((area, index) => (
                <section className="courses-scope-item" key={area.id}>
                  <span className="courses-scope-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h4>{area.title}</h4>
                    <p>{area.summary}</p>
                    <ul>{area.pointers.map((pointer) => <li key={pointer}>{pointer}</li>)}</ul>
                  </div>
                </section>
              ))}
            </div>
          </CourseDisclosure>
        ) : null}

        {program.phases.length > 0 ? (
          <CourseDisclosure title={`Explore the ${program.totalClasses}-class curriculum`} description="FMS, inventory, checklists, apps & dashboards.">
            <div className="courses-curriculum-stack">
              {program.phases.map((phase) => (
                <section className="courses-curriculum-phase" key={phase.id}>
                  <p className="courses-phase-range">{phase.range}</p>
                  <h4>{phase.label}</h4>
                  <p>{phase.summary}</p>
                  <ol className="courses-lesson-list" start={phase.classes[0]?.number}>
                    {phase.classes.map((lesson) => (
                      <li key={lesson.number}>
                        <strong>{lesson.title}</strong>
                        <span>{lesson.outcome}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          </CourseDisclosure>
        ) : null}

        <CourseDisclosure title="Schedule, payment & terms" description="Session timings, advance payment and agreed scope.">
          <div className="courses-schedule-note">
            <strong>{program.totalClasses} classes × {program.sessionDurationLabel} · {program.totalHours} hours · {program.weeksLabel}</strong>
            <span>Monday + Friday, or Tuesday + Saturday</span>
            <span>{program.sessionTimeLabel}</span>
          </div>
          <ul className="courses-terms-list">{program.terms.map((term) => <li key={term}>{term}</li>)}</ul>
        </CourseDisclosure>
      </div>
    </article>
  );
}

export function CoursesPageContent() {
  return (
    <MarketingPage>
      <SiteHeader />

      <section className="courses-catalog-hero">
        <div className="courses-catalog-hero-inner mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-catalog-hero-copy">
            <p className="type-kicker text-sky-700">{coursesPage.eyebrow}</p>
            <h1>{coursesPage.title}</h1>
            <p className="courses-catalog-lead">{coursesPage.lead}</p>
            <div className="courses-hero-actions">
              <a className="btn-cta btn-primary" href="#programs">
                Explore live programmes <ArrowDown size={16} aria-hidden="true" />
              </a>
              <a className="btn-cta btn-secondary" href="#recorded-courses">Browse recorded courses</a>
            </div>
            <p className="courses-instructor">{coursesPage.instructorNote} · Hindi or English</p>
          </div>
          <aside className="courses-build-preview" aria-label="Business Owners programme approach">
            <p className="courses-preview-eyebrow">The Business Owners programme</p>
            <h2>Your business.<br />A system built around it.</h2>
            <p className="courses-preview-lead">Practical system building, with training for your team.</p>
            <ol className="courses-preview-path">
              <li><span aria-hidden="true">01</span><div><strong>Your organization chart</strong><p>Start with people, roles and workflows.</p></div></li>
              <li><span aria-hidden="true">02</span><div><strong>Your chosen technology</strong><p>We build the systems in your agreed scope.</p></div></li>
              <li><span aria-hidden="true">03</span><div><strong>Your team, ready to use it</strong><p>Practical training on the systems we build.</p></div></li>
            </ol>
            <a href="#business-owners" className="courses-preview-link">Explore the programme <ArrowRight size={16} aria-hidden="true" /></a>
          </aside>
        </div>
      </section>

      <nav className="courses-resource-nav" aria-label="Course booking and student access">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <span>Already learning with us?</span>
          <a href={COURSE_GOOGLE_CALENDAR_BOOKING_URL} target="_blank" rel="noopener noreferrer">Book slots <ArrowRight size={14} aria-hidden="true" /></a>
          <Link href="/courses/book-slots">Booking page</Link>
          <Link href="/learn/login">Student login</Link>
          <Link href={WORKSPACE_LOGIN_HREF}>{coursesPage.ctaSecondaryLabel}</Link>
        </div>
      </nav>

      <section className="courses-program-section" id="programs" aria-labelledby="courses-programs-title">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">Live programmes with Shyam</p>
            <h2 className="minimal-section-title mt-2" id="courses-programs-title">Choose what you want to build.</h2>
            <p className="minimal-section-lead">A system for your business, or the skills to build one yourself. Open any section below to explore the details, then close it when you’re done.</p>
          </div>
          <div className="courses-program-grid">
            {coursePrograms.map((program) => <CourseProgramCard key={program.id} program={program} />)}
          </div>
        </div>
      </section>

      <section className="minimal-strip bg-white pb-16" id="recorded-courses">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">Recorded courses · learn at your pace</p>
            <h2 className="minimal-section-title mt-2">Recorded courses for practical work.</h2>
            <p className="minimal-section-lead">
              Learn the Sheets, apps, forms, and dashboards that turn daily work
              into a system your team can follow.
            </p>
          </div>
          <article className="courses-recorded-feature">
            <div>
              <p className="courses-phase-range">Available now · Google Sheets course</p>
              <h3>Google Sheets: Essentials to Pro</h3>
              <p>
                The first recorded course is live now. Start with everyday Sheet
                skills, then progress to practical tools that make work clearer
                and faster.
              </p>
              <p>Purchase and course access are handled securely on Graphy.</p>
            </div>
            <div className="courses-recorded-purchase">
              <p>Current offer</p>
              <strong>{courseEnrollmentPriceLabel(2_999)}</strong>
              <a className="btn-cta btn-primary" href={recordedCourseUrl} target="_blank" rel="noopener noreferrer">
                Buy Google Sheets course
              </a>
            </div>
          </article>
          <div className="courses-recorded-upcoming" id="course-focus">
            <CourseDisclosure title={`Coming next: ${upcomingRecordedCourses.length} recorded courses`} description="Explore the courses currently in production.">
              <p>Each course will be marked available here as soon as it is ready.</p>
              <div className="courses-area-grid">
                {upcomingRecordedCourses.map((course) => (
                  <article className="courses-area" key={course.title}>
                    <p className="courses-phase-range">{course.category}</p>
                    <h4>{course.title}</h4>
                    <p>{course.description}</p>
                    <span className="courses-coming-soon">Coming soon</span>
                  </article>
                ))}
              </div>
            </CourseDisclosure>
          </div>
        </div>
      </section>

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
          <CourseDisclosure title="Browse the video library" description={`${coursesLibraryVideos.length} practical lessons from the Sheetomatic channel.`}>
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
                    <ResilientImage
                      alt=""
                      loading="lazy"
                      width={480}
                      height={360}
                      unoptimized
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
          </CourseDisclosure>
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
                Explore live 1:1 programs
              </a>
              <a className="btn-cta btn-secondary" href={recordedCourseUrl} target="_blank" rel="noopener noreferrer">
                Buy recorded Google Sheets course
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
