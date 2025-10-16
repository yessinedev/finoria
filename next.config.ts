import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
