import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  outputFileTracingRoot: path.resolve(process.cwd()),
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "www.trendcast.io",
          },
        ],
        destination: "https://trendcast.io/:path*",
        permanent: true,
      },
    ];
  },
  outputFileTracingIncludes: {
    "/*": ["./src/content/hub/**/*.md"],
  },
};

export default nextConfig;
