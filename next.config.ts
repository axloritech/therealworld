import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Hero / marketing imagery can be dropped in later without a code change.
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // Allow the Arena/Vercel preview host plus any custom domain.
  allowedDevOrigins: ["*.e2b.app", "*.vercel.app", "localhost"],
};

export default nextConfig;
