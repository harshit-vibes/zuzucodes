import type { NextConfig } from "next";

const APP_URL =
  process.env.NODE_ENV === "production"
    ? "https://app.zuzu.codes"
    : "http://localhost:3001";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/:path*",
        destination: `${APP_URL}/dashboard/:path*`,
        permanent: true,
      },
      {
        source: "/auth/:path*",
        destination: `${APP_URL}/auth/:path*`,
        permanent: true,
      },
      {
        source: "/account/:path*",
        destination: `${APP_URL}/account/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
