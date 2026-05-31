import type { MarketingVideo } from "@/app/video-content";
import { VideoEmbed } from "./video-embed";
import "./videos.css";

export function VideoInlineBand({ video }: { video: MarketingVideo }) {
  return (
    <div className="video-inline-band">
      <div>
        <p className="video-hero-strip-kicker">{video.label} video</p>
        <h3 className="type-card-title-lg mt-2">{video.title}</h3>
        <p className="type-body mt-3">{video.description}</p>
      </div>
      <VideoEmbed video={video} variant="compact" />
    </div>
  );
}
