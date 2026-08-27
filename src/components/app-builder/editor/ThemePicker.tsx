import { THEMES, type AppMeta } from "@/lib/app-builder";

type Props = {
  meta: AppMeta;
  onChange: (patch: Partial<AppMeta>) => void;
};

export function ThemePicker({ meta, onChange }: Props) {
  return (
    <div className="theme-picker">
      <p className="aside-label">Theme</p>
      <div className="palettes">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={(!meta.themeId && t.id === "ink") || meta.themeId === t.id ? "on" : ""}
            title={t.name}
            onClick={() => onChange({ themeId: t.id, themeAccent: t.accent })}
          >
            <span style={{ background: t.paper, borderColor: t.line }}>
              <i style={{ background: t.accent }} />
              <i style={{ background: t.soft }} />
              <i style={{ background: t.ink }} />
            </span>
            {t.name}
          </button>
        ))}
      </div>
      <label className="field-label">
        Accent
        <input
          type="color"
          className="color-dot"
          value={meta.themeAccent || "#111113"}
          onChange={(e) => onChange({ themeAccent: e.target.value })}
        />
      </label>
    </div>
  );
}
