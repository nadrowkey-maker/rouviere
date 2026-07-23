import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    // AVIF avec repli WebP, sur toutes les images DOM.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
