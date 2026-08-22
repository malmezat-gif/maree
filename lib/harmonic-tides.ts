/**
 * Prédiction de marée par analyse harmonique, hors ligne.
 *
 * Ce module est la source de vérité « calcul » de l'app : il ne dépend d'aucun
 * réseau, contrairement à `lib/tides-api.ts` qui interroge un service distant.
 * Les constantes harmoniques des 8 ports sont figées dans
 * `lib/harmonics/stations.json` (jeu TICON-4 / GESLA-4 exposé par la base Neaps).
 */

import createTidePredictor, {
  type HarmonicConstituent,
  type TidePrediction,
} from "@neaps/tide-predictor";

import stationsData from "./harmonics/stations.json" with { type: "json" };

/** Fiche d'un port : constantes harmoniques + repères verticaux. */
type HarmonicStation = {
  /** Nom du marégraphe réel, qui n'est pas toujours celui de la plage visée. */
  station: string;
  sourceId: string;
  latitude: number;
  longitude: number;
  /** Référence des `*AboveChartDatum` ci-dessous (« LAT » pour tous nos ports). */
  chartDatum: string;
  /** Niveau moyen au-dessus du zéro hydrographique, en mètres. */
  mslAboveChartDatum: number;
  /** Pleine mer moyenne de vive-eau au-dessus du zéro hydrographique, en mètres. */
  mhwsAboveChartDatum: number;
  constituents: HarmonicConstituent[];
};

const STATIONS = stationsData as Record<string, HarmonicStation>;

/** Identifiants des ports couverts par le jeu de constantes embarqué. */
export type HarmonicPort =
  | "biarritz"
  | "saint-jean-de-luz"
  | "capbreton"
  | "arcachon"
  | "la-rochelle"
  | "les-sables"
  | "brest"
  | "saint-malo";

/** Une pleine ou basse mer, datée en minutes depuis minuit local. */
export type HarmonicExtremum = {
  minutes: number;
  heightM: number;
  kind: "Pleine mer" | "Basse mer";
};

/** Un point de la courbe de hauteur d'eau. */
export type HarmonicLevel = {
  minutes: number;
  heightM: number;
};

/**
 * Provenance des données, affichée telle quelle sous les prévisions.
 * `official`/`navigation` sont à `false` : ces prédictions ne sont pas celles
 * du SHOM et ne doivent pas servir à la navigation.
 */
export const HARMONIC_SOURCE = {
  id: "ticon-4",
  attribution:
    "Prédictions calculées à partir des constantes harmoniques TICON-4 (analyse harmonique des marégraphes GESLA-4), via la base Neaps, sous licence CC BY 4.0.",
  license: "CC BY 4.0",
  official: false,
  navigation: false,
} as const;

/**
 * Coefficient de marée : c'est une grandeur *nationale* définie à Brest, pas une
 * grandeur locale. On la calcule donc toujours à Brest, quel que soit le port
 * affiché.
 *
 * `BREST_UNIT_M` (unité de hauteur U) est la valeur officielle du SHOM, et il ne
 * faut surtout pas la redériver des datums statistiques de la station TICON :
 * `mhwsAboveChartDatum - mslAboveChartDatum` donne U ≈ 2,80 m, et le coefficient
 * se décale alors d'une dizaine de points par rapport aux annuaires français.
 *
 * Le niveau moyen, lui, se prend bien dans la station — et c'est contre-intuitif,
 * donc mesuré plutôt que supposé. La valeur officielle du SHOM pour Brest est
 * 4,03 m, mais les hauteurs que ce module produit sont référencées au datum de la
 * station TICON, pas à celui du SHOM ; il faut donc soustraire le niveau moyen
 * *de la même référence*, sans quoi on mélange deux verticales.
 *
 * Vérifié sur les 706 pleines mers de Brest en 2026, contre la définition de
 * l'échelle (minimum ~20, vive-eau moyenne 100, maximum ~120, moyenne ~70) :
 *
 *   NM = 4,03  (officiel SHOM)      min=27  max=113  moyenne=74,9
 *   NM = 4,205 (datum station)      min=21  max=108  moyenne=69,2
 *
 * La seconde tombe sur l'échelle, la première décale tout de ~6 points vers le
 * haut. C'est aussi ce que faisait la version en production.
 */
