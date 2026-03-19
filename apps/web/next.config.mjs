/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@lyric-sync/config"],
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
};

export default nextConfig;
