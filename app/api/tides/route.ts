import { handleTidesRequest } from "@/lib/tides-api";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { env } = await import("cloudflare:workers");
  // Le cast qui était ici ne vérifiait rien : faute de types pour
  // `cloudflare:workers`, `env` valait `any`, et une intersection avec `any`
  // reste `any`. Il donnait l'illusion que la clé était typée alors qu'une
  // faute de frappe dans son nom serait passée à la compilation. Le module est
  // déclaré depuis (worker/cloudflare.d.ts), donc la lecture est directe et
  // réellement vérifiée.
  return handleTidesRequest(request, {
    apiKey: env.API_MAREE_KEY,
  });
}
