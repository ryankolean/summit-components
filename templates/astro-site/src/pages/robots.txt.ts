import type { APIRoute } from "astro";
import { robotsTxt } from "@summit/seo";
import { mode } from "../lib/site";

export const GET: APIRoute = ({ site }) =>
  new Response(
    robotsTxt({ mode, sitemapUrl: new URL(`${import.meta.env.BASE_URL.replace(/\/?$/, "/")}sitemap-index.xml`, site).href }),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
