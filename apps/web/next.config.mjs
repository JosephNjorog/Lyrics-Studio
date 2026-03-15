/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lyric-sync/types", "@lyric-sync/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "fluent-ffmpeg",
      "music-metadata",
      "@ffmpeg-installer/ffmpeg",
      "canvas",
      "bullmq",
      "ioredis",
    ],
  },
  webpack: (config) => {
    // Handle audio/video file imports in tests
    config.resolve.alias = {
      ...config.resolve.alias,
    };
    return config;
  },
};

export default nextConfig;
