import { handleTidesRequest } from "@/lib/tides-api";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export function GET(request: Request): Promise<Response> {
  return handleTidesRequest(request, {
    apiKey: process.env.API_MAREE_KEY,
  });
}
