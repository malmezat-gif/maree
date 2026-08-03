import assert from "node:assert/strict";
import test from "node:test";
import { handleTidesRequest } from "../lib/tides-api.ts";

const NOW = new Date("2026-08-03T10:00:00Z");
const FAKE_KEY = "unit-test-key-not-a-secret";

function request(query) {
  return new Request(`https://maree.example/api/tides?${query}`);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("normalizes extrema and water levels without exposing the provider key", async () => {
  const calls = [];
  const fetchMock = async (input) => {
    const url = new URL(input);
    calls.push(url);

    if (url.pathname === "/tide-extrema") {
      return json({
        data: [
          {
            date: "2026-08-03",
            extrema: [
              { type: "BM", time: "07:41", height: 0.82 },
              { type: "PM", time: "13:52", height: 4.21, coef: 79 },
            ],
          },
          {
            date: "2026-08-04",
            extrema: [
              { type: "BM", time: "08:16", height: 0.91 },
              { type: "PM", time: "14:27", height: 4.08, coef: 74 },
            ],
          },
        ],
      });
    }

    return json({
      data: [
        { time: "2026-08-03T00:00:00+02:00", height: 2.1 },
        { time: "2026-08-03T00:10:00+02:00", height: 2.2 },
        { time: "2026-08-05T00:00:00+02:00", height: 2.3 },
      ],
    });
  };

  const response = await handleTidesRequest(
    request("port=biarritz&start=2026-08-03&days=2"),
    { apiKey: FAKE_KEY, fetch: fetchMock, now: NOW },
  );
  const bodyText = await response.text();
  const body = JSON.parse(bodyText);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /public/);
  assert.match(response.headers.get("cache-control") ?? "", /s-maxage=21600/);
  assert.match(response.headers.get("cache-control") ?? "", /stale-while-revalidate=86400/);
  assert.equal(body.port.id, "biarritz");
  assert.equal(body.port.siteId, "boucau-bayonne-biarritz");
  assert.deepEqual(body.period, {
    start: "2026-08-03",
    endInclusive: "2026-08-04",
    days: 2,
  });
  assert.equal(body.timezone, "Europe/Paris");
  assert.equal(body.stepMinutes, 10);
  assert.deepEqual(body.extrema[0], {
    date: "2026-08-03",
    time: "07:41",
    type: "low",
    heightM: 0.82,
    coefficient: null,
  });
  assert.deepEqual(body.extrema[1], {
    date: "2026-08-03",
    time: "13:52",
    type: "high",
    heightM: 4.21,
    coefficient: 79,
  });
  assert.equal(body.levels.length, 2);
  assert.equal(body.source.official, false);
  assert.equal(body.source.navigation, false);
  assert.doesNotMatch(bodyText, new RegExp(FAKE_KEY));

  assert.equal(calls.length, 2);
  const extremaCall = calls.find((url) => url.pathname === "/tide-extrema");
  const levelsCall = calls.find((url) => url.pathname === "/water-levels");
  assert.equal(extremaCall.searchParams.get("site"), "boucau-bayonne-biarritz");
  assert.equal(extremaCall.searchParams.get("from"), "2026-08-03");
  assert.equal(extremaCall.searchParams.get("to"), "2026-08-04");
  assert.equal(extremaCall.searchParams.get("tz"), "Europe/Paris");
  assert.equal(levelsCall.searchParams.get("from"), "2026-08-03T00:00");
  assert.equal(levelsCall.searchParams.get("to"), "2026-08-05T00:00");
  assert.equal(levelsCall.searchParams.get("step"), "10");
});

test("rejects Capbreton before contacting the provider", async () => {
  let called = false;
  const response = await handleTidesRequest(
    request("port=capbreton&start=2026-08-03&days=1"),
    {
      apiKey: FAKE_KEY,
      fetch: async () => {
        called = true;
        return json({});
      },
      now: NOW,
    },
  );

  assert.equal(response.status, 422);
  assert.equal(called, false);
  assert.deepEqual(await response.json(), {
    error: {
      code: "unsupported_port",
      message: "Capbreton n’est pas encore disponible auprès de la source de données.",
    },
  });
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("validates the port, strict date, day count, duplicates and provider window", async (t) => {
  const cases = [
    ["port=inconnu&start=2026-08-03&days=1", 400, "invalid_port"],
    ["port=biarritz&start=2026-02-30&days=1", 400, "invalid_request"],
    ["port=biarritz&start=2026-08-03&days=8", 400, "invalid_request"],
    ["port=biarritz&start=2026-08-03&days=1&days=2", 400, "invalid_request"],
    ["port=biarritz&start=2026-09-02&days=2", 422, "date_out_of_range"],
  ];

  for (const [query, expectedStatus, expectedCode] of cases) {
    await t.test(query, async () => {
      const response = await handleTidesRequest(request(query), { now: NOW });
      assert.equal(response.status, expectedStatus);
      assert.equal((await response.json()).error.code, expectedCode);
    });
  }
});

test("reports a missing server-side key without attempting a request", async () => {
  let called = false;
  const response = await handleTidesRequest(
    request("port=brest&start=2026-08-03&days=1"),
    {
      fetch: async () => {
        called = true;
        return json({});
      },
      now: NOW,
    },
  );

  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "service_unconfigured");
  assert.equal(called, false);
});

test("limits a seven-day response to 1008 ten-minute water levels", async () => {
  const levels = Array.from({ length: 1_020 }, (_, index) => ({
    time: `2026-08-${String(3 + Math.floor(index / 144)).padStart(2, "0")}T${String(
      Math.floor((index % 144) / 6),
    ).padStart(2, "0")}:${String(((index % 144) % 6) * 10).padStart(2, "0")}:00+02:00`,
    height: 2 + index / 1_000,
  }));
  const fetchMock = async (input) =>
    new URL(input).pathname === "/tide-extrema"
      ? json({ data: [] })
      : json({ data: levels });

  const response = await handleTidesRequest(
    request("port=saint-malo&start=2026-08-03&days=7"),
    { apiKey: FAKE_KEY, fetch: fetchMock, now: NOW },
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.levels.length, 1008);
});

test("turns provider timeouts and rate limits into stable, cache-safe errors", async (t) => {
  await t.test("timeout", async () => {
    const fetchMock = async (_input, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      });
    const response = await handleTidesRequest(
      request("port=arcachon&start=2026-08-03&days=1"),
      { apiKey: FAKE_KEY, fetch: fetchMock, now: NOW, timeoutMs: 5 },
    );

    assert.equal(response.status, 504);
    assert.equal((await response.json()).error.code, "upstream_timeout");
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  await t.test("rate limit", async () => {
    const response = await handleTidesRequest(
      request("port=la-rochelle&start=2026-08-03&days=1"),
      { apiKey: FAKE_KEY, fetch: async () => json({}, 429), now: NOW },
    );

    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, "upstream_rate_limited");
    assert.equal(response.headers.get("retry-after"), "60");
  });
});
