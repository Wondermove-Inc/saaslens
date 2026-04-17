import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import path from "path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",

  // 서브모듈 패키지 트랜스파일 설정
  transpilePackages: ["packages/ui-registry"],

  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },

  // 실험적 기능
  experimental: {
    // Server Actions 최적화
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // recharts 이중 인스턴스 방지: 모든 recharts import를 root node_modules로 통일
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      recharts: path.resolve(__dirname, "node_modules/recharts"),
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
