import type { NextConfig } from "next";

// STATIC_EXPORT=1 writes plain HTML to out/ for static hosts and for the
// summit-checks gate. Without it, this is a normal server build, which is why
// a site picks Next in the first place (auth, data, server actions).
const staticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.BASE_PATH?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  ...(staticExport ? { output: "export" as const, trailingSlash: true, images: { unoptimized: true } } : {}),
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
