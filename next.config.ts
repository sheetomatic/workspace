import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Railway / Docker: standalone `node server.js`. Local + Vercel leave unset.
  ...(process.env.DOCKER_BUILD === "1" || process.env.RAILWAY_ENVIRONMENT
    ? { output: "standalone" as const }
    : {}),
  turbopack: {
    root: __dirname,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Keep aligned with AI_KNOWLEDGE_MAX_UPLOAD_BYTES in src/lib/ai-knowledge-limits.ts
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
