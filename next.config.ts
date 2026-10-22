import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser Origin is http://127.0.0.1:3000. Next otherwise treats that as
  // cross-origin and refuses the dev HMR websocket.
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      {
        source: "/addons",
        destination: "/templates?category=cloud",
        permanent: true,
      },
    ];
  },
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Dev hydration waits on a React debug chunk that arrives over HMR.
    // When that chunk never closes, the page stays server HTML and clicks
    // do nothing. This flag is dev-only.
    reactDebugChannel: false,
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Keep aligned with AI_KNOWLEDGE_MAX_UPLOAD_BYTES in src/lib/ai-knowledge-limits.ts
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
