import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Keep aligned with AI_KNOWLEDGE_MAX_UPLOAD_BYTES in src/lib/ai-knowledge-limits.ts
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
