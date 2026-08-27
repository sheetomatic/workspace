import { useEffect, useRef, useState } from "react";
import { TEMPLATES } from "@/lib/app-builder";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  }
}

type Props = {
  credits: number;
  busy?: boolean;
  built?: boolean;
  lastPrompt?: string;
  onBuild: (prompt: string) => void;
};

export function AiBar({ credits, busy, built, lastPrompt, onBuild }: Props) {
  const [text, setText] = useState(lastPrompt || "");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    if (lastPrompt) setText(lastPrompt);
  }, [lastPrompt]);

  useEffect(() => {
    return () => recRef.current?.stop();
  }, []);

  function listen() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setText((t) => t || "Type here — this browser has no mic speech.");
      return;
    }
    const rec = new Ctor();
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const said = ev.results[0]?.[0]?.transcript || "";
      setText((t) => (t ? `${t} ${said}` : said));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  function submit(prompt: string) {
    const q = prompt.trim();
    if (!q || busy) return;
    if (built) {
      const ok = window.confirm(
        "Rebuild this app from your prompt? Current screens are replaced. Sheet rows already saved in Google stay.",
      );
      if (!ok) return;
    }
    onBuild(q);
  }

  return (
    <div className="ai-bar">
      <p className="ai-hint">
        {built
          ? "Already built? Speak or type the change, then Rebuild. Or use Layout and Data to tweak screens without replacing the app."
          : "Speak or type what to build, then Build."}
      </p>
      <div className="ai-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            built
              ? "Say or type the change — sales, purchase, leads, cashbook…"
              : "Say or type: orders, CRM, stock, attendance…"
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") submit(text);
          }}
        />
        <button
          type="button"
          className={listening ? "mic on" : "mic"}
          onClick={() => (listening ? recRef.current?.stop() : listen())}
          aria-label="Voice"
        >
          <MicIcon listening={listening} />
        </button>
        <button
          type="button"
          className="go"
          disabled={busy || credits < 1 || !text.trim()}
          onClick={() => submit(text)}
        >
          {credits < 1 ? "Buy credits" : built ? "Rebuild" : "Build"}
        </button>
      </div>
      <div className="chips">
        {TEMPLATES.filter((t) => t.id !== "custom").map((t) => (
          <button key={t.id} type="button" onClick={() => submit(t.prompt)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path
        fill="currentColor"
        d={
          listening
            ? "M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"
            : "M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Zm4.5-3a4.5 4.5 0 1 1-9 0H5.5a6.5 6.5 0 0 0 6 6.48V21h1v-3.52A6.5 6.5 0 0 0 18.5 11h-2Z"
        }
      />
    </svg>
  );
}
