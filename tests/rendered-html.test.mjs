import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getDayCycle } from "../app/day-cycle.ts";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Marée experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Marée — La mer au fil du temps<\/title>/i);
  assert.match(html, /rel="manifest" href="http:\/\/localhost(?::3000)?\/manifest\.webmanifest"/);
  assert.match(html, /rel="apple-touch-icon"[^>]*href="http:\/\/localhost(?::3000)?\/apple-touch-icon\.png"/);
  assert.match(html, /property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/);
  assert.match(html, /aria-label="Prototype de l’application Marée"/);
  assert.match(html, /Heure simulée/);
  assert.match(html, /id="time-slider"[^>]*type="range"/);
  assert.match(html, /id="time-slider"[^>]*step="1"/);
  assert.match(html, /aria-valuetext="12:00, journée, hauteur/);
  assert.match(html, /class="surface-screen phase-day scene-pending"/);
  assert.match(html, /class="sky-night"/);
  assert.match(html, /class="celestial moon"/);
  assert.match(html, /class="water-night"/);
  assert.match(html, /class="water-slosh"/);
  assert.equal((html.match(/class="water-spray /g) ?? []).length, 3);
  assert.match(html, /class="seabed"/);
  assert.equal((html.match(/class="seagrass /g) ?? []).length, 3);
  assert.match(html, /aria-label="Lecture automatique de la journée"/);
  assert.equal((html.match(/class="event /g) ?? []).length, 4);
  assert.match(html, /Voir les prochains jours/);
  assert.match(html, /Les marées à venir/);
  assert.match(html, /<dialog[^>]*id="port-picker"/);
  assert.match(html, /Choisir un port/);
  assert.equal((html.match(/class="port-row /g) ?? []).length, 8);
  assert.match(html, /Saint-Jean-de-Luz/);
  assert.match(html, /Simulation visuelle · données d’exemple/);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/);
});

test("keeps the mobile experience accessible and self-contained", async () => {
  const [page, css, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /htmlFor="time-slider"/);
  assert.match(page, /Choisir l’heure de la journée/);
  assert.match(page, /aria-pressed=\{isActive\}/);
  assert.match(page, /inert=\{isUnderwater \? true : undefined\}/);
  assert.match(page, /showModal\(\)/);
  assert.match(page, /maree\.selected-port/);
  assert.match(page, /normalizeSearch/);
  assert.match(page, /Aucun port trouvé/);
  assert.match(page, /aria-haspopup="dialog"/);
  assert.match(page, /"--moonlight"/);
  assert.match(page, /aria-labelledby="forecast-section-title"/);
  assert.match(page, /aria-current=\{index === 0 \? "date" : undefined\}/);
  assert.match(page, /backButtonRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /focus\(\{ preventScroll: true \}\)/);
  assert.match(page, /phoneRef\.current\.scrollTop = 0/);
  assert.match(page, /function agitateWater\(\)/);
  assert.match(page, /function handleScreenSwipeStart/);
  assert.match(page, /function finishScreenSwipe/);
  assert.match(page, /setPointerCapture\(event\.pointerId\)/);
  assert.match(page, /data-no-screen-swipe/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.ui-icon-arrow-down::before/);
  assert.match(css, /\.ui-icon-arrow-down::after/);
  assert.match(css, /@keyframes wave-disturb-front/);
  assert.match(css, /@keyframes boat-toss/);
  assert.match(css, /@keyframes seabed-arrive/);
  assert.match(css, /touch-action:\s*pan-x pinch-zoom/);
  assert.match(css, /@keyframes underwater-content-in/);
  assert.match(css, /@keyframes port-row-in/);
  assert.match(css, /\.surface-screen\.phase-night \.controls/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /overflow:\s*clip/);
  assert.match(css, /\.port-dialog::backdrop/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.doesNotMatch(packageJson, /lucide-react|react-loading-skeleton/);
});

test("ships an installable mobile app shell", async () => {
  const [manifestSource, serviceWorker, offlinePage, icon] = await Promise.all([
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/offline.html", import.meta.url), "utf8"),
    readFile(new URL("../public/icons/maree-192.png", import.meta.url)),
  ]);
  const manifest = JSON.parse(manifestSource);

  assert.equal(manifest.name, "Marée — La mer au fil du temps");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.scope, "/");
  assert.ok(manifest.icons.some((entry) => entry.sizes === "512x512"));
  assert.ok(manifest.icons.some((entry) => entry.purpose === "maskable"));
  assert.match(serviceWorker, /maree-shell-v1/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(offlinePage, /La mer attend le réseau/);
  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
});

test("keeps the day and night cycle continuous and bounded", () => {
  const phaseBoundaries = new Map([
    [299, "night"],
    [300, "dawn"],
    [449, "dawn"],
    [450, "day"],
    [1019, "day"],
    [1020, "dusk"],
    [1199, "dusk"],
    [1200, "night"],
  ]);

  for (const [minutes, phase] of phaseBoundaries) {
    assert.equal(getDayCycle(minutes).phase, phase);
  }

  for (let minutes = 0; minutes < 1440; minutes += 15) {
    const cycle = getDayCycle(minutes);
    for (const key of ["daylight", "night", "dawn", "dusk", "twilight", "moonlight"]) {
      assert.ok(cycle[key] >= 0 && cycle[key] <= 1, `${key} hors limites à ${minutes} min`);
    }
    for (const key of ["sunX", "sunY", "moonX", "moonY"]) {
      assert.ok(Number.isFinite(cycle[key]), `${key} invalide à ${minutes} min`);
    }
  }

  assert.ok(Math.abs(getDayCycle(1080).moonlight) < 1e-9);
  assert.ok(Math.abs(getDayCycle(360).moonlight) < 1e-9);
  assert.ok(getDayCycle(0).moonlight > 0.95);
  assert.deepEqual(getDayCycle(1440), getDayCycle(0));
});
