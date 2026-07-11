/** Cases route skeleton — visible immediately while legal queries run. */
export default function CasesLoading() {
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
          background: "linear-gradient(90deg, #4c1d95 0%, #a78bfa 50%, #4c1d95 100%)",
          backgroundSize: "200% 100%",
        }}
      />
      <div
        aria-hidden
        style={{
          width: "min(280px, 70%)",
          height: 28,
          borderRadius: 8,
          background: "#e2e8f0",
        }}
      />
      <div
        aria-hidden
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            style={{ height: 72, borderRadius: 10, background: "#e2e8f0" }}
          />
        ))}
      </div>
      <div
        aria-hidden
        style={{ height: 280, borderRadius: 12, background: "#e2e8f0" }}
      />
      <span className="sr-only">Loading cases…</span>
    </div>
  );
}
