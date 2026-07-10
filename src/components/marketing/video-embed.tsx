import { Play, Video } from "lucide-react";
import type { MarketingVideo } from "@/app/video-content";
import "./videos.css";

type VideoEmbedProps = {
  video: MarketingVideo;
  variant?: "default" | "compact" | "featured";
};

function getEmbedUrl(youtubeId: string) {
  return `https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`;
}

export function VideoEmbed({ video, variant = "default" }: VideoEmbedProps) {
  const hasVideo = Boolean(video.youtubeId?.trim());

  return (
    <figure className={`video-embed video-embed-${variant}`}>
      {hasVideo ? (
        <div className="video-embed-frame">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            src={getEmbedUrl(video.youtubeId!.trim())}
            title={video.title}
          />
        </div>
      ) : (
        <div className="video-embed-placeholder">
          <span className="video-embed-placeholder-icon">
            <Play size={28} />
          </span>
          <p className="video-embed-placeholder-title">Video slot ready</p>
          <p className="video-embed-placeholder-text">
            Add YouTube ID in <code>src/app/video-content.ts</code>
            <br />
            <strong>{video.id}</strong>
          </p>
        </div>
      )}
      <figcaption className="video-embed-caption">
        <span className="video-embed-label">
          <Video size={14} />
          {video.label}
        </span>
        <strong>{video.title}</strong>
        {video.description ? <p>{video.description}</p> : null}
      </figcaption>
    </figure>
  );
}
