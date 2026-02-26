import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Avoid barrel-file import cost for icon/component libraries (bundle-barrel-imports)
    optimizePackageImports: ['lucide-react'],
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    // Allow images from any domain for user-uploaded content
    // In production, restrict to known domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
