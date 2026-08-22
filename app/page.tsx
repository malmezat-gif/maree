"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDayCycle } from "./day-cycle";
import { ShomTideWidget, type ShomPortId } from "./shom-tide-widget";
import { isHarmonicPort, predictCoefficients, predictExtrema, harmonicStationName, HARMONIC_SOURCE } from "@/lib/harmonic-tides";

type TidePoint = {
  minutes: number;
  height: number;
  kind: "Pleine mer" | "Basse mer";
  coefficient: number | null;
};

type ForecastDay = {
  date: Date;
  coefficients: number[];
  tides: TidePoint[];
};

type Port = {
  id: ShomPortId;
  name: string;
  area: string;
  demoCoefficient: number;
  timeShift: number;
  heightFactor: number;
  heightOffset: number;
};

type TideApiExtremum = {
  date: string;
  time: string;
  type: "high" | "low";
  heightM: number;
  coefficient: number | null;
};

type TideApiLevel = {
  time: string;
  heightM: number;
};

type TidesPayload = {
  source: {
    id: string;
    attribution: string;
    license: string;
    official: false;
    navigation: false;
  };
  port: { id: ShomPortId; name: string; siteId: string };
  timezone: "Europe/Paris";
  period: { start: string; endInclusive: string; days: number };
  unit: "m";
  stepMinutes: number;
  extrema: TideApiExtremum[];
  levels: TideApiLevel[];
};

type TideLoadState = "loading" | "live" | "demo" | "unavailable";

type ShoreMotion = {
  kind: "arriving" | "leaving";
  id: number;
};

type ScreenDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  startTranslateY: number;
  lastY: number;
  lastTime: number;
  velocityY: number;
  currentY: number;
  axis: "pending" | "vertical";
  startedUnderwater: boolean;
  startedFromForecastHandle: boolean;
  reduceMotion: boolean;
};

const tideTemplate: TidePoint[] = [
  { minutes: -126, height: 4.0, kind: "Pleine mer", coefficient: 78 },
  { minutes: 208, height: 1.1, kind: "Basse mer", coefficient: null },
  { minutes: 582, height: 3.9, kind: "Pleine mer", coefficient: 78 },
  { minutes: 958, height: 1.3, kind: "Basse mer", coefficient: null },
  { minutes: 1334, height: 4.1, kind: "Pleine mer", coefficient: 77 },
  { minutes: 1708, height: 1.2, kind: "Basse mer", coefficient: null },
];

const ports: Port[] = [
  { id: "biarritz", name: "Biarritz", area: "Côte basque", demoCoefficient: 78, timeShift: 0, heightFactor: 1, heightOffset: 0 },
  { id: "saint-jean-de-luz", name: "Saint-Jean-de-Luz", area: "Côte basque", demoCoefficient: 77, timeShift: -18, heightFactor: 0.96, heightOffset: -0.04 },
  { id: "capbreton", name: "Capbreton", area: "Landes", demoCoefficient: 76, timeShift: 14, heightFactor: 0.92, heightOffset: -0.04 },
  { id: "arcachon", name: "Arcachon", area: "Bassin d’Arcachon", demoCoefficient: 72, timeShift: 42, heightFactor: 0.82, heightOffset: -0.12 },
  { id: "la-rochelle", name: "La Rochelle", area: "Charente-Maritime", demoCoefficient: 82, timeShift: 68, heightFactor: 1.15, heightOffset: 0.02 },
  { id: "les-sables", name: "Les Sables-d’Olonne", area: "Vendée", demoCoefficient: 80, timeShift: 54, heightFactor: 1.08, heightOffset: 0 },
  { id: "brest", name: "Brest", area: "Finistère", demoCoefficient: 93, timeShift: 92, heightFactor: 1.38, heightOffset: 0.12 },
  { id: "saint-malo", name: "Saint-Malo", area: "Ille-et-Vilaine", demoCoefficient: 104, timeShift: 138, heightFactor: 1.68, heightOffset: 0.18 },
];

const coefficientDeltas = [0, -4, -10, -17, -24, -30, -35];

const waterLevelMin = 33;
const waterLevelSpan = 13;
const highMarkTop = 100 - (waterLevelMin + waterLevelSpan);
const lowMarkTop = 100 - waterLevelMin;

type IconName = "waves" | "chevron" | "arrow-up" | "arrow-down" | "play" | "pause" | "search" | "check";

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function springEasing(distance: number, velocity: number, duration: number) {
  if (Math.abs(distance) < 1) return null;
  const initialVelocity = clamp((velocity * duration) / distance, -3, 14);
  const curve = (progress: number) =>
    1 - (1 + (8 - initialVelocity) * progress) * Math.exp(-8 * progress);
  const normalizer = curve(1);
  if (!Number.isFinite(normalizer) || normalizer <= 0) return null;
  const stops: string[] = [];
  for (let step = 0; step <= 24; step += 1) {
    stops.push((curve(step / 24) / normalizer).toFixed(4));
  }
  return `linear(${stops.join(", ")})`;
}

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <span className={`ui-icon ui-icon-${name} ${className}`.trim()} aria-hidden="true" />;
}

function buildTidePoints(portId: ShomPortId, dateKey: string, port: Port): TidePoint[] {
  if (!isHarmonicPort(portId)) return buildDemoTidePoints(port);
  // `predictCoefficients` ne rend que les coefficients des pleines mers de la
  // journée civile, dans l'ordre où `predictExtrema` les produit : on les
  // rattache donc par position. Les pleines mers débordant du jour (minutes
  // négatives ou ≥ 1440), qui ne servent qu'à interpoler la courbe, restent
  // sans coefficient.
  const coefficients = predictCoefficients(portId, dateKey);
  let highTideIndex = 0;
  return predictExtrema(portId, dateKey).map((point) => {
    const withinDay = point.minutes >= 0 && point.minutes < 1440;
    const coefficient =
      point.kind === "Pleine mer" && withinDay
        ? coefficients[highTideIndex++] ?? null
        : null;
    return {
      minutes: point.minutes,
      height: point.heightM,
      kind: point.kind,
      coefficient,
    };
  });
}

function buildForecast(
  portId: ShomPortId,
  startDate: Date,
  port: Port,
  demoVisibleTides: TidePoint[],
): ForecastDay[] {
  if (!isHarmonicPort(portId)) return buildDemoForecast(startDate, port, demoVisibleTides);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    const tides = buildTidePoints(portId, localDateKey(date), port).filter(
      (point) => point.minutes >= 0 && point.minutes < 1440,
    );
    return {
      date,
      coefficients: tides
        .map((point) => point.coefficient)
        .filter((coefficient): coefficient is number => coefficient !== null),
      tides,
    };
  });
}

function buildDemoTidePoints(port: Port): TidePoint[] {
  const core = tideTemplate.map((point) => ({
    ...point,
    minutes: point.minutes + port.timeShift,
    height: Number(Math.max(0.4, point.height * port.heightFactor + port.heightOffset).toFixed(1)),
    coefficient:
      point.kind === "Pleine mer"
        ? Math.max(20, Math.min(120, port.demoCoefficient + (point.coefficient ?? 78) - 78))
        : null,
  }));
  const first = core[0];
  const second = core[1];
  const penultimate = core[core.length - 2];
  const last = core[core.length - 1];

  return [
    {
      minutes: first.minutes - (second.minutes - first.minutes),
      height: second.height,
      kind: second.kind,
      coefficient: second.coefficient,
    },
    ...core,
    {
      minutes: last.minutes + (last.minutes - penultimate.minutes),
      height: penultimate.height,
      kind: penultimate.kind,
      coefficient: penultimate.coefficient,
    },
  ];
}

