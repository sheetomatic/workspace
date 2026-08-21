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
  onBuild: (prompt: string) => void;
};

export function AiBar({ credits, busy, onBuild }: Props) {
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

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
    onBuild(q);
  }

  return (
    <div className="ai-bar">
      <div className="ai-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say or type: orders, CRM, stock, attendance…"
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
          {listening ? "●" : "mic"}
        </button>
        <button
          type="button"
          className="go"
          disabled={busy || credits < 1}
          onClick={() => submit(text)}
        >
          {credits < 1 ? "Buy credits" : "Build"}
        </button>
      </div>
      <div className="chips">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" onClick={() => submit(t.prompt)}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
