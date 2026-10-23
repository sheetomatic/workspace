"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/** Keep a failed remote thumbnail from displaying a broken-image glyph. */
export function ResilientImage(props: ImageProps) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  if (failedSource === props.src) {
    return <span className="image-unavailable" role={props.alt ? "img" : undefined} aria-label={props.alt || undefined} aria-hidden={!props.alt || undefined}>Video preview unavailable</span>;
  }
  return <Image {...props} alt={props.alt} onError={() => setFailedSource(props.src)} />;
}

export function ClientLogo({ src, name, hidden }: {src: string; name: string; hidden: boolean}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (failed) return <strong className="client-logo-wordmark">{name}</strong>;
  // Remote client marks stay identifiable by their name if the host is unavailable.
  return <>
    {!loaded && <strong className="client-logo-wordmark">{name}</strong>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img className="client-logo-image" style={loaded ? undefined : {display: "none"}} src={src} alt={hidden ? "" : `${name} logo`} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
  </>;
}
