"use client";

import { useMemo, useState } from "react";
import {
  generateSocialCopyAction,
  generateSocialVisualsAction,
  saveSocialStudioPostAction,
} from "@/app/app/social/actions";
import { SOCIAL_ICP_VERTICALS } from "@/lib/social/icp";
import type { GeneratedSocialCopy } from "@/lib/social/generate";
import type { SocialPostFormat } from "@/lib/my-space/social/types";
import "./social-studio-panel.css";

export function SocialStudioPanel() {
  const [icp, setIcp] = useState(SOCIAL_ICP_VERTICALS[0].id);
  const [format, setFormat] = useState<SocialPostFormat>("image");
  const [personName, setPersonName] = useState("");
  const [shopName, setShopName] = useState("");
  const [messyDetail, setMessyDetail] = useState("");
  const [problem, setProblem] = useState("");
  const [extra, setExtra] = useState("");
  const [copy, setCopy] = useState<GeneratedSocialCopy | null>(null);
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState<"copy" | "visual" | "save" | null>(null);
  const [message, setMessage] = useState("");

  const slides = useMemo(() => copy?.slides ?? [], [copy]);

  async function writeStory() {
    setBusy("copy");
    setMessage("");
    const result = await generateSocialCopyAction({
      icp,
      format,
      personName,
      shopName,
      messyDetail,
      problem,
      extra,
    });
    setBusy(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setCopy(result.copy);
    setCaption(result.copy.caption);
    setTitle(result.copy.title);
    setImages([]);
  }

  async function drawVisuals() {
    if (!copy) {
      setMessage("Write the story first.");
      return;
    }
    setBusy("visual");
    setMessage("");
    const result = await generateSocialVisualsAction(
      copy.slides.map((slide) => slide.artDirection),
    );
    setBusy(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setImages(result.images);
  }

  async function save() {
    setBusy("save");
    setMessage("");
    const result = await saveSocialStudioPostAction({
      title,
      caption,
      format,
      pillar: "Studio",
      icp,
      storyHook: `${personName} · ${shopName} · ${messyDetail}`,
      artDirection: copy?.artDirection ?? "",
      creative: images[0] ?? "",
      carousel: images.slice(1),
    });
    setBusy(null);
    setMessage(result.message);
  }

  return (
    <section className="social-studio">
      <div className="social-studio-brief">
        <h2>Create a post</h2>
        <p>
          Better than a ChatGPT paste: ICP locked, long human story, then
          image or carousel from the same brief. Team posts manually, then
          marks Posted here.
        </p>
        <label>
          Who is this about?
          <select value={icp} onChange={(event) => setIcp(event.target.value)}>
            {SOCIAL_ICP_VERTICALS.map((row) => (
              <option key={row.id} value={row.id}>
                {row.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Format
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as SocialPostFormat)}
          >
            <option value="image">Single image + caption</option>
            <option value="carousel">Carousel (5 slides) + caption</option>
          </select>
        </label>
        <label>
          Person&apos;s first name
          <input
            value={personName}
            onChange={(event) => setPersonName(event.target.value)}
            placeholder="Neeraj"
          />
        </label>
        <label>
          Shop / clinic name
          <input
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
            placeholder="Ketan Furniture"
          />
        </label>
        <label>
          One messy real detail
          <textarea
            rows={2}
            value={messyDetail}
            onChange={(event) => setMessyDetail(event.target.value)}
            placeholder="WhatsApp unread 86, cash in a diary, sample sitting on a chair…"
          />
        </label>
        <label>
          What was going wrong
          <textarea
            rows={2}
            value={problem}
            onChange={(event) => setProblem(event.target.value)}
            placeholder="Owner compiling MIS on Sunday night before EM"
          />
        </label>
        <label>
          Extra colour (optional)
          <input
            value={extra}
            onChange={(event) => setExtra(event.target.value)}
            placeholder="Rain, festival week, a specific argument…"
          />
        </label>
        <div className="social-studio-actions">
          <button
            className="btn-cta"
            type="button"
            disabled={busy !== null}
            onClick={() => void writeStory()}
          >
            {busy === "copy" ? "Writing…" : "Write story & caption"}
          </button>
          <button
            className="btn-secondary"
            type="button"
            disabled={busy !== null || !copy}
            onClick={() => void drawVisuals()}
          >
            {busy === "visual"
              ? "Drawing…"
              : format === "carousel"
                ? "Generate carousel"
                : "Generate image"}
          </button>
        </div>
      </div>

      <div className="social-studio-preview">
        {copy ? (
          <>
            <label>
              Board title
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              Caption (edit before you post)
              <textarea
                rows={14}
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
              />
            </label>
            {slides.length > 0 ? (
              <ol className="social-studio-slides">
                {slides.map((slide, index) => (
                  <li key={`${slide.title}-${index}`}>
                    <strong>
                      {index + 1}. {slide.title}
                    </strong>
                    <span>{slide.artDirection}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {images.length > 0 ? (
              <div className="social-studio-images">
                {images.map((src, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={index} src={src} alt={`Slide ${index + 1}`} />
                ))}
              </div>
            ) : (
              <p className="social-studio-hint">
                Generate visuals after you like the story. Then copy the caption
                into LinkedIn and mark Posted on the week board.
              </p>
            )}
            <button
              className="btn-cta"
              type="button"
              disabled={busy !== null || !caption}
              onClick={() => void save()}
            >
              {busy === "save" ? "Saving…" : "Save to this week"}
            </button>
          </>
        ) : (
          <p className="social-studio-hint">
            Fill the brief and write a story. No grocery / kirana / mall.
          </p>
        )}
        {message ? <p className="social-studio-message">{message}</p> : null}
      </div>
    </section>
  );
}
