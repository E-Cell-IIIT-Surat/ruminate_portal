import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**"],
  },
};

export default nextConfig;
