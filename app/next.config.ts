import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // M8.1 · 素材库单文件上限 2MB，给 multipart 包头留余量
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
