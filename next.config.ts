import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/blog",
        destination: "/hub",
        permanent: true,
      },
      {
        source: "/blog/:slug",
        destination: "/hub/:slug",
        permanent: true,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/*": [
      "./src/content/hub/**/*.md",
      "./node_modules/playwright/.local-browsers/**/*",
      "./node_modules/playwright-core/.local-browsers/**/*",
    ],
  },
};

export default nextConfig;