const BREST_UNIT_M = 3.05;
const BREST_MEAN_LEVEL_M = STATIONS.brest.mslAboveChartDatum;

/** Bornes de l'échelle française des coefficients. */
const COEFFICIENT_MIN = 20;
const COEFFICIENT_MAX = 120;

/**
 * Écart maximal, en minutes, entre une pleine mer locale et la pleine mer de
 * Brest à laquelle on attribue son coefficient. Le décalage réel va de quelques
 * minutes (Brest) à un peu plus de deux heures (Saint-Malo), jamais au-delà d'une
 * demi-marée.
 */
const COEFFICIENT_MATCH_TOLERANCE_MIN = 240;

const TIMEZONE = "Europe/Paris";
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

/** Fenêtre de calcul des extrema : minuit − 12 h … minuit + 36 h. */
const EXTREMA_LOOKBEHIND_H = 12;
const EXTREMA_LOOKAHEAD_H = 36;

/** Échantillonnage de la courbe : un point toutes les 10 min sur 24 h. */
const LEVEL_STEP_MINUTES = 10;
const DAY_MINUTES = 1440;

export function isHarmonicPort(id: string): id is HarmonicPort {
  return Object.prototype.hasOwnProperty.call(STATIONS, id);
}

/** Nom du marégraphe utilisé pour ce port, à afficher dans les mentions. */
export function harmonicStationName(port: HarmonicPort): string {
  return STATIONS[port].station;
}

/**
 * Prédicteurs mémoïsés : leur construction précalcule les corrections nodales des
 * 50 composantes, ce qui est trop coûteux pour être refait à chaque rendu.
 */
const predictorCache = new Map<HarmonicPort, TidePrediction>();

function predictorFor(port: HarmonicPort): TidePrediction {
  const cached = predictorCache.get(port);
  if (cached) return cached;

  const station = STATIONS[port];
  /**
   * Les constantes harmoniques sont référencées au NIVEAU MOYEN, alors que les
   * tables de marée françaises le sont au ZÉRO HYDROGRAPHIQUE. La remise à
   * niveau passe obligatoirement par l'option `offset` du prédicteur : elle est
   * appliquée avant la recherche des extrema, donc les hauteurs *et* les
   * horaires restent cohérents. Une addition manuelle après coup fausserait les
   * seuils internes de la librairie.
   *
   * (Note : `@neaps/tide-predictor` 0.11 n'a pas d'option `phaseKey` ; les
   * constantes doivent porter la clé `phase`, ce que fait déjà stations.json.)
   */
  const predictor = createTidePredictor(station.constituents, {
    offset: station.mslAboveChartDatum,
  });

  predictorCache.set(port, predictor);
  return predictor;
}

/**
 * Décalage du fuseau Europe/Paris, en millisecondes, à l'instant donné.
 * On le lit via `Intl` plutôt que de le coder en dur : l'app doit rester juste
 * de part et d'autre des bascules heure d'été / heure d'hiver.
 */
const PARIS_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function parisOffsetMs(instant: Date): number {
  const parts = Object.fromEntries(
    PARIS_PARTS.formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  ) as Record<string, number>;

  // `hour` vaut 24 à minuit sur certains moteurs : le modulo neutralise le cas.
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour % 24,
    parts.minute,
    parts.second,
  );

  return asUtc - instant.getTime();
}

/**
 * Instant UTC correspondant à minuit local à Paris pour un `dateKey`
 * `YYYY-MM-DD`.
 *
 * Deux itérations sont nécessaires : le décalage doit être évalué à l'instant
 * cherché, pas à l'instant de départ. Sans cette reprise, les dates situées
 * juste après un changement d'heure décaleraient toute la journée d'une heure.
 */
function parisMidnight(dateKey: string): Date {
  const utcMidnight = Date.parse(`${dateKey}T00:00:00Z`);
  let candidate = utcMidnight;
  for (let pass = 0; pass < 2; pass += 1) {
    candidate = utcMidnight - parisOffsetMs(new Date(candidate));
  }
  return new Date(candidate);
}

