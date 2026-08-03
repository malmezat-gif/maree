import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const componentUrl = new URL("../app/shom-tide-widget.tsx", import.meta.url);

test("la vignette SHOM associe exactement les huit ports de l’application", async () => {
  const source = await readFile(componentUrl, "utf8");
  const expectedMappings = [
    'biarritz: { label: "Biarritz", code: "BOUCAU-BAYONNE" }',
    '"saint-jean-de-luz": { label: "Saint-Jean-de-Luz", code: "SOCOA" }',
    'capbreton: { label: "Capbreton", code: "CAPBRETON" }',
    'arcachon: { label: "Arcachon", code: "ARCACHON_EYRAC" }',
    '"la-rochelle": { label: "La Rochelle", code: "LA_ROCHELLE-PALLICE" }',
    '"les-sables": { label: "Les Sables-d’Olonne", code: "LES_SABLES_D_OLONNE" }',
    'brest: { label: "Brest", code: "BREST" }',
    '"saint-malo": { label: "Saint-Malo", code: "SAINT-MALO" }',
  ];

  for (const mapping of expectedMappings) {
    assert.ok(source.includes(mapping), `mapping absent : ${mapping}`);
  }
});

test("la vignette officielle reste isolée dans une iframe sandboxée", async () => {
  const source = await readFile(componentUrl, "utf8");

  assert.match(source, /^"use client";/);
  assert.match(source, /https:\/\/services\.data\.shom\.fr/);
  assert.match(
    source,
    /\/hdm\/vignette\/grande\/\$\{encodeURIComponent\(portCode\)\}\?locale=fr/,
  );
  assert.match(source, /srcDoc=\{buildShomWidgetDocument\(port\.code\)\}/);
  assert.match(
    source,
    /sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"/,
  );
  assert.doesNotMatch(source, /allow-same-origin/);
  assert.doesNotMatch(source, /contentWindow|contentDocument|postMessage/);
  assert.match(source, /title=\{title\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Horaires et coefficients officiels fournis par le/);
  assert.match(source, /https:\/\/maree\.shom\.fr\//);
});