function buildDemoForecast(startDate: Date, port: Port, visibleTides: TidePoint[]): ForecastDay[] {
  const start = new Date(startDate);

  return coefficientDeltas.map((delta, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const shift = index * 48;
    return {
      date,
      coefficients: [Math.max(20, Math.min(120, port.demoCoefficient + delta))],
      tides: visibleTides
        .map((point) => ({
          ...point,
          minutes: (point.minutes + shift) % 1440,
          coefficient:
            point.kind === "Pleine mer"
              ? Math.max(20, Math.min(120, port.demoCoefficient + delta))
              : null,
          height: Number(
            Math.max(
              0.4,
              point.height +
                (point.kind === "Pleine mer"
                  ? -index * 0.08 * port.heightFactor
                  : index * 0.035 * port.heightFactor),
            ).toFixed(1),
          ),
        }))
        .sort((a, b) => a.minutes - b.minutes),
    };
  });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateFromKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesFromLevelTime(value: string) {
  const match = /T(\d{2}):(\d{2})/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function coefficientsLabel(coefficients: number[]) {
  const unique = [...new Set(coefficients)].sort((left, right) => left - right);
  if (!unique.length) return "—";
  if (unique.length === 1) return String(unique[0]);
  return `${unique[0]}–${unique[unique.length - 1]}`;
}

function buildLiveForecast(payload: TidesPayload): ForecastDay[] {
  return Array.from({ length: payload.period.days }, (_, index) => {
    const date = localDateFromKey(payload.period.start);
    date.setDate(date.getDate() + index);
    const key = localDateKey(date);
    const extrema = payload.extrema.filter((point) => point.date === key);
    return {
      date,
      coefficients: extrema
        .filter((point) => point.type === "high" && point.coefficient !== null)
        .map((point) => point.coefficient as number),
      tides: extrema.map((point) => ({
        minutes: minutesFromTime(point.time),
        height: point.heightM,
        kind: point.type === "high" ? "Pleine mer" : "Basse mer",
        coefficient: point.type === "high" ? point.coefficient : null,
      })),
    };
  });
}

function getLiveTideAt(
  minutes: number,
  levels: TideApiLevel[],
  events: TidePoint[],
) {
  const samples = levels
    .map((sample) => ({ minutes: minutesFromLevelTime(sample.time), height: sample.heightM }))
    .filter((sample): sample is { minutes: number; height: number } => sample.minutes !== null)
    .sort((left, right) => left.minutes - right.minutes);
  if (samples.length < 2) return null;

  const nextSampleIndex = samples.findIndex((sample) => sample.minutes >= minutes);
  const endIndex = nextSampleIndex <= 0 ? 1 : nextSampleIndex === -1 ? samples.length - 1 : nextSampleIndex;
  const start = samples[endIndex - 1];
  const end = samples[endIndex];
  const progress = Math.max(0, Math.min(1, (minutes - start.minutes) / Math.max(1, end.minutes - start.minutes)));
  const height = start.height + (end.height - start.height) * progress;
  const next = events.find((point) => point.minutes >= minutes) ?? events[events.length - 1];
  if (!next) return null;

  return {
    height,
    rising: next.kind === "Pleine mer",
    next,
    minutesUntilNext: Math.max(0, next.minutes - minutes),
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .trim();
}

function formatTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

function formatHeight(value: number) {
  return value.toFixed(1).replace(".", ",");
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours} h ${mins.toString().padStart(2, "0")}`;
}

function getParisClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const minutes = (values.hour * 60 + values.minute) % 1440;
  const date = new Date(values.year, values.month - 1, values.day, 12, 0, 0, 0);
  return { date, minutes };
}

function getTideAt(minutes: number, tidePoints: TidePoint[]) {
  const startIndex = tidePoints.findIndex(
    (point, index) =>
      index < tidePoints.length - 1 &&
      minutes >= point.minutes &&
      minutes <= tidePoints[index + 1].minutes,
  );
  const index = startIndex === -1 ? 0 : startIndex;
  const start = tidePoints[index];
  const end = tidePoints[index + 1];
  const progress = Math.max(
    0,
    Math.min(1, (minutes - start.minutes) / (end.minutes - start.minutes)),
  );
  const eased = (1 - Math.cos(progress * Math.PI)) / 2;
  const height = start.height + (end.height - start.height) * eased;

  return {
    height,
    rising: end.kind === "Pleine mer",
    next: end,
    minutesUntilNext: Math.max(0, end.minutes - minutes),
  };
}

export default function Home() {
  const [minutes, setMinutes] = useState(12 * 60);
  const [currentDate, setCurrentDate] = useState(
    () => new Date(2026, 7, 3, 12, 0, 0, 0),
  );
  const [liveMinutes, setLiveMinutes] = useState(12 * 60);
  const [isFollowingLive, setIsFollowingLive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnderwater, setIsUnderwater] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedPortId, setSelectedPortId] = useState<ShomPortId>("biarritz");
  const [portQuery, setPortQuery] = useState("");
  const [portAnnouncement, setPortAnnouncement] = useState("");
  const [tidesPayload, setTidesPayload] = useState<TidesPayload | null>(null);
  const [tideLoadState, setTideLoadState] = useState<TideLoadState>("loading");
  const [tideAnnouncement, setTideAnnouncement] = useState(
    "Connexion à la source de marée…",
  );
  const [shoreMotion, setShoreMotion] = useState<ShoreMotion | null>(null);
  const portDialogRef = useRef<HTMLDialogElement>(null);
  const shomDialogRef = useRef<HTMLDialogElement>(null);
  const portSearchRef = useRef<HTMLInputElement>(null);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const forecastButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const lastShomTriggerRef = useRef<HTMLButtonElement | null>(null);
  const phoneRef = useRef<HTMLElement>(null);
  const screenStackRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const disturbanceTimerRef = useRef<number | null>(null);
  const disturbanceStartedAtRef = useRef<number | null>(null);
  const shoreMotionTimerRef = useRef<number | null>(null);
  const shoreMotionIdRef = useRef(0);
  const sliderStartMinutesRef = useRef(12 * 60);
  const screenDragRef = useRef<ScreenDrag | null>(null);
  const suppressForecastClickRef = useRef(false);
  const forecastClickResetTimerRef = useRef<number | null>(null);

  const selectedPort = useMemo(
    () => ports.find((port) => port.id === selectedPortId) ?? ports[0],
    [selectedPortId],
  );
  const currentDateKey = localDateKey(currentDate);
  const localTidePoints = useMemo(
    () => buildTidePoints(selectedPortId, currentDateKey, selectedPort),
    [currentDateKey, selectedPort, selectedPortId],
  );
  const localVisibleTides = useMemo(
    () => localTidePoints.filter((point) => point.minutes >= 0 && point.minutes < 1440),
    [localTidePoints],
  );
  const localForecast = useMemo(
    () => buildForecast(selectedPortId, currentDate, selectedPort, localVisibleTides),
    [currentDate, selectedPort, selectedPortId, localVisibleTides],
  );
  const liveForecast = useMemo(
    () => (tidesPayload ? buildLiveForecast(tidesPayload) : null),
    [tidesPayload],
  );
  const hasLiveData = tideLoadState === "live" && liveForecast !== null;
  const forecast = hasLiveData ? liveForecast : localForecast;
  const visibleTides = hasLiveData && forecast[0]?.tides.length
    ? forecast[0].tides
    : localVisibleTides;
  const liveLevelsToday = useMemo(
    () =>
      hasLiveData
        ? (tidesPayload?.levels.filter((point) => point.time.slice(0, 10) === currentDateKey) ?? [])
        : [],
    [currentDateKey, hasLiveData, tidesPayload],
  );
  const eventTimeline = useMemo(() => {
    if (!hasLiveData) return localTidePoints;
    const todayEvents = forecast[0]?.tides ?? [];
    const tomorrowEvents = (forecast[1]?.tides ?? []).map((point) => ({
      ...point,
      minutes: point.minutes + 1440,
    }));
    return [...todayEvents, ...tomorrowEvents];
  }, [localTidePoints, forecast, hasLiveData]);
  const filteredPorts = useMemo(() => {
    const query = normalizeSearch(portQuery);
    if (!query) return ports;
    return ports.filter((port) =>
      normalizeSearch(`${port.name} ${port.area}`).includes(query),
    );
  }, [portQuery]);

  useEffect(() => {
    let savedPort: string | null = null;

    try {
      savedPort = window.localStorage.getItem("maree.selected-port");
    } catch {
      // Le choix reste simplement limité à cette session si le stockage est indisponible.
    }

    const frame = window.requestAnimationFrame(() => {
      const savedPortConfig = ports.find((port) => port.id === savedPort);
      if (savedPortConfig) {
        setSelectedPortId(savedPortConfig.id);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function syncClock() {
      const parisClock = getParisClock();
      setLiveMinutes(parisClock.minutes);
      if (isFollowingLive) setMinutes(parisClock.minutes);
      setCurrentDate(parisClock.date);
    }

    const frame = window.requestAnimationFrame(syncClock);
    const timer = window.setInterval(syncClock, 30_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [isFollowingLive]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTides() {
      try {
        const response = await fetch(
          `/api/tides?port=${encodeURIComponent(selectedPortId)}&start=${currentDateKey}&days=7`,
          { signal: controller.signal, headers: { accept: "application/json" } },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result?.error?.code ?? "upstream_unavailable");
        const payload = result as TidesPayload;
        if (!payload.extrema.length || payload.levels.length < 2) {
          throw new Error("empty_payload");
        }
        setTidesPayload(payload);
        setTideLoadState("live");
        setTideAnnouncement(
          `Données de marée chargées pour ${selectedPort.name}, fournies par api-maree.fr.`,
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        setTidesPayload(null);
        const unconfigured =
          error instanceof Error && error.message === "service_unconfigured";
        const keyRejected =
          error instanceof Error && error.message === "service_key_rejected";
        setTideLoadState(unconfigured ? "demo" : "unavailable");
        setTideAnnouncement(
          isHarmonicPort(selectedPortId)
            ? `Horaires calculés sur l’appareil à partir des constantes harmoniques de ${harmonicStationName(selectedPortId)}. Les horaires officiels SHOM restent disponibles.`
            : unconfigured
              ? "Horaires fictifs : aucune source de marée n’est configurée. Les horaires officiels SHOM sont disponibles."
              : keyRejected
                ? "Horaires fictifs : la source de marée refuse la clé de ce déploiement. Les horaires officiels SHOM restent disponibles."
                : "Horaires fictifs : la source de marée est momentanément indisponible. Les horaires officiels SHOM restent disponibles.",
        );
      }
    }

    const frame = window.requestAnimationFrame(() => {
      setTidesPayload(null);
      setSelectedDay(0);

      if (selectedPortId === "capbreton") {
        setTideLoadState("demo");
        setTideAnnouncement(
          `Horaires calculés sur l’appareil à partir des constantes harmoniques de ${harmonicStationName("capbreton")}. Les horaires officiels SHOM restent disponibles.`,
        );
        return;
      }

      setTideLoadState("loading");
      setTideAnnouncement(`Connexion aux données de marée pour ${selectedPort.name}…`);
      void loadTides();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [currentDateKey, selectedPort.name, selectedPortId]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setMinutes((current) => (current + 10) % 1440);
    }, 140);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(
    () => () => {
      if (disturbanceTimerRef.current !== null) {
        window.clearTimeout(disturbanceTimerRef.current);
      }
      if (shoreMotionTimerRef.current !== null) {
        window.clearTimeout(shoreMotionTimerRef.current);
      }
    },
    [],
  );

  const tide = useMemo(
    () =>
      (hasLiveData
        ? getLiveTideAt(minutes, liveLevelsToday, eventTimeline)
        : null) ?? getTideAt(minutes, localTidePoints),
    [localTidePoints, eventTimeline, hasLiveData, liveLevelsToday, minutes],
  );
  const dayCycle = useMemo(() => getDayCycle(minutes), [minutes]);
  const tideRange = useMemo(() => {
    const heights = hasLiveData && liveLevelsToday.length
      ? liveLevelsToday.map((point) => point.heightM)
      : localTidePoints.map((point) => point.height);
    return { min: Math.min(...heights), max: Math.max(...heights) };
  }, [localTidePoints, hasLiveData, liveLevelsToday]);
  const rangeSpan = Math.max(0.5, tideRange.max - tideRange.min);
  const tideProgress = clamp((tide.height - tideRange.min) / rangeSpan);
  const waterLevel = waterLevelMin + tideProgress * waterLevelSpan;
  const waterShift = ((84 - waterLevel) / 84) * 100;
  const beachExposure = clamp((0.92 - tideProgress) / 0.72);
  const isDarkScene = dayCycle.night >= 0.32;
  const birdLight = clamp(1 - dayCycle.night * 2.1);
  const sandDryness = clamp((0.82 - tideProgress) / 0.6) *
    (tide.rising ? clamp(0.95 - tideProgress * 0.55) : 1);
  const visitorPresence = clamp(0.35 + beachExposure * 0.65) * birdLight;
  const tideScene = tideProgress <= 0.34
    ? "low"
    : tideProgress >= 0.66
      ? "high"
      : tide.rising
        ? "departing"
        : "arriving";
  const beachLife = birdLight < 0.16 || beachExposure <= 0.22
    ? "hidden"
    : tide.rising
      ? "leaving"
      : beachExposure >= 0.62
        ? "settled"
        : "arriving";
  const birdState = birdLight < 0.16
    ? "hidden"
    : tide.rising
      ? tideProgress >= 0.84
        ? "hidden"
        : tideProgress >= 0.38
          ? "flying-out"
          : "landed"
      : tideProgress >= 0.82
        ? "hidden"
        : tideProgress >= 0.42
          ? "flying-in"
          : "landed";
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(currentDate);
  const activeForecast = forecast[selectedDay] ?? forecast[0];
  const coefficientEvents = eventTimeline.filter(
    (point) => point.kind === "Pleine mer" && point.coefficient !== null,
  );
  const currentCoefficient =
    (
      coefficientEvents.find((point) => point.minutes >= minutes) ??
      coefficientEvents[coefficientEvents.length - 1]
    )?.coefficient ?? null;
  const harmonicStation = isHarmonicPort(selectedPortId)
    ? harmonicStationName(selectedPortId)
    : null;
  const isComputed = !hasLiveData && harmonicStation !== null;
  const sourceLabel = tideLoadState === "live"
    ? "api-maree.fr"
    : tideLoadState === "loading"
      ? "Connexion…"
      : isComputed
        ? "Calculé"
        : "Horaires fictifs";
  const atmosphereStyle = {
    "--daylight": dayCycle.daylight.toFixed(3),
    "--night": dayCycle.night.toFixed(3),
    "--dawn": dayCycle.dawn.toFixed(3),
    "--dusk": dayCycle.dusk.toFixed(3),
    "--twilight": dayCycle.twilight.toFixed(3),
    "--moonlight": dayCycle.moonlight.toFixed(3),
    "--sun-x": dayCycle.sunX.toFixed(2),
    "--sun-y": dayCycle.sunY.toFixed(2),
    "--moon-x": dayCycle.moonX.toFixed(2),
    "--moon-y": dayCycle.moonY.toFixed(2),
    "--water-shift": `${waterShift}%`,
    "--tide-progress": tideProgress.toFixed(3),
    "--beach-exposure": beachExposure.toFixed(3),
    "--sand-dryness": sandDryness.toFixed(3),
    "--visitor-presence": visitorPresence.toFixed(3),
  } as React.CSSProperties;

  useEffect(() => {
    const night = dayCycle.night;
    const twilight = dayCycle.twilight;
    const mix = (day: number, dusk: number, dark: number) =>
      Math.round(day * (1 - night - twilight * 0.5) + dusk * twilight * 0.5 + dark * night);
    const skyColor = `rgb(${mix(168, 196, 10)}, ${mix(207, 150, 23)}, ${mix(224, 150, 48)})`;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", skyColor);

    const blend = (light: number[], dark: number[]) =>
      `rgb(${light.map((channel, index) => Math.round(channel + (dark[index] - channel) * night)).join(", ")})`;
    const groundColor = isUnderwater
      ? blend([189, 160, 111], [98, 90, 77])
      : blend([10, 80, 116], [6, 34, 58]);
    document.documentElement.style.backgroundColor = groundColor;
    document.body.style.backgroundColor = groundColor;
  }, [dayCycle.night, dayCycle.twilight, isUnderwater]);

  useEffect(() => {
    const water = waterRef.current;
    if (!water) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let lastPaint = 0;
    const frameInterval = 1000 / 30;

    const setCalmPose = () => {
      water.style.setProperty("--foam-x", "0%");
      water.style.setProperty("--foam-y", "0px");
      water.style.setProperty("--foam-scale", "1");
    };

    const animate = (now: number) => {
      frame = 0;
      if (document.hidden || motionPreference.matches || isUnderwater) {
        setCalmPose();
        return;
      }

      if (now - lastPaint < frameInterval) {
        frame = window.requestAnimationFrame(animate);
        return;
      }
      lastPaint = now;

      const time = now / 1000;
      const disturbanceAge = disturbanceStartedAtRef.current === null
        ? Number.POSITIVE_INFINITY
        : Math.max(0, (now - disturbanceStartedAtRef.current) / 1000);
      const burstEnvelope = disturbanceAge < 1.05
        ? Math.exp(-3.15 * disturbanceAge) * (1 - Math.exp(-28 * disturbanceAge))
        : 0;
      const burst = burstEnvelope * (
        Math.sin(disturbanceAge * 29) * 0.74 +
        Math.sin(disturbanceAge * 47 + 0.8) * 0.26
      );

      const swell =
        Math.sin(time * 0.92) * 0.72 +
        Math.sin(time * 1.47 + 1.4) * 0.28;
      water.style.setProperty("--foam-x", `${(swell * 0.8 + burst * 2.8).toFixed(2)}%`);
      water.style.setProperty("--foam-y", `${(swell * -1.2 + burst * -3.2).toFixed(2)}px`);
      water.style.setProperty("--foam-scale", `${(1 + swell * 0.012 + Math.abs(burst) * 0.055).toFixed(3)}`);

      frame = window.requestAnimationFrame(animate);
    };

    const start = () => {
      if (!frame && !document.hidden && !motionPreference.matches && !isUnderwater) {
        frame = window.requestAnimationFrame(animate);
      }
    };
    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastPaint = 0;
      setCalmPose();
    };
    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    const handleMotionPreference = () => {
      if (motionPreference.matches) stop();
      else start();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    motionPreference.addEventListener("change", handleMotionPreference);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, [isUnderwater]);

  function agitateWater() {
    const water = waterRef.current;
    if (!water || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    water.classList.remove("is-disturbed");
    void water.offsetWidth;
    water.classList.add("is-disturbed");
    disturbanceStartedAtRef.current = window.performance.now();

    if (disturbanceTimerRef.current !== null) {
      window.clearTimeout(disturbanceTimerRef.current);
    }
    disturbanceTimerRef.current = window.setTimeout(() => {
      water.classList.remove("is-disturbed");
      disturbanceTimerRef.current = null;
    }, 1050);
  }

  function triggerShoreMotion(kind: ShoreMotion["kind"], atMinutes: number) {
    if (
      getDayCycle(atMinutes).phase === "night" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShoreMotion(null);
      return;
    }

    shoreMotionIdRef.current += 1;
    setShoreMotion({ kind, id: shoreMotionIdRef.current });

    if (shoreMotionTimerRef.current !== null) {
      window.clearTimeout(shoreMotionTimerRef.current);
    }
    shoreMotionTimerRef.current = window.setTimeout(() => {
      setShoreMotion(null);
      shoreMotionTimerRef.current = null;
    }, 1550);
  }

  function signalShoreMotionAt(atMinutes: number) {
    const tideAt =
      (hasLiveData ? getLiveTideAt(atMinutes, liveLevelsToday, eventTimeline) : null) ??
      getTideAt(atMinutes, localTidePoints);
    triggerShoreMotion(tideAt.rising ? "leaving" : "arriving", atMinutes);
  }

  function jumpToTide(point: TidePoint) {
    setIsPlaying(false);
    setIsFollowingLive(false);
    setMinutes(point.minutes);
    agitateWater();
    triggerShoreMotion(point.kind === "Basse mer" ? "arriving" : "leaving", point.minutes);
  }

  function returnToLive() {
    const parisClock = getParisClock();
    const difference = Math.abs(parisClock.minutes - minutes);
    setIsPlaying(false);
    setIsFollowingLive(true);
    setLiveMinutes(parisClock.minutes);
    setMinutes(parisClock.minutes);
    setSelectedDay(0);
    setCurrentDate(parisClock.date);
    if (Math.min(difference, 1440 - difference) >= 30) {
      agitateWater();
      signalShoreMotionAt(parisClock.minutes);
    }
  }

  function openPortPicker(focusSearch = false) {
    setIsPlaying(false);
    setPortQuery("");
    portDialogRef.current?.showModal();
    window.requestAnimationFrame(() => {
      if (focusSearch) portSearchRef.current?.focus();
      else portDialogRef.current?.focus();
    });
  }

  function closePortPicker() {
    if (portDialogRef.current?.open) portDialogRef.current.close();
  }

  function openShomWidget(trigger: HTMLButtonElement) {
    setIsPlaying(false);
    lastShomTriggerRef.current = trigger;
    shomDialogRef.current?.showModal();
  }

  function closeShomWidget() {
    if (shomDialogRef.current?.open) shomDialogRef.current.close();
  }

  function choosePort(port: Port) {
    setSelectedPortId(port.id);
    setSelectedDay(0);
    setIsPlaying(false);
    setPortAnnouncement(`Port sélectionné : ${port.name}`);
    try {
      window.localStorage.setItem("maree.selected-port", port.id);
    } catch {
      // Le changement est déjà appliqué pour la session courante.
    }
    closePortPicker();
  }

  function showForecast(moveFocus = true) {
    setIsPlaying(false);
    setIsUnderwater(true);
    window.requestAnimationFrame(() => {
      if (phoneRef.current) phoneRef.current.scrollTop = 0;
      if (moveFocus) backButtonRef.current?.focus({ preventScroll: true });
    });
  }

  function hideForecast(moveFocus = true) {
    setIsUnderwater(false);
    window.requestAnimationFrame(() => {
      if (phoneRef.current) phoneRef.current.scrollTop = 0;
      if (moveFocus) forecastButtonRef.current?.focus({ preventScroll: true });
    });
  }

  function readTranslateY(element: HTMLElement) {
    const transform = window.getComputedStyle(element).transform;
    if (transform === "none") return 0;
    try {
      return new DOMMatrixReadOnly(transform).m42;
    } catch {
      const values = transform
        .slice(transform.indexOf("(") + 1, transform.lastIndexOf(")"))
        .split(",")
        .map(Number);
      return values.length === 6 ? values[5] : values[13] ?? 0;
    }
  }

  function resetScreenDrag(duration = 360, easing: string | null = null) {
    const stack = screenStackRef.current;
    if (!stack) return;
    stack.style.setProperty("--screen-settle-duration", `${duration}ms`);
    if (easing) stack.style.setProperty("--screen-settle-easing", easing);
    else stack.style.removeProperty("--screen-settle-easing");
    window.requestAnimationFrame(() => {
      stack.classList.remove("is-dragging");
      stack.style.removeProperty("--drag-position");
    });
  }

  function suppressForecastClick() {
    suppressForecastClickRef.current = true;
    if (forecastClickResetTimerRef.current !== null) {
      window.clearTimeout(forecastClickResetTimerRef.current);
    }
    forecastClickResetTimerRef.current = window.setTimeout(() => {
      suppressForecastClickRef.current = false;
      forecastClickResetTimerRef.current = null;
    }, 450);
  }

  function handleScreenSwipeStart(event: React.PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "touch" ||
      !event.isPrimary ||
      portDialogRef.current?.open ||
      shomDialogRef.current?.open
    ) return;

    const target = event.target as HTMLElement;
    const forecastHandle = target.closest("[data-screen-swipe-handle]");
    const blockedTarget = target.closest(
      "button, input, select, textarea, a, dialog, [contenteditable], [data-no-screen-swipe]",
    );
    if (blockedTarget && !forecastHandle) {
      return;
    }

    const bounds =
      phoneRef.current?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect();
    if (event.clientY - bounds.top < 20 || bounds.bottom - event.clientY < 20) return;

    const startTranslateY = readTranslateY(event.currentTarget);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    screenDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTranslateY,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocityY: 0,
      currentY: startTranslateY,
      axis: "pending",
      startedUnderwater: isUnderwater,
      startedFromForecastHandle: Boolean(forecastHandle),
      reduceMotion,
    };

    event.currentTarget.style.setProperty("--drag-position", `${startTranslateY}px`);
    event.currentTarget.classList.add("is-dragging");
  }

  function handleScreenSwipeMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = screenDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (drag.axis === "pending") {
      if (Math.hypot(deltaX, deltaY) < 10) return;
      if (Math.abs(deltaY) < Math.abs(deltaX) * 1.2) {
        if (drag.startedFromForecastHandle) suppressForecastClick();
        screenDragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        resetScreenDrag();
        return;
      }
      drag.axis = "vertical";
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    const phoneHeight = phoneRef.current?.clientHeight ?? event.currentTarget.clientHeight / 2;
    const nextY = Math.max(-phoneHeight, Math.min(0, drag.startTranslateY + deltaY));
    const elapsed = Math.max(1, event.timeStamp - drag.lastTime);
    const instantVelocity = (event.clientY - drag.lastY) / elapsed;
    drag.velocityY = drag.velocityY * 0.65 + instantVelocity * 0.35;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    drag.currentY = nextY;

    if (!drag.reduceMotion) {
      event.currentTarget.style.setProperty("--drag-position", `${nextY}px`);
    }
  }

  function finishScreenSwipe(event: React.PointerEvent<HTMLDivElement>, cancelled = false) {
    const drag = screenDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const phoneHeight = phoneRef.current?.clientHeight ?? event.currentTarget.clientHeight / 2;
    const deltaY = event.clientY - drag.startY;
    const currentY = Math.max(-phoneHeight, Math.min(0, drag.startTranslateY + deltaY));
    const progress = Math.max(0, Math.min(1, -currentY / phoneHeight));
    const projected = Math.max(
      0,
      Math.min(1, progress - (drag.velocityY * 180) / phoneHeight),
    );
    const distance = Math.abs(deltaY);
    const enteredUnderwater =
      !cancelled &&
      drag.axis === "vertical" &&
      !drag.startedUnderwater &&
      (progress >= 0.28 ||
        projected >= 0.34 ||
        (drag.startedFromForecastHandle && deltaY <= -12) ||
        (distance >= 18 && drag.velocityY <= -0.55));
    const returnedToSurface =
      !cancelled &&
      drag.axis === "vertical" &&
      drag.startedUnderwater &&
      (progress <= 0.72 ||
        projected <= 0.66 ||
        (distance >= 18 && drag.velocityY >= 0.55));
    const nextUnderwater = enteredUnderwater
      ? true
      : returnedToSurface
        ? false
        : drag.startedUnderwater;
    const settleDuration = drag.reduceMotion
      ? 1
      : Math.round(Math.max(220, Math.min(420, 410 - Math.abs(drag.velocityY) * 150)));
    const settleTarget = nextUnderwater ? -phoneHeight : 0;
    const settleEasing = drag.reduceMotion
      ? null
      : springEasing(settleTarget - currentY, drag.velocityY, settleDuration);

    if (
      drag.startedFromForecastHandle &&
      distance >= 10 &&
      nextUnderwater !== drag.startedUnderwater
    ) {
      suppressForecastClick();
    }

    screenDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (nextUnderwater !== isUnderwater) {
      if (nextUnderwater) showForecast(false);
      else hideForecast(false);
    }
    resetScreenDrag(settleDuration, settleEasing);
  }

  return (
    <main className="app-stage">
      <section ref={phoneRef} className="phone" aria-label="Application Marée">
        <div
          ref={screenStackRef}
          className={isUnderwater ? "screen-stack is-underwater" : "screen-stack"}
          style={atmosphereStyle}
          onPointerDown={handleScreenSwipeStart}
          onPointerMove={handleScreenSwipeMove}
          onPointerUp={(event) => finishScreenSwipe(event)}
          onPointerCancel={(event) => finishScreenSwipe(event, true)}
          onLostPointerCapture={(event) => {
            if (event.target === event.currentTarget) finishScreenSwipe(event, true);
          }}
        >
          <section
            className={`surface-screen phase-${dayCycle.phase} scene-ready${isDarkScene ? " is-dark" : ""}${isPlaying ? " is-playing" : ""}`}
            data-tide-scene={tideScene}
            data-tide-direction={tide.rising ? "rising" : "falling"}
            data-beach-life={beachLife}
            data-bird-state={birdState}
            data-shore-motion={shoreMotion?.kind ?? "idle"}
            aria-hidden={isUnderwater}
            inert={isUnderwater ? true : undefined}
          >
            <div className="sky-scene" aria-hidden="true">
              <div className="sky-night" />
              <div className="sky-dawn" />
              <div className="sky-dusk" />
              <div className="star-field" />
              <span className="celestial sun" />
              <span className="celestial moon" />
              <span className="sky-cloud cloud-one" />
              <span className="sky-cloud cloud-two" />
              <div className="sky-flock">
                <span className="sky-bird" />
                <span className="sky-bird" />
                <span className="sky-bird" />
                <span className="sky-bird" />
                <span className="sky-bird" />
              </div>
              <div className="sky-flock sky-flock-far">
                <span className="sky-bird" />
                <span className="sky-bird" />
                <span className="sky-bird" />
              </div>
              <span className="sky-cloud cloud-three" />
              <div className="horizon-haze" />
            </div>

            <div className="beach-scene" aria-hidden="true">
              <div className="far-sea" />
              <div className="coast-lights">
                <div className="lighthouse">
                  <span className="lighthouse-beam beam-left" />
                  <span className="lighthouse-beam beam-right" />
                  <span className="lighthouse-glare" />
                  <span className="lighthouse-lamp" />
                </div>
                <div className="dune-houses">
                  <span className="house-window window-one" />
                  <span className="house-window window-two" />
                  <span className="house-window window-three" />
                  <span className="house-window window-four" />
                  <span className="house-window window-five" />
                  <span className="house-window window-six" />
                  <span className="house-window window-seven" />
                  <span className="house-window window-eight" />
                  <span className="house-window window-nine" />
                  <span className="house-smoke" />
                  <span className="house-smoke" />
                </div>
              </div>
              <div className="coast-bluff" />
              <div className="coast-band">
                <span className="coast-haze" />
              </div>
              <div className="beach-sand beach-sand-base" />
              <div className="beach-sand beach-sand-dry" />
              <div className="beach-sand-texture" />
              <div className="shoreline-track">
                <span className="beach-sand-wet" />
              </div>
              <div className="beachgoers">
                <span className="parasol parasol-one"><i /></span>
                <span className="parasol parasol-two"><i /></span>
                <span className="parasol parasol-three"><i /></span>
              </div>
              <div className="beach-rivulets">
                <span className="rivulet rivulet-one" />
                <span className="rivulet rivulet-two" />
                <span className="rivulet rivulet-three" />
              </div>
              <div className="beach-shells">
                <span className="shell shell-one" />
                <span className="shell shell-two" />
                <span className="shell shell-three" />
                <span className="shell shell-four" />
              </div>
            </div>

            <div
              ref={waterRef}
              className="water"
              aria-hidden="true"
            >
              <div className="water-night" />
              <div className="water-sunset" />
              <div className="water-caustics" />
              <div className="water-pattern" />
              <div className="water-current water-current-one" />
              <div className="water-current water-current-two" />
              <div className="water-foam" />
              <div className="water-slosh" />
              <span className="water-spray spray-one" />
              <span className="water-spray spray-two" />
              <span className="water-spray spray-three" />
              <div className="water-glint" />
            </div>

            <div className="tide-marks" aria-hidden="true">
              <span className="tide-mark tide-mark-high" style={{ "--at": `${highMarkTop}%` } as React.CSSProperties}>
                <span className="tide-mark-label">Pleine mer</span>
                <span className="tide-mark-value">{formatHeight(tideRange.max)} m</span>
              </span>
              <span className="tide-mark tide-mark-low" style={{ "--at": `${lowMarkTop}%` } as React.CSSProperties}>
                <span className="tide-mark-label">Basse mer</span>
                <span className="tide-mark-value">{formatHeight(tideRange.min)} m</span>
              </span>
            </div>

            <div className="interface">
              <header className="topbar">
                <div>
                  <button
                    ref={locationButtonRef}
                    className="location"
                    type="button"
                    onClick={(event) => openPortPicker(event.detail === 0)}
                    aria-label={`Changer de port, port actuel : ${selectedPort.name}`}
                    aria-haspopup="dialog"
                    aria-controls="port-picker"
                  >
                    <span className="location-name">{selectedPort.name}</span>
                    <Icon name="chevron" />
                  </button>
                </div>
                <div
                  className="coefficient"
                  aria-label={
                    currentCoefficient === null
                      ? "Coefficient de la prochaine pleine mer indisponible"
                      : `Coefficient ${hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"} de la prochaine pleine mer : ${currentCoefficient}`
                  }
                >
                  <span>Coef.</span>
                  <strong className="coefficient-value">{currentCoefficient ?? "—"}</strong>
                  <small className="coefficient-caption">
                    {hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"}
                  </small>
                </div>
              </header>

              <section className="tide-reading">
                <p className="date">
                  <span>{today}</span>
                </p>
                <p className="direction">
                  <Icon name="arrow-up" className={tide.rising ? "arrow rising" : "arrow falling"} />
                  Marée {tide.rising ? "montante" : "descendante"}
                </p>
                <h1>
                  <span className="height-value">{formatHeight(tide.height)}</span>
                  <span className="height-unit">m</span>
                </h1>
                <p className="next-tide">
                  {tide.next.kind} dans {formatDuration(tide.minutesUntilNext)}
                </p>
              </section>

              <section className="controls" aria-label="Explorer la marée au fil de la journée">
                <div className="time-row">
                  <div>
                    <p>Heure explorée</p>
                    <strong>{formatTime(minutes)}</strong>
                  </div>
                  <div className="time-actions">
                    <button
                      className={`live-button ${isFollowingLive ? "is-live" : ""}`}
                      type="button"
                      onClick={returnToLive}
                      aria-label={
                        isFollowingLive
                          ? `Heure actuelle, en direct à ${formatTime(liveMinutes)}`
                          : `Revenir en direct à ${formatTime(liveMinutes)}`
                      }
                      aria-pressed={isFollowingLive}
                    >
                      <span className="live-dot" aria-hidden="true" />
                      <span>En direct</span>
                    </button>
                    <button
                      className={`play ${isPlaying ? "is-playing" : ""}`}
                      type="button"
                      onClick={() => {
                        if (!isPlaying) setIsFollowingLive(false);
                        setIsPlaying((playing) => !playing);
                      }}
                      aria-label="Lecture automatique de la journée"
                      aria-pressed={isPlaying}
                    >
                      <Icon key={isPlaying ? "pause" : "play"} name={isPlaying ? "pause" : "play"} />
                    </button>
                  </div>
                </div>

                <div className="slider-stack">
                  <label className="sr-only" htmlFor="time-slider">
                    Choisir l’heure de la journée
                  </label>
                  <input
                    id="time-slider"
                    className="time-slider"
                    type="range"
                    min="0"
                    max="1439"
                    step="1"
                    value={minutes}
                    aria-valuetext={`${formatTime(minutes)}, ${dayCycle.label.toLowerCase()}, hauteur ${formatHeight(tide.height)} mètres, marée ${tide.rising ? "montante" : "descendante"}`}
                    onPointerDown={() => {
                      sliderStartMinutesRef.current = minutes;
                    }}
                    onPointerUp={(event) => {
                      const value = Number(event.currentTarget.value);
                      const difference = Math.abs(value - sliderStartMinutesRef.current);
                      if (Math.min(difference, 1440 - difference) >= 75) {
                        agitateWater();
                        signalShoreMotionAt(value);
                      }
                    }}
                    onChange={(event) => {
                      setIsPlaying(false);
                      setIsFollowingLive(false);
                      setMinutes(Number(event.target.value));
                    }}
                    style={{ "--progress": `${(minutes / 1439) * 100}%` } as React.CSSProperties}
                  />
                  <div className="range-labels" aria-hidden="true">
                    <span>00:00</span>
                    <span>Midi</span>
                    <span>24:00</span>
                  </div>
                </div>

                <h2 id="today-tides-title" className="sr-only">
                  {hasLiveData
                    ? "Horaires des marées aujourd’hui"
                    : isComputed
                      ? "Horaires des marées aujourd’hui, calculés à partir des constantes harmoniques"
                      : "Horaires des marées aujourd’hui — horaires fictifs de démonstration"}
                </h2>
                {hasLiveData || isComputed || tideLoadState === "loading" ? null : (
                  <p className="fiction-notice">
                    <span aria-hidden="true" className="fiction-notice-mark" />
                    Horaires fictifs —{" "}
                    {tideLoadState === "unavailable"
                      ? "source indisponible"
                      : "aucune source configurée"}
                  </p>
                )}
                <div
                  className="tide-events"
                  role="group"
                  aria-labelledby="today-tides-title"
                  data-fiction={
                    hasLiveData || isComputed || tideLoadState === "loading" ? undefined : "true"
                  }
                >
                  {visibleTides.map((point) => {
                    const isActive = minutes === point.minutes;
                    return (
                      <button
                        className={`event ${isActive ? "is-active" : ""}`}
                        key={point.minutes}
                        type="button"
                        onClick={() => jumpToTide(point)}
                        aria-pressed={isActive}
                        aria-label={`${hasLiveData || isComputed ? "" : "Horaire fictif. "}Aller à ${point.kind.toLowerCase()} à ${formatTime(point.minutes)}, hauteur ${point.height.toFixed(1)} mètres${point.coefficient === null ? "" : `, coefficient ${point.coefficient}`}`}
                      >
                        <span className={point.kind === "Pleine mer" ? "event-icon high" : "event-icon low"}>
                          <Icon name={point.kind === "Pleine mer" ? "arrow-up" : "arrow-down"} />
                        </span>
                        <span className="event-copy">
                          <span>{point.kind}</span>
                          <strong>{formatTime(point.minutes)}</strong>
                        </span>
                        <span className="event-height">
                          {formatHeight(point.height)} m
                          {point.coefficient === null ? null : <small> · {point.coefficient}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="controls-footer">
                  <button
                    ref={forecastButtonRef}
                    className="forecast-button"
                    type="button"
                    data-screen-swipe-handle
                    onClick={() => {
                      if (suppressForecastClickRef.current) {
                        suppressForecastClickRef.current = false;
                        if (forecastClickResetTimerRef.current !== null) {
                          window.clearTimeout(forecastClickResetTimerRef.current);
                          forecastClickResetTimerRef.current = null;
                        }
                        return;
                      }
                      showForecast();
                    }}
                    aria-label="Afficher les prévisions des 7 prochains jours"
                  >
                    <span><span className="forecast-gesture">Glisser · </span>7 jours</span>
                  </button>
                  <div className="data-provenance">
                    <span
                      className={`source-note ${!hasLiveData && !isComputed && tideLoadState !== "loading" ? "source-note--fiction" : ""}`}
                    >
                      {sourceLabel}
                    </span>
                    <button
                      className="source-badge source-badge--official"
                      type="button"
                      data-no-screen-swipe
                      aria-label="Consulter les horaires officiels SHOM"
                      aria-haspopup="dialog"
                      aria-controls="shom-tide-dialog"
                      onClick={(event) => openShomWidget(event.currentTarget)}
                    >
                      SHOM
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </section>

          <section
            className="forecast-screen"
            aria-labelledby="forecast-section-title"
            aria-hidden={!isUnderwater}
            inert={!isUnderwater ? true : undefined}
          >
            <div className="underwater-light" aria-hidden="true" />
            <span className="water-drift" aria-hidden="true" />
            <div className="seabed" aria-hidden="true">
              <span className="seabed-caustics" />
              <span className="seabed-crab">
                <i className="crab-body" />
                <i className="crab-claw crab-claw-left" />
                <i className="crab-claw crab-claw-right" />
              </span>
            </div>
            <div className="bubble bubble-one" aria-hidden="true" />
            <div className="bubble bubble-two" aria-hidden="true" />
            <div className="bubble bubble-three" aria-hidden="true" />

            <header className="forecast-header">
              <button
                ref={backButtonRef}
                className="back-button"
                type="button"
                onClick={() => hideForecast()}
                aria-label="Revenir à la marée du jour"
              >
                <Icon name="arrow-up" />
              </button>
              <div>
                <p>Prévisions</p>
                <h2 id="forecast-section-title">{selectedPort.name}</h2>
              </div>
              <span className="forecast-depth">7 jours</span>
            </header>

            <div className="calendar" role="group" aria-label="Choisir un jour" data-no-screen-swipe>
              {forecast.map((day, index) => (
                <button
                  className={`day-button ${selectedDay === index ? "is-selected" : ""}`}
                  type="button"
                  key={day.date.toISOString()}
                  onClick={() => setSelectedDay(index)}
                  aria-pressed={selectedDay === index}
                  aria-current={index === 0 ? "date" : undefined}
                  aria-label={`${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(day.date)}, coefficient ${hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"} ${coefficientsLabel(day.coefficients)}`}
                >
                  <span>{index === 0 ? "Auj." : new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day.date).replace(".", "")}</span>
                  <strong>{day.date.getDate()}</strong>
                  <small>{coefficientsLabel(day.coefficients)}</small>
                </button>
              ))}
            </div>

            <div className="forecast-spacer" aria-hidden="true" />

            {hasLiveData || isComputed || tideLoadState === "loading" ? null : (
              <p className="fiction-notice fiction-notice-forecast">
                <span aria-hidden="true" className="fiction-notice-mark" />
                Horaires fictifs sur les sept jours —{" "}
                {tideLoadState === "unavailable"
                  ? "source indisponible"
                  : "aucune source configurée"}
              </p>
            )}

            <section className="forecast-card">
              <div
                className="forecast-card-content"
                key={activeForecast.date.toISOString()}
                data-fiction={
                  hasLiveData || isComputed || tideLoadState === "loading" ? undefined : "true"
                }
              >
              <div className="forecast-card-heading">
                <div>
                  <p>{new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(activeForecast.date)}</p>
                  <h4>{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(activeForecast.date)}</h4>
                </div>
                <div className="forecast-coef">
                  <span>Coef. {hasLiveData ? "estimé" : isComputed ? "calculé" : "fictif"}</span>
                  <strong>{coefficientsLabel(activeForecast.coefficients)}</strong>
                </div>
              </div>

              <div className="forecast-tides">
                {activeForecast.tides.map((point, index) => (
                  <div className="forecast-tide" key={`${point.minutes}-${index}`}>
                    <span className={point.kind === "Pleine mer" ? "forecast-icon high" : "forecast-icon low"}>
                      <Icon name={point.kind === "Pleine mer" ? "arrow-up" : "arrow-down"} />
                    </span>
                    <div>
                      <p>{point.kind}</p>
                      <strong>{formatTime(point.minutes)}</strong>
                    </div>
                    <span>
                      {formatHeight(point.height)} m
                      {point.coefficient === null ? null : <small> · coef. {point.coefficient}</small>}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </section>

            <div className="forecast-spacer" aria-hidden="true" />

            <button
              className="official-shom-panel"
              type="button"
              data-no-screen-swipe
              aria-haspopup="dialog"
              aria-controls="shom-tide-dialog"
              onClick={(event) => openShomWidget(event.currentTarget)}
            >
              <span className="official-shom-mark">SHOM</span>
              <span className="official-shom-copy">
                <strong>Horaires officiels SHOM</strong>
                <small>Port de référence pour {selectedPort.name}</small>
              </span>
              <span className="official-shom-chevron" aria-hidden="true">›</span>
            </button>

            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Prévisions pour {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(activeForecast.date)}, coefficient {coefficientsLabel(activeForecast.coefficients)}
            </p>

            <div className="underwater-note">
              <p>
                {hasLiveData
                  ? "Données api-maree.fr · "
                  : isComputed
                    ? `Calculé pour ${harmonicStation} · `
                    : "Horaires fictifs · "}
                Prévisions indicatives — non destinées à la navigation
              </p>
              {isComputed ? (
                <p className="source-credit">{HARMONIC_SOURCE.attribution}</p>
              ) : null}
            </div>
          </section>
        </div>

        <dialog
          ref={shomDialogRef}
          id="shom-tide-dialog"
          className="shom-dialog"
          aria-labelledby="shom-dialog-title"
          onClose={() => lastShomTriggerRef.current?.focus()}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const isInside =
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom;
            if (!isInside) closeShomWidget();
          }}
        >
          <div className="shom-sheet">
            <header className="shom-dialog-header">
              <div>
                <p>Source officielle</p>
                <h2 id="shom-dialog-title">Marées à {selectedPort.name}</h2>
              </div>
              <button className="shom-close" type="button" onClick={closeShomWidget}>
                Fermer
              </button>
            </header>
            <div className="shom-dialog-body">
              <ShomTideWidget portId={selectedPort.id} />
              {hasLiveData ? (
                <p className="api-attribution">
                  Données de marée fournies par api-maree.fr sous licence CC BY, calculées à partir
                  de composantes harmoniques Ifremer / PREVIMER, elles-mêmes sous licence CC BY.
                  Données indicatives, impropres à la navigation.
                </p>
              ) : null}
            </div>
          </div>
        </dialog>

        <dialog
          ref={portDialogRef}
          id="port-picker"
          className="port-dialog"
          aria-labelledby="port-picker-title"
          tabIndex={-1}
          onClose={() => {
            setPortQuery("");
            locationButtonRef.current?.focus();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const isInside =
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom;
            if (!isInside) closePortPicker();
          }}
        >
          <div className="port-sheet">
            <span className="sheet-grabber" aria-hidden="true" />

            <header className="port-sheet-header">
              <div>
                <p>Votre littoral</p>
                <h2 id="port-picker-title">Choisir un port</h2>
              </div>
              <button className="sheet-close" type="button" onClick={closePortPicker}>
                Fermer
              </button>
            </header>

            <div className="port-search" role="search">
              <Icon name="search" />
              <label className="sr-only" htmlFor="port-search-input">
                Rechercher un port ou une région
              </label>
              <input
                ref={portSearchRef}
                id="port-search-input"
                type="search"
                value={portQuery}
                onChange={(event) => setPortQuery(event.target.value)}
                placeholder="Rechercher un port"
                autoComplete="off"
                enterKeyHint="search"
                aria-describedby="port-result-count"
              />
              {portQuery ? (
                <button
                  className="port-search-clear"
                  type="button"
                  onClick={() => {
                    setPortQuery("");
                    portSearchRef.current?.focus();
                  }}
                >
                  Effacer
                </button>
              ) : null}
            </div>

            <div className="port-list-heading">
              <span>Ports disponibles</span>
              <span id="port-result-count" role="status" aria-live="polite">
                {filteredPorts.length} résultat{filteredPorts.length > 1 ? "s" : ""}
              </span>
            </div>

            {filteredPorts.length ? (
              <ul className="port-list">
                {filteredPorts.map((port) => {
                  const isSelected = port.id === selectedPort.id;
                  return (
                    <li key={port.id}>
                      <button
                        className={`port-row ${isSelected ? "is-selected" : ""}`}
                        type="button"
                        onClick={() => choosePort(port)}
                        aria-pressed={isSelected}
                      >
                        <span className="port-row-mark" aria-hidden="true">
                          <Icon name="waves" />
                        </span>
                        <span className="port-row-copy">
                          <strong>{port.name}</strong>
                          <small>{port.area}</small>
                        </span>
                        <span className="port-row-meta">
                          <small>SHOM officiel</small>
                          {isSelected ? (
                            <span className="port-check" aria-hidden="true">
                              <Icon name="check" />
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="port-empty" role="status">
                <span className="port-empty-icon" aria-hidden="true">
                  <Icon name="search" />
                </span>
                <strong>Aucun port trouvé</strong>
                <p>
                  Aucun résultat pour «&nbsp;{portQuery}&nbsp;». Essayez un autre nom ou une région.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPortQuery("");
                    portSearchRef.current?.focus();
                  }}
                >
                  Effacer la recherche
                </button>
              </div>
            )}

            <p className="port-demo-note">
              Horaires officiels consultables pour chaque port · animation indicative selon disponibilité
            </p>
          </div>
        </dialog>

        <p className="sr-only" aria-live="polite">
          {portAnnouncement}
        </p>
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {tideAnnouncement}
        </p>
      </section>
    </main>
  );
}
