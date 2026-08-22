/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);

    // viewport-fit=cover has to be in the bytes Safari parses.
    //
    // vinext emits the viewport tag itself and drops viewportFit, both from
    // metadata.viewport and from the `viewport` export — checked against the
    // served markup. Setting the attribute from a script in <head> instead does
    // not work and cannot be seen to fail: measured on an installed iPhone 15
    // Pro Max, the tag read back as "viewport-fit=cover" while the layout had
    // already been decided without it — safe-area insets 0/0/0/0, an 873
    // viewport on a 932 screen. viewport-fit is read when the tag is parsed.
    //
    // Rewriting the response fixes it where the timing problem cannot exist.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return response;

    // HTMLRewriter is a Workers global. The suite drives worker.fetch under
    // Node, where it does not exist, and an unguarded reference threw before
    // anything could return a response — the tests hung rather than failed.
    if (typeof HTMLRewriter === "undefined") {
      const html = await response.text();
      return new Response(
        html.replace(
          /(<meta[^>]*name="viewport"[^>]*content=")([^"]*)(")/i,
          '$1width=device-width, initial-scale=1, viewport-fit=cover$3',
        ),
        { status: response.status, statusText: response.statusText, headers: response.headers },
      );
    }

    return new HTMLRewriter()
      .on('meta[name="viewport"]', {
        element(element) {
          element.setAttribute(
            "content",
            "width=device-width, initial-scale=1, viewport-fit=cover",
          );
        },
      })
      .transform(response);
  },
};

export default worker;
