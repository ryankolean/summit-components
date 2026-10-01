import { llmsTxt } from "@summit/seo";
import { entity } from "../../lib/site";

export const dynamic = "force-static";

export function GET() {
  return new Response(llmsTxt(entity), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
