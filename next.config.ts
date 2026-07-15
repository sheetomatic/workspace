import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker / Hostinger VPS: set DOCKER_BUILD=1 (see Dockerfile) for `node server.js`.
  // Leave unset on Vercel so the platform build path stays unchanged during cutover.
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
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
