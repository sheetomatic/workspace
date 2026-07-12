import Link from "next/link";
import { homeProofVideos } from "@/app/video-content";
import { VideoEmbed } from "./video-embed";
import "./videos.css";

export function HomeProofVideosSection() {
  return (
    <section className="section bg-white" id="owner-videos" aria-labelledby="owner-videos-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="section-heading">
          <p>See the systems</p>
          <h2 id="owner-videos-title">More owner clips — IMS, EM, Tasks</h2>
          <div className="section-subcopy">
            Inventory, collections dashboards, and task delegation — FMS and
            WhatsApp→Tasks are in Core Offers above.
          </div>
        </div>

        <div className="video-hub-grid">
          {homeProofVideos.map((video) => (
            <VideoEmbed key={video.id} video={video} variant="compact" />
          ))}
        </div>

        <div className="minimal-hero-actions mt-8" style={{ justifyContent: "center" }}>
          <Link className="btn-cta btn-primary" href="/courses">
            Explore Courses
          </Link>
          <Link className="btn-cta btn-secondary" href="/services">
            Browse services
          </Link>
        </div>
      </div>
    </section>
  );
}
