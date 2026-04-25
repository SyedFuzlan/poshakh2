import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  basePath: process.env.NODE_ENV === "production" ? "/poshakh" : "", // Only use basePath in production builds
  output: "export", // Static export for GitHub Pages
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "9000",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
