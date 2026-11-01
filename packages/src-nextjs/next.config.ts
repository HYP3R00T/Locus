import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // npm installs dependencies at the workspace root.
  turbopack: { root: path.resolve(__dirname, "../..") },
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  // Keep framework-generated agent instructions out of the working tree.
  agentRules: false,
};

export default nextConfig;