function minutesSince(origin: Date, instant: Date): number {
  return Math.round((instant.getTime() - origin.getTime()) / MINUTE_MS);
}

/**
 * Pleines et basses mers du jour, en minutes depuis minuit local.
 *
 * Le calcul déborde volontairement de part et d'autre de la journée (−12 h /
 * +36 h) : la marée qui « appartient » visuellement au jour affiché peut tomber
 * un peu avant minuit ou un peu après, et l'interface a besoin des voisines pour
 * tracer la courbe et enchaîner les jours. Les `minutes` renvoyées peuvent donc
 * être négatives ou dépasser 1440 — c'est au consommateur de filtrer s'il ne
 * veut que la journée civile.
 */
export function predictExtrema(
  port: HarmonicPort,
  dateKey: string,
): HarmonicExtremum[] {
  const midnight = parisMidnight(dateKey);
  const start = new Date(midnight.getTime() - EXTREMA_LOOKBEHIND_H * HOUR_MS);
  const end = new Date(midnight.getTime() + EXTREMA_LOOKAHEAD_H * HOUR_MS);

  return predictorFor(port)
    .getExtremesPrediction({ start, end })
    .map((extreme) => ({
      minutes: minutesSince(midnight, new Date(extreme.time)),
      heightM: Number(extreme.level.toFixed(2)),
      kind: extreme.high ? ("Pleine mer" as const) : ("Basse mer" as const),
    }))
    .sort((a, b) => a.minutes - b.minutes);
}

/**
 * Courbe de hauteur d'eau du jour : un point toutes les 10 minutes, de 00:00 à
 * 23:50 locales (144 points).
 */
export function predictLevels(
  port: HarmonicPort,
  dateKey: string,
): HarmonicLevel[] {
  const midnight = parisMidnight(dateKey);
  const end = new Date(midnight.getTime() + DAY_MINUTES * MINUTE_MS);

  return predictorFor(port)
    .getTimelinePrediction({
      start: midnight,
      end,
      timeFidelity: LEVEL_STEP_MINUTES * 60,
    })
    .filter((point) => {
      const minutes = minutesSince(midnight, new Date(point.time));
      return minutes >= 0 && minutes < DAY_MINUTES;
    })
    .map((point) => ({
      minutes: minutesSince(midnight, new Date(point.time)),
      heightM: Number(point.level.toFixed(2)),
    }));
}

/**
 * Coefficients de marée de Brest pour la journée, indexés par l'heure (en
 * minutes locales) de la pleine mer correspondante.
 */
function brestCoefficientsByMinute(dateKey: string): Map<number, number> {
  const byMinute = new Map<number, number>();

  for (const extremum of predictExtrema("brest", dateKey)) {
    if (extremum.kind !== "Pleine mer") continue;

    const raw = Math.round(
      ((extremum.heightM - BREST_MEAN_LEVEL_M) / BREST_UNIT_M) * 100,
    );

    byMinute.set(
      extremum.minutes,
      Math.max(COEFFICIENT_MIN, Math.min(COEFFICIENT_MAX, raw)),
    );
  }

  return byMinute;
}

/**
 * Coefficients des pleines mers de la journée civile pour le port demandé.
 *
 * Le coefficient n'est pas recalculé localement : on reprend celui de la pleine
 * mer de Brest la plus proche dans le temps, ce qui reproduit la façon dont les
 * annuaires français rattachent une marée locale au coefficient du jour.
 */
export function predictCoefficients(
  port: HarmonicPort,
  dateKey: string,
): number[] {
  const brest = brestCoefficientsByMinute(dateKey);
  const coefficients: number[] = [];

  for (const extremum of predictExtrema(port, dateKey)) {
    if (extremum.kind !== "Pleine mer") continue;
    if (extremum.minutes < 0 || extremum.minutes >= DAY_MINUTES) continue;

    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const [minutes, coefficient] of brest) {
      const distance = Math.abs(minutes - extremum.minutes);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = coefficient;
      }
    }

    if (best !== null && bestDistance <= COEFFICIENT_MATCH_TOLERANCE_MIN) {
      coefficients.push(best);
    }
  }

  return coefficients;
}
