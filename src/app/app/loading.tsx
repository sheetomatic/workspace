/** Instant main-pane skeleton — inline styles so paint is not blocked on CSS. */
export default function AppLoading() {
  return (
    <div
      className="saas-page ws-page-loading"
      aria-busy="true"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        minHeight: 320,
        padding: "8px 0",
      }}
    >
      <div
        aria-hidden
        style={{
          height: 3,
          borderRadius: 999,
          background: "linear-gradient(90deg, #0176d3 0%, #7eb6ff 50%, #0176d3 100%)",
          backgroundSize: "200% 100%",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          aria-hidden
          style={{
            width: "min(240px, 60%)",
            height: 28,
            borderRadius: 8,
            background: "#e2e8f0",
          }}
        />
        <div
          aria-hidden
          style={{
            width: "min(420px, 85%)",
            height: 16,
            borderRadius: 6,
            background: "#e2e8f0",
          }}
        />
        <div
          aria-hidden
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              style={{ height: 88, borderRadius: 10, background: "#e2e8f0" }}
            />
          ))}
        </div>
        <div
          aria-hidden
          style={{ height: 220, borderRadius: 12, background: "#e2e8f0" }}
        />
      </div>
      <span className="sr-only">Loading workspace…</span>
    </div>
  );
}
