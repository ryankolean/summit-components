import type { APIRoute } from "astro";
import { llmsTxt } from "@summit/seo";
import { entity } from "../lib/site";

export const GET: APIRoute = () =>
  new Response(llmsTxt(entity), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
