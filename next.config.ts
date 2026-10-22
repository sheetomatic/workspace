import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small image for a single always-on server. Vercel ignores this and uses its own output.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/services/hr/field-tracking",
        destination: "/services/field-tracking",
        permanent: true,
      },
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
