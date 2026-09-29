import { robotsTxt } from "@summit/seo";
import { absolute, mode } from "../../lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(robotsTxt({ mode, sitemapUrl: absolute("sitemap.xml") }), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
