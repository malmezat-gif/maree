"use client";

import { useState, type CSSProperties } from "react";

export const SHOM_PORTS = {
  biarritz: { label: "Biarritz", code: "BOUCAU-BAYONNE" },
  "saint-jean-de-luz": { label: "Saint-Jean-de-Luz", code: "SOCOA" },
  capbreton: { label: "Capbreton", code: "CAPBRETON" },
  arcachon: { label: "Arcachon", code: "ARCACHON_EYRAC" },
  "la-rochelle": { label: "La Rochelle", code: "LA_ROCHELLE-PALLICE" },
  "les-sables": { label: "Les Sables-d’Olonne", code: "LES_SABLES_D_OLONNE" },
  brest: { label: "Brest", code: "BREST" },
  "saint-malo": { label: "Saint-Malo", code: "SAINT-MALO" },
} as const;

export type ShomPortId = keyof typeof SHOM_PORTS;

type ShomTideWidgetProps = {
  portId: ShomPortId;
  className?: string;
};

const SHOM_WIDGET_ORIGIN = "https://services.data.shom.fr";
const SHOM_PORTAL_URL = "https://maree.shom.fr/";

const frameStyle: CSSProperties = {
  display: "block",
  width: "100%",
  aspectRatio: "3 / 4",
  border: 0,
  borderRadius: 22,
  background: "#f7fafc",
};

const loadingStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "grid",
  placeItems: "center",
  padding: 24,
  borderRadius: 22,
  color: "#23445a",
  background: "linear-gradient(180deg, #f7fbfd 0%, #e6f2f6 100%)",
  fontSize: 14,
  textAlign: "center",
  pointerEvents: "none",
};

function buildShomWidgetDocument(portCode: string) {
  const widgetUrl = `${SHOM_WIDGET_ORIGIN}/hdm/vignette/grande/${encodeURIComponent(portCode)}?locale=fr`;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        width: 100%;
        height: 100%;
        margin: 0;
        overflow: hidden;
        background: transparent;
      }

      iframe {
        display: block;
        width: 675px !important;
        height: 900px !important;
        border: 0 !important;
        transform-origin: top left;
      }
    </style>
  </head>
  <body>
    <script src="${widgetUrl}"></script>
    <script>
      (() => {
        const widgetFrame = document.querySelector("iframe");
        if (!widgetFrame) return;

        const fitWidget = () => {
          const scale = Math.min(1, window.innerWidth / 675);
          widgetFrame.style.transform = "scale(" + scale + ")";
        };

        fitWidget();
        window.addEventListener("resize", fitWidget, { passive: true });
      })();
    </script>
  </body>
</html>`;
}

export function ShomTideWidget({ portId, className }: ShomTideWidgetProps) {
  const port = SHOM_PORTS[portId];
  const [loadedPortCode, setLoadedPortCode] = useState<string | null>(null);
  const isLoaded = loadedPortCode === port.code;
  const title = `Horaires officiels des marées du SHOM — ${port.label}`;

  return (
    <figure
      className={className}
      data-shom-port={port.code}
      aria-busy={!isLoaded}
      style={{ width: "100%", maxWidth: 675, margin: "0 auto" }}
    >
      <div style={{ position: "relative", isolation: "isolate" }}>
        <iframe
          key={port.code}
          title={title}
          srcDoc={buildShomWidgetDocument(port.code)}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
          onLoad={() => setLoadedPortCode(port.code)}
          style={frameStyle}
        />

        {!isLoaded && (
          <div role="status" aria-live="polite" style={loadingStyle}>
            Chargement des horaires officiels du SHOM pour {port.label}…
          </div>
        )}
      </div>

      <figcaption
        style={{
          marginTop: 10,
          color: "rgba(16, 43, 58, 0.68)",
          fontSize: 12,
          lineHeight: 1.4,
          textAlign: "center",
        }}
      >
        Horaires et coefficients officiels fournis par le{" "}
        <a
          href={SHOM_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", fontWeight: 700 }}
        >
          SHOM
        </a>
        .
      </figcaption>
    </figure>
  );
}
