import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // replaces `next export`
  distDir: 'out',   // ensures static build goes to /out
};

export default nextConfig;
