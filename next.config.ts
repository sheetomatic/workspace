import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    serverActions: {
      // Keep aligned with AI_KNOWLEDGE_MAX_UPLOAD_BYTES in src/lib/ai-knowledge-limits.ts
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
