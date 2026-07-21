import type { NextConfig } from "next";

const nextConfig = {
  pageExtensions: ["js", "jsx", "ts", "tsx"],
  poweredByHeader: false,
  serverExternalPackages: ["pg"],
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  serverActions: {
    bodySizeLimit: "50mb",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
