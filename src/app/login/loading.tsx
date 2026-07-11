export default function LoginLoading() {
  return (
    <main
      className="login-page workspace-login"
      aria-busy="true"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8fafc",
      }}
    >
      <div style={{ width: "min(360px, 90vw)", display: "grid", gap: 12 }}>
        <div
          style={{
            height: 28,
            width: "60%",
            borderRadius: 8,
            background: "#e2e8f0",
            margin: "0 auto",
          }}
        />
        <div
          style={{
            height: 180,
            borderRadius: 12,
            background: "#e2e8f0",
          }}
        />
        <span className="sr-only">Loading sign in…</span>
      </div>
    </main>
  );
}
