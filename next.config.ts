import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.12.48", "192.168.12.63"],
};

export default nextConfig;
