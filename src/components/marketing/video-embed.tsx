import { Play, Video } from "lucide-react";
import { ResilientImage } from "./resilient-image";
import type { MarketingVideo } from "@/app/video-content";
import "./videos.css";

type VideoEmbedProps = {
  video: MarketingVideo;
  variant?: "default" | "compact" | "featured";
};

export function VideoEmbed({ video, variant = "default" }: VideoEmbedProps) {
  const hasVideo = Boolean(video.youtubeId?.trim());
  const watchUrl = hasVideo
    ? `https://www.youtube.com/watch?v=${video.youtubeId!.trim()}`
    : undefined;
  const thumbnailUrl = hasVideo
    ? `https://i.ytimg.com/vi/${video.youtubeId!.trim()}/hqdefault.jpg`
    : undefined;

  return (
    <figure className={`video-embed video-embed-${variant}`}>
      {hasVideo ? (
        <a
          className="video-embed-frame video-embed-thumbnail"
          href={watchUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Watch ${video.title} on YouTube`}
        >
          <ResilientImage
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={thumbnailUrl!}
          />
          <span className="video-embed-play" aria-hidden="true">
            <Play size={22} fill="currentColor" />
          </span>
          <span className="sr-only">Watch on YouTube</span>
        </a>
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
