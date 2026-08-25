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
  assert.match(html, /aria-label="Application Marée"/);
  assert.match(html, /Heure explorée/);
  assert.match(html, /En direct/);
  assert.match(html, /id="time-slider"[^>]*type="range"/);
  assert.match(html, /id="time-slider"[^>]*max="1439"/);
  assert.match(html, /id="time-slider"[^>]*step="1"/);
  assert.match(html, /aria-valuetext="12:00, journée, hauteur/);
  assert.match(html, /class="surface-screen phase-day scene-ready"/);
  assert.match(html, /class="sky-night"/);
  assert.match(html, /class="celestial moon"/);
  assert.match(html, /class="water-night"/);
  assert.match(html, /class="water-slosh"/);
  assert.equal((html.match(/class="water-spray /g) ?? []).length, 3);
  assert.match(html, /class="beach-scene"/);
  assert.match(html, /class="coast-band"/);
  assert.match(html, /class="lighthouse"/);
  // Le phare a été réécrit : un seul faisceau est devenu deux, gauche et
  // droite, pour que la rotation s'éteigne sur la moitié arrière du tour au lieu
  // d'osciller comme un essuie-glace.
  assert.match(html, /class="lighthouse-beam beam-left"/);
  assert.match(html, /class="lighthouse-beam beam-right"/);
  assert.match(html, /class="beachgoers"/);
  assert.doesNotMatch(html, /shore-foam/);
  assert.equal((html.match(/class="rivulet rivulet-/g) ?? []).length, 3);
  assert.equal((html.match(/class="shell shell-/g) ?? []).length, 4);
  // Les oiseaux de rive et de vol ont été remplacés par deux vols dans le ciel,
  // un proche et un lointain, qui traversent l'écran au lieu de rester posés.
  assert.match(html, /class="sky-flock"/);
  assert.match(html, /class="sky-flock sky-flock-far"/);
  assert.match(html, /class="sky-bird"/);
  assert.doesNotMatch(html, /boat|bateau/i);
  assert.match(html, /class="seabed"/);
  // Les dunes, rochers et coquillages du fond marin sont désormais peints dans
  // l'illustration seabed-v1.webp : ne subsistent en CSS que la lumière et le
  // crabe, les deux seules choses qui bougent.
  assert.match(html, /class="seabed-caustics"/);
  assert.match(html, /class="seabed-crab"/);
  assert.match(html, /aria-label="Lecture automatique de la journée"/);
  assert.match(html, /class="slider-stack"/);
  assert.match(html, /class="controls-footer"/);
  assert.match(html, /Horaires des marées/);
  assert.match(html, /aria-labelledby="today-tides-title"/);
  assert.equal((html.match(/class="event /g) ?? []).length, 4);
  assert.match(html, /Glisser · /);
  assert.match(html, /Afficher les prévisions des 7 prochains jours/);
  // L'écran des prévisions portait deux titres pour une page — « PRÉVISIONS »
  // puis « Les marées à venir ». Le second a été retiré ; ce que cette ligne
  // vérifie, c'est que l'écran est rendu côté serveur avec un titre qui le
  // nomme, donc elle contrôle celui qui reste.
  assert.match(html, /id="forecast-section-title"/);
  assert.match(html, /<dialog[^>]*id="port-picker"/);
  assert.match(html, /<dialog[^>]*id="shom-tide-dialog"/);
  assert.match(html, /Choisir un port/);
  assert.equal((html.match(/class="port-row /g) ?? []).length, 8);
  assert.match(html, /Saint-Jean-de-Luz/);
  assert.match(html, /Horaires officiels SHOM/);
  assert.match(html, /Prévisions indicatives — non destinées à la navigation/);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/);
});

test("keeps the mobile experience accessible and self-contained", async () => {
  const [page, css, layout, pwaRegistration, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/pwa-registration.tsx", import.meta.url), "utf8"),
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
  assert.match(page, /drag\.axis = "vertical";\s+if \(!event\.currentTarget\.hasPointerCapture/s);
  assert.doesNotMatch(page, /handleScreenSwipeStart[\s\S]*?classList\.add\("is-dragging"\);\s+event\.currentTarget\.setPointerCapture/);
  assert.match(page, /data-no-screen-swipe/);
  assert.match(page, /data-screen-swipe-handle/);
  assert.match(page, /drag\.startedFromForecastHandle && deltaY <= -12/);
  assert.match(page, /new AbortController\(\)/);
  assert.match(page, /\/api\/tides\?port=/);
  assert.match(page, /ShomTideWidget/);
  assert.match(page, /function returnToLive\(\)/);
  assert.match(page, /function getParisClock\(/);
  assert.match(page, /timeZone:\s*"Europe\/Paris"/);
  assert.doesNotMatch(page, /now\.getHours\(\)/);
  assert.match(page, /setIsFollowingLive\(false\)/);
  assert.match(page, /useState\(0\)/);
  assert.match(page, /disturbanceStartedAtRef/);
  assert.match(page, /const frameInterval = 1000 \/ 30/);
  assert.match(page, /requestAnimationFrame\(animate\)/);
  assert.doesNotMatch(page, /sceneReady|scene-pending/);
  assert.match(page, /"--beach-exposure"/);
  assert.match(page, /"--sand-dryness"/);
  assert.match(page, /"--visitor-presence"/);
  assert.match(page, /data-tide-scene=\{tideScene\}/);
  assert.match(page, /data-beach-life=\{beachLife\}/);
  assert.match(page, /data-bird-state=\{birdState\}/);
  assert.doesNotMatch(page, /boat|bateau/i);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.ui-icon-arrow-down::before/);
  assert.match(css, /\.ui-icon-arrow-down::after/);
  assert.match(css, /@keyframes wave-disturb-front/);
  assert.doesNotMatch(css, /boat|bateau/i);
  assert.doesNotMatch(css, /\.water\s*\{\s*--water-shift/);
  assert.match(css, /\.surface-screen:has\(\.water\.is-disturbed\) \.shoreline-track\s*\{[^}]*transition-duration:\s*460ms/s);
  // L'animation de l'eau a été réduite à l'écume : les variables --wave-front-*
  // et --wave-back-* ont disparu au profit de --foam-x/y/scale, que la boucle
  // rAF de page.tsx pose sur .water et que .water-foam consomme.
  assert.match(css, /\.water-foam\s*\{[^}]*var\(--foam-x/s);
  assert.match(css, /\.water-foam\s*\{[^}]*z-index:\s*3/s);
  // Les oiseaux ne sont plus éteints par une classe de phase mais fondus en
  // continu sur --daylight, si bien qu'ils s'effacent au crépuscule au lieu de
  // disparaître d'un coup à une heure précise.
  assert.match(css, /\.sky-flock\s*\{[^}]*opacity:\s*calc\(var\(--daylight\)/s);
  // Le balayage unique a été remplacé par deux animations distinctes, une par
  // faisceau, plus l'éclat de la lanterne : c'est ce qui permet au phare de
  // s'éteindre sur la moitié arrière du tour au lieu de balayer d'avant en
  // arrière comme un essuie-glace.
  assert.match(css, /@keyframes beam-left/);
  assert.match(css, /@keyframes beam-right/);
  assert.match(css, /@keyframes lamp-pulse/);
  assert.match(css, /@keyframes beachgoers-arrive/);
  assert.match(css, /@keyframes crab-scuttle/);
  assert.match(css, /\.underwater-light\s*\{[^}]*filter:\s*blur\(20px\)/s);
  assert.doesNotMatch(css, /\.underwater-light\s*\{[^}]*clip-path/s);
  assert.doesNotMatch(css, /\.seabed::before\s*\{[^}]*clip-path/s);
  assert.match(css, /@keyframes live-pulse/);
  assert.match(css, /\.live-button/);
  assert.match(css, /\.event\s*\{[^}]*min-height:\s*44px/s);
  // L'heure de marée est la même donnée sur les deux écrans et doit avoir une
  // seule taille. Elle était en pixels avant la bascule vers Dynamic Type, et
  // 14,5px d'un côté contre 14px de l'autre : pinnées ensemble plutôt qu'à un
  // nombre, pour qu'elles puissent être retouchées mais plus diverger.
  const tailleHeure = (selecteur) =>
    css.match(new RegExp(`${selecteur}\\s*\\{[^}]*font-size:\\s*([\\d.]+)rem`, "s"))?.[1];
  assert.ok(tailleHeure("\\.event-copy strong"), ".event-copy strong n'a pas de taille relative");
  assert.equal(
    tailleHeure("\\.event-copy strong"),
    tailleHeure("\\.forecast-tide strong"),
    "l'heure de marée est réglée à deux tailles différentes selon l'écran",
  );
  assert.match(css, /\.controls-footer/);
  assert.match(css, /\.forecast-button::before\s*\{[^}]*width:\s*34px/s);
  assert.match(css, /@keyframes seabed-arrive/);
  assert.match(css, /touch-action:\s*pan-x pinch-zoom/);
  assert.match(css, /@keyframes underwater-content-in/);
  assert.match(css, /@keyframes port-row-in/);
  assert.match(css, /\.surface-screen\.is-dark \.controls/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /min-height:\s*44px/);
  // Les insets sont lus une seule fois dans :root vers --sa-*, puis consommés
  // par var() partout ailleurs — c'est ce qui permet à un banc d'essai de leur
  // substituer les valeurs d'un iPhone connu, ce qu'env() ne permet pas. Ce qui
  // est gardé ici : qu'ils viennent bien d'env() en dernier ressort, sans quoi
  // les variables deviendraient des nombres morts, et qu'ils soient consommés.
  assert.match(css, /--sa-top:\s*env\(safe-area-inset-top/);
  assert.match(css, /--sa-bottom:\s*env\(safe-area-inset-bottom/);
  assert.match(css, /var\(--sa-top\)/);
  assert.match(css, /var\(--sa-bottom\)/);
  assert.match(css, /overflow:\s*clip/);
  assert.match(css, /\.port-dialog::backdrop/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(pwaRegistration, /controllerchange/);
  assert.match(pwaRegistration, /visibilitychange/);
  assert.match(pwaRegistration, /window\.location\.reload\(\)/);
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
  // Épingler le littéral « maree-shell-v2 » ne disait rien d'utile et tombait à
  // chaque incrément légitime. Ce qui compte est double : que les caches soient
  // versionnés, et qu'un changement de version évince réellement les anciens —
  // sans quoi le numéro ne serait qu'une décoration et les caches périmés
  // resteraient sur l'appareil.
  assert.match(serviceWorker, /const SHELL_CACHE = "maree-shell-v\d+"/);
  assert.match(serviceWorker, /const ASSET_CACHE = "maree-assets-v\d+"/);
  assert.match(serviceWorker, /key\.startsWith\(CACHE_PREFIX\)/);
  assert.match(serviceWorker, /key !== SHELL_CACHE/);
  assert.match(serviceWorker, /key !== ASSET_CACHE/);
  assert.match(serviceWorker, /caches\.delete\(key\)/);
  assert.match(serviceWorker, /const SHELL_FILES = \["\/offline\.html"\]/);
  assert.doesNotMatch(serviceWorker, /cache\.put\("\/"/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/assets\/"\)/);
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
