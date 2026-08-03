const API_BASE_URL = "https://api-maree.fr";
const TIMEZONE = "Europe/Paris";
const STEP_MINUTES = 10;
const MAX_DAYS = 7;
const MAX_LEVEL_POINTS = MAX_DAYS * 24 * (60 / STEP_MINUTES);
const DEFAULT_TIMEOUT_MS = 8_000;
const DAY_MS = 86_400_000;

const SUCCESS_CACHE_CONTROL =
  "public, max-age=300, s-maxage=21600, stale-while-revalidate=86400";
const ERROR_CACHE_CONTROL = "no-store";

type PortConfig = {
  id: string;
  name: string;
  siteId: string | null;
};

export const TIDE_PORTS = {
  biarritz: {
    id: "biarritz",
    name: "Biarritz",
    siteId: "boucau-bayonne-biarritz",
  },
  "saint-jean-de-luz": {
    id: "saint-jean-de-luz",
    name: "Saint-Jean-de-Luz",
    siteId: "saint-jean-de-luz",
  },
  capbreton: {
    id: "capbreton",
    name: "Capbreton",
    siteId: null,
  },
  arcachon: {
    id: "arcachon",
    name: "Arcachon",
    siteId: "arcachon-jetee-d-eyrac",
  },
  "la-rochelle": {
    id: "la-rochelle",
    name: "La Rochelle",
    siteId: "la-rochelle-pallice",
  },
  "les-sables": {
    id: "les-sables",
    name: "Les Sables-d’Olonne",
    siteId: "les-sables-d-olonne",
  },
  brest: {
    id: "brest",
    name: "Brest",
    siteId: "brest",
  },
  "saint-malo": {
    id: "saint-malo",
    name: "Saint-Malo",
    siteId: "saint-malo",
  },
} as const satisfies Record<string, PortConfig>;

type TidePortId = keyof typeof TIDE_PORTS;

type HandlerDependencies = {
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  now?: Date;
  timeoutMs?: number;
};

type ParsedQuery = {
  port: (typeof TIDE_PORTS)[TidePortId];
  start: string;
  endInclusive: string;
  endExclusive: string;
  days: number;
};

type ApiErrorCode =
  | "invalid_request"
  | "invalid_port"
  | "unsupported_port"
  | "date_out_of_range"
  | "service_unconfigured"
  | "upstream_rate_limited"
  | "upstream_timeout"
  | "upstream_unavailable";

class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

class UpstreamHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Upstream responded with status ${status}`);
    this.name = "UpstreamHttpError";
    this.status = status;
  }
}

class UpstreamTimeoutError extends Error {
  constructor() {
    super("Upstream request timed out");
    this.name = "UpstreamTimeoutError";
  }
}

class UpstreamPayloadError extends Error {
  constructor() {
    super("Upstream response was malformed");
    this.name = "UpstreamPayloadError";
  }
}

const SOURCE = {
  id: "api-maree.fr",
  attribution:
    "Données de marée fournies par api-maree.fr, calculées à partir de composantes harmoniques Ifremer / PREVIMER, sous licence Creative Commons Attribution 4.0 International.",
  license: "CC BY 4.0",
  official: false,
  navigation: false,
} as const;

export async function handleTidesRequest(
  request: Request,
  dependencies: HandlerDependencies = {},
): Promise<Response> {
  try {
    const query = parseQuery(request, dependencies.now ?? new Date());
    if (query.port.siteId === null) {
      throw new ApiError(
        "unsupported_port",
        "Capbreton n’est pas encore disponible auprès de la source de données.",
        422,
      );
    }

    const apiKey = dependencies.apiKey?.trim();
    if (!apiKey) {
      throw new ApiError(
        "service_unconfigured",
        "Le service de marée n’est pas encore configuré.",
        503,
      );
    }

    const provider = await fetchProviderData(query, apiKey, {
      fetch: dependencies.fetch ?? globalThis.fetch,
      timeoutMs: dependencies.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });

    const extrema = normalizeExtrema(provider.extrema, query);
    const levels = normalizeLevels(provider.levels, query);

    return jsonResponse(
      {
        source: SOURCE,
        port: {
          id: query.port.id,
          name: query.port.name,
          siteId: query.port.siteId,
        },
        timezone: TIMEZONE,
        period: {
          start: query.start,
          endInclusive: query.endInclusive,
          days: query.days,
        },
        unit: "m",
        stepMinutes: STEP_MINUTES,
        extrema,
        levels,
      },
      200,
      SUCCESS_CACHE_CONTROL,
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return errorResponse(error.code, error.message, error.status);
    }
    if (error instanceof UpstreamTimeoutError) {
      return errorResponse(
        "upstream_timeout",
        "La source de données met trop de temps à répondre.",
        504,
      );
    }
    if (error instanceof UpstreamHttpError && error.status === 429) {
      return errorResponse(
        "upstream_rate_limited",
        "La source de données est momentanément très sollicitée.",
        503,
        { "retry-after": "60" },
      );
    }

    return errorResponse(
      "upstream_unavailable",
      "Les données de marée sont momentanément indisponibles.",
      502,
    );
  }
}

function parseQuery(request: Request, now: Date): ParsedQuery {
  const params = new URL(request.url).searchParams;
  const portId = requiredSingleParam(params, "port");
  const start = requiredSingleParam(params, "start");
  const daysValue = requiredSingleParam(params, "days");

  if (!Object.prototype.hasOwnProperty.call(TIDE_PORTS, portId)) {
    throw new ApiError(
      "invalid_port",
      "Le port demandé ne fait pas partie des ports disponibles.",
      400,
    );
  }

  const startDay = parseStrictDate(start);
  if (startDay === null) {
    throw new ApiError(
      "invalid_request",
      "Le paramètre start doit être une date au format YYYY-MM-DD.",
      400,
    );
  }

  if (!/^[1-7]$/.test(daysValue)) {
    throw new ApiError(
      "invalid_request",
      "Le paramètre days doit être un entier compris entre 1 et 7.",
      400,
    );
  }

  const days = Number(daysValue);
  const endInclusiveDay = startDay + days - 1;
  const today = parseStrictDate(dateInParis(now));
  if (today === null) {
    throw new ApiError(
      "upstream_unavailable",
      "La période demandée ne peut pas être calculée.",
      502,
    );
  }

  if (startDay < today - 30 || endInclusiveDay > today + 30) {
    throw new ApiError(
      "date_out_of_range",
      "La période doit rester comprise entre 30 jours avant et 30 jours après aujourd’hui.",
      422,
    );
  }

  return {
    port: TIDE_PORTS[portId as TidePortId],
    start,
    endInclusive: formatEpochDay(endInclusiveDay),
    endExclusive: formatEpochDay(endInclusiveDay + 1),
    days,
  };
}

function requiredSingleParam(params: URLSearchParams, name: string): string {
  const values = params.getAll(name);
  if (values.length !== 1 || values[0] === "") {
    throw new ApiError(
      "invalid_request",
      `Le paramètre ${name} est obligatoire et ne doit apparaître qu’une fois.`,
      400,
    );
  }
  return values[0];
}

function parseStrictDate(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return Math.floor(date.getTime() / DAY_MS);
}

function formatEpochDay(epochDay: number): string {
  return new Date(epochDay * DAY_MS).toISOString().slice(0, 10);
}

function dateInParis(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchProviderData(
  query: ParsedQuery,
  apiKey: string,
  options: { fetch: typeof globalThis.fetch; timeoutMs: number },
): Promise<{ extrema: unknown; levels: unknown }> {
  const extremaUrl = providerUrl("/tide-extrema", {
    site: query.port.siteId!,
    from: query.start,
    to: query.endInclusive,
    tz: TIMEZONE,
    key: apiKey,
  });
  const levelsUrl = providerUrl("/water-levels", {
    site: query.port.siteId!,
    from: `${query.start}T00:00`,
    to: `${query.endExclusive}T00:00`,
    step: String(STEP_MINUTES),
    tz: TIMEZONE,
    key: apiKey,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const [extrema, levels] = await Promise.all([
      fetchJson(options.fetch, extremaUrl, controller.signal),
      fetchJson(options.fetch, levelsUrl, controller.signal),
    ]);
    return { extrema, levels };
  } catch (error) {
    if (controller.signal.aborted) throw new UpstreamTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function providerUrl(pathname: string, params: Record<string, string>): URL {
  const url = new URL(pathname, API_BASE_URL);
  url.search = new URLSearchParams(params).toString();
  return url;
}

async function fetchJson(
  fetcher: typeof globalThis.fetch,
  url: URL,
  signal: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: { accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw new UpstreamTimeoutError();
    throw error;
  }

  if (!response.ok) throw new UpstreamHttpError(response.status);

  try {
    return await response.json();
  } catch {
    throw new UpstreamPayloadError();
  }
}

function normalizeExtrema(payload: unknown, query: ParsedQuery) {
  const root = requireRecord(payload);
  if (!Array.isArray(root.data)) throw new UpstreamPayloadError();

  const normalized: Array<{
    date: string;
    time: string;
    type: "high" | "low";
    heightM: number;
    coefficient: number | null;
  }> = [];

  for (const rawDay of root.data) {
    const day = requireRecord(rawDay);
    if (typeof day.date !== "string" || !Array.isArray(day.extrema)) {
      throw new UpstreamPayloadError();
    }
    if (day.date < query.start || day.date > query.endInclusive) continue;

    for (const rawExtremum of day.extrema) {
      const extremum = requireRecord(rawExtremum);
      if (
        (extremum.type !== "PM" && extremum.type !== "BM") ||
        typeof extremum.time !== "string" ||
        !isStrictTime(extremum.time) ||
        !isFiniteNumber(extremum.height)
      ) {
        throw new UpstreamPayloadError();
      }

      normalized.push({
        date: day.date,
        time: extremum.time,
        type: extremum.type === "PM" ? "high" : "low",
        heightM: extremum.height,
        coefficient:
          extremum.type === "PM" && isFiniteNumber(extremum.coef)
            ? Math.round(extremum.coef)
            : null,
      });
    }
  }

  return normalized.sort((left, right) =>
    `${left.date}T${left.time}`.localeCompare(`${right.date}T${right.time}`),
  );
}

function normalizeLevels(payload: unknown, query: ParsedQuery) {
  const root = requireRecord(payload);
  if (!Array.isArray(root.data)) throw new UpstreamPayloadError();

  const startKey = `${query.start}T00:00`;
  const endKey = `${query.endExclusive}T00:00`;
  const normalized: Array<{ time: string; heightM: number }> = [];

  for (const rawPoint of root.data) {
    const point = requireRecord(rawPoint);
    if (typeof point.time !== "string" || !isFiniteNumber(point.height)) {
      throw new UpstreamPayloadError();
    }

    const localKey = point.time.slice(0, 16);
    if (localKey < startKey || localKey >= endKey) continue;
    normalized.push({ time: point.time, heightM: point.height });
  }

  normalized.sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
  return normalized.slice(0, Math.min(query.days * 144, MAX_LEVEL_POINTS));
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new UpstreamPayloadError();
  }
  return value as Record<string, unknown>;
}

function isStrictTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
  headers?: HeadersInit,
): Response {
  return jsonResponse(
    { error: { code, message } },
    status,
    ERROR_CACHE_CONTROL,
    headers,
  );
}

function jsonResponse(
  body: unknown,
  status: number,
  cacheControl: string,
  additionalHeaders?: HeadersInit,
): Response {
  const headers = new Headers(additionalHeaders);
  headers.set("cache-control", cacheControl);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-content-type-options", "nosniff");

  return new Response(JSON.stringify(body), { status, headers });
}
