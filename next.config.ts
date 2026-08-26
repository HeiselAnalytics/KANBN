import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  devIndicators: false,
  webpack(config) {
    // Next 16.3 can emit truncated module-reference identifiers while scope-hoisting
    // server actions. Keep production builds deterministic until the upstream fix lands.
    config.optimization.concatenateModules = false;
    return config;
  },
};

export default nextConfig;
