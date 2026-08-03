import { handleTidesRequest } from "@/lib/tides-api";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { env } = await import("cloudflare:workers");
  const runtimeEnv = env as typeof env & { API_MAREE_KEY?: string };
  return handleTidesRequest(request, {
    apiKey: runtimeEnv.API_MAREE_KEY,
  });
}
