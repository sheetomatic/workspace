import {
  BookOpen,
  FileText,
  GitBranch,
  LayoutDashboard,
  MessageCircle,
  Play,
  Sheet,
  Smartphone,
  TableProperties,
} from "lucide-react";
import {
  FinalCta,
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import {
  coursesPage,
  freeCourseTopics,
  paidCourses,
} from "@/app/page-content";
import { graphyStoreUrl, youtubeChannelName, youtubeChannelUrl } from "@/app/site-content";
import { WORKSPACE_LOGIN_HREF } from "@/lib/workspace-auth-links";
import Link from "next/link";
import "./minimal-premium.css";
import "./courses-page.css";

const freeTopicMeta = {
  "Flow Monitoring": { icon: GitBranch, tone: "tone-sky" },
  Sheets: { icon: Sheet, tone: "tone-indigo" },
  WhatsApp: { icon: MessageCircle, tone: "tone-sky" },
  Forms: { icon: FileText, tone: "tone-indigo" },
  AppSheet: { icon: Smartphone, tone: "tone-sky" },
  Dashboards: { icon: LayoutDashboard, tone: "tone-indigo" },
  Query: { icon: TableProperties, tone: "tone-sky" },
  Functions: { icon: TableProperties, tone: "tone-indigo" },
  Docs: { icon: FileText, tone: "tone-sky" },
} as const;

const paidTones = [
  "tone-sky",
  "tone-indigo",
  "tone-emerald",
  "tone-violet",
  "tone-amber",
  "tone-rose",
] as const;

export function CoursesPageContent() {
  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero
        eyebrow={coursesPage.eyebrow}
        title={coursesPage.title}
        text={coursesPage.lead}
      />

      <section className="minimal-strip bg-white pb-12 courses-yt-section">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">{coursesPage.freeTitle}</p>
            <h2 className="minimal-section-title mt-2">YouTube: {youtubeChannelName}</h2>
            <p className="minimal-section-lead">{coursesPage.freeLead}</p>
          </div>
          <div className="courses-yt-grid">
            {freeCourseTopics.map((topic) => {
              const meta =
                freeTopicMeta[topic.tag as keyof typeof freeTopicMeta] ??
                freeTopicMeta.Sheets;
              const Icon = meta.icon;

              return (
                <a
                  id={topic.id}
                  className="course-yt-card"
                  href={topic.href}
                  key={topic.id}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span className={`marketing-icon sm ${meta.tone}`} aria-hidden>
                    <Icon size={22} />
                  </span>
                  <div className="course-yt-body">
                    <p className="course-yt-tag">{topic.tag}</p>
                    <h3>{topic.title}</h3>
                    <p>{topic.text}</p>
                  </div>
                </a>
              );
            })}
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
              <span>{coursesPage.watchYoutubeLabel}</span>
            </a>
          </div>
        </div>
      </section>

      <section className="minimal-strip soft-section pb-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="courses-section-head">
            <p className="type-kicker text-sky-700">{coursesPage.paidTitle}</p>
            <h2 className="minimal-section-title mt-2">Sheetomatic learning store</h2>
            <p className="minimal-section-lead">{coursesPage.paidLead}</p>
          </div>
          <div className="courses-paid-grid">
            {paidCourses.map((course, index) => {
              const tone = paidTones[index] ?? paidTones[0];
              return (
                <article
                  className={`course-paid-card ${course.featured ? "featured" : ""}`}
                  key={course.title}
                >
                  <span className={`marketing-icon ${tone}`} aria-hidden>
                    <BookOpen size={22} />
                  </span>
                  <p className="course-paid-tag">{course.tag}</p>
                  <h3>{course.title}</h3>
                  <p className="course-paid-text">{course.text}</p>
                  <p className="course-paid-level">{course.level}</p>
                </article>
              );
            })}
          </div>
          <div className="courses-paid-footer cta-stack">
            <a
              className="btn-cta btn-primary btn-block"
              href={graphyStoreUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {coursesPage.paidStoreButtonLabel}
            </a>
            <Link className="courses-members-signin" href={WORKSPACE_LOGIN_HREF}>
              Already a member? Sign in
            </Link>
          </div>
        </div>
      </section>

      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
