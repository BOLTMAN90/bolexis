import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace pages depend on the signed-in user. Leave component caching off
  // so one user's CRM data cannot be reused for another request.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
