"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDayCycle } from "./day-cycle";
import { ShomTideWidget, type ShomPortId } from "./shom-tide-widget";

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

type TideLoadState = "loading" | "live" | "demo";

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

type IconName = "waves" | "chevron" | "arrow-up" | "arrow-down" | "play" | "pause" | "search" | "check";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <span className={`ui-icon ui-icon-${name} ${className}`.trim()} aria-hidden="true" />;
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
    },
    ...core,
    {
      minutes: last.minutes + (last.minutes - penultimate.minutes),
      height: penultimate.height,
      kind: penultimate.kind,
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
    rising: end.height >= start.height,
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

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours} h ${mins.toString().padStart(2, "0")}`;
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
    rising: end.height > start.height,
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
  const [sceneReady, setSceneReady] = useState(false);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedPortId, setSelectedPortId] = useState<ShomPortId>("biarritz");
  const [portQuery, setPortQuery] = useState("");
  const [portAnnouncement, setPortAnnouncement] = useState("");
  const [tidesPayload, setTidesPayload] = useState<TidesPayload | null>(null);
  const [tideLoadState, setTideLoadState] = useState<TideLoadState>("loading");
  const [tideAnnouncement, setTideAnnouncement] = useState(
    "Connexion à la source de marée…",
  );
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
  const sliderStartMinutesRef = useRef(12 * 60);
  const screenDragRef = useRef<ScreenDrag | null>(null);

  const selectedPort = useMemo(
    () => ports.find((port) => port.id === selectedPortId) ?? ports[0],
    [selectedPortId],
  );
  const currentDateKey = localDateKey(currentDate);
  const demoTidePoints = useMemo(
    () => buildDemoTidePoints(selectedPort),
    [selectedPort],
  );
  const demoVisibleTides = useMemo(
    () => demoTidePoints.filter((point) => point.minutes >= 0 && point.minutes < 1440),
    [demoTidePoints],
  );
  const demoForecast = useMemo(
    () => buildDemoForecast(currentDate, selectedPort, demoVisibleTides),
    [currentDate, selectedPort, demoVisibleTides],
  );
  const liveForecast = useMemo(
    () => (tidesPayload ? buildLiveForecast(tidesPayload) : null),
    [tidesPayload],
  );
  const hasLiveData = tideLoadState === "live" && liveForecast !== null;
  const forecast = hasLiveData ? liveForecast : demoForecast;
  const visibleTides = hasLiveData && forecast[0]?.tides.length
    ? forecast[0].tides
    : demoVisibleTides;
  const liveLevelsToday = useMemo(
    () =>
      hasLiveData
        ? (tidesPayload?.levels.filter((point) => point.time.slice(0, 10) === currentDateKey) ?? [])
        : [],
    [currentDateKey, hasLiveData, tidesPayload],
  );
  const eventTimeline = useMemo(() => {
    if (!hasLiveData) return demoTidePoints;
    const todayEvents = forecast[0]?.tides ?? [];
    const tomorrowEvents = (forecast[1]?.tides ?? []).map((point) => ({
      ...point,
      minutes: point.minutes + 1440,
    }));
    return [...todayEvents, ...tomorrowEvents];
  }, [demoTidePoints, forecast, hasLiveData]);
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
      setSceneReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function syncClock() {
      const now = new Date();
      const currentMinutes = (now.getHours() * 60 + now.getMinutes()) % 1440;
      setLiveMinutes(currentMinutes);
      if (isFollowingLive) setMinutes(currentMinutes);
      now.setHours(12, 0, 0, 0);
      setCurrentDate(now);
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
        setTideLoadState("demo");
        setTideAnnouncement(
          error instanceof Error && error.message === "service_unconfigured"
            ? "Animation en mode exemple. Les horaires officiels SHOM sont disponibles."
            : "Source animée momentanément indisponible. Les horaires officiels SHOM restent disponibles.",
        );
      }
    }

    const frame = window.requestAnimationFrame(() => {
      setTidesPayload(null);
      setSelectedDay(0);

      if (selectedPortId === "capbreton") {
        setTideLoadState("demo");
        setTideAnnouncement(
          "Animation en mode exemple pour Capbreton. Les horaires officiels SHOM sont disponibles.",
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
    },
    [],
  );

  const tide = useMemo(
    () =>
      (hasLiveData
        ? getLiveTideAt(minutes, liveLevelsToday, eventTimeline)
        : null) ?? getTideAt(minutes, demoTidePoints),
    [demoTidePoints, eventTimeline, hasLiveData, liveLevelsToday, minutes],
  );
  const dayCycle = useMemo(() => getDayCycle(minutes), [minutes]);
  const tideRange = useMemo(() => {
    const heights = hasLiveData && liveLevelsToday.length
      ? liveLevelsToday.map((point) => point.heightM)
      : demoTidePoints.map((point) => point.height);
    return { min: Math.min(...heights), max: Math.max(...heights) };
  }, [demoTidePoints, hasLiveData, liveLevelsToday]);
  const rangeSpan = Math.max(0.5, tideRange.max - tideRange.min);
  const waterLevel = 20 + ((tide.height - tideRange.min) / rangeSpan) * 58;
  const waterShift = ((84 - waterLevel) / 84) * 100;
  const scaleMaximum = Math.max(4, Math.ceil(tideRange.max));
  const levelMarkers = [1, 0.75, 0.5, 0.25].map((ratio) =>
    Math.max(1, Math.round(scaleMaximum * ratio)),
  );
  const today = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(currentDate);
  const activeForecast = forecast[selectedDay] ?? forecast[0];
  const coefficientEvent = eventTimeline.find(
    (point) =>
      point.kind === "Pleine mer" &&
      point.coefficient !== null &&
      point.minutes >= minutes,
  );
  const currentCoefficient = coefficientEvent?.coefficient ?? null;
  const sourceLabel = tideLoadState === "live"
    ? "api-maree.fr"
    : tideLoadState === "loading"
      ? "Connexion…"
      : "Données d’exemple";
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
  } as React.CSSProperties;

  function agitateWater() {
    const water = waterRef.current;
    if (!water || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    water.classList.remove("is-disturbed");
    void water.offsetWidth;
    water.classList.add("is-disturbed");

    if (disturbanceTimerRef.current !== null) {
      window.clearTimeout(disturbanceTimerRef.current);
    }
    disturbanceTimerRef.current = window.setTimeout(() => {
      water.classList.remove("is-disturbed");
      disturbanceTimerRef.current = null;
    }, 1050);
  }

  function jumpToTide(point: TidePoint) {
    setIsPlaying(false);
    setIsFollowingLive(false);
    setMinutes(point.minutes);
    agitateWater();
  }

  function returnToLive() {
    const now = new Date();
    const currentMinutes = (now.getHours() * 60 + now.getMinutes()) % 1440;
    const difference = Math.abs(currentMinutes - minutes);
    setIsPlaying(false);
    setIsFollowingLive(true);
    setLiveMinutes(currentMinutes);
    setMinutes(currentMinutes);
    setSelectedDay(0);
    now.setHours(12, 0, 0, 0);
    setCurrentDate(now);
    if (Math.min(difference, 1440 - difference) >= 30) agitateWater();
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

  function resetScreenDrag(duration = 360) {
    const stack = screenStackRef.current;
    if (!stack) return;
    stack.style.setProperty("--screen-settle-duration", `${duration}ms`);
    window.requestAnimationFrame(() => {
      stack.classList.remove("is-dragging");
      stack.style.removeProperty("--drag-position");
    });
  }

  function handleScreenSwipeStart(event: React.PointerEvent<HTMLDivElement>) {
    if (
      event.pointerType !== "touch" ||
      !event.isPrimary ||
      portDialogRef.current?.open ||
      shomDialogRef.current?.open
    ) return;

    const target = event.target as HTMLElement;
    if (
      target.closest(
        "button, input, select, textarea, a, dialog, [contenteditable], [data-no-screen-swipe]",
      )
    ) {
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
      reduceMotion,
    };

    event.currentTarget.style.setProperty("--drag-position", `${startTranslateY}px`);
    event.currentTarget.classList.add("is-dragging");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleScreenSwipeMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = screenDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (drag.axis === "pending") {
      if (Math.hypot(deltaX, deltaY) < 10) return;
      if (Math.abs(deltaY) < Math.abs(deltaX) * 1.2) {
        screenDragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        resetScreenDrag();
        return;
      }
      drag.axis = "vertical";
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

    screenDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (nextUnderwater !== isUnderwater) {
      if (nextUnderwater) showForecast(false);
      else hideForecast(false);
    }
    resetScreenDrag(settleDuration);
  }

  return (
    <main className="app-stage">
      <section ref={phoneRef} className="phone" aria-label="Application Marée">
        <div
          ref={screenStackRef}
          className={isUnderwater ? "screen-stack is-underwater" : "screen-stack"}
          onPointerDown={handleScreenSwipeStart}
          onPointerMove={handleScreenSwipeMove}
          onPointerUp={(event) => finishScreenSwipe(event)}
          onPointerCancel={(event) => finishScreenSwipe(event, true)}
          onLostPointerCapture={(event) => finishScreenSwipe(event, true)}
        >
          <section
            className={`surface-screen phase-${dayCycle.phase} ${sceneReady ? "scene-ready" : "scene-pending"}${isPlaying ? " is-playing" : ""}`}
            style={atmosphereStyle}
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
              <div className="horizon-haze" />
            </div>

            <div
              ref={waterRef}
              className="water"
              style={{ "--water-shift": `${waterShift}%` } as React.CSSProperties}
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
              <div className="toy-boat">
                <span className="boat-flag" />
                <span className="boat-mast" />
                <span className="boat-sail" />
                <span className="boat-lantern" />
                <span className="boat-hull" />
                <span className="boat-ripple" />
              </div>
              <div className="water-glint" />
            </div>

            <div className="interface">
              <header className="topbar">
                <div>
                  <div className="brand">
                    <span className="brand-mark" aria-hidden="true"><Icon name="waves" /></span>
                    <span>Marée</span>
                  </div>
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
                      : `Coefficient ${hasLiveData ? "estimé" : "d’exemple"} de la prochaine pleine mer : ${currentCoefficient}`
                  }
                >
                  <span>Coef.</span>
                  <strong className="coefficient-value">{currentCoefficient ?? "—"}</strong>
                  <small className="coefficient-caption">
                    {hasLiveData ? "estimé" : "exemple"}
                  </small>
                </div>
              </header>

              <section className="tide-reading">
                <p className="date">
                  <span>{today}</span>
                  <span className="day-phase">
                    <span className="phase-orb" aria-hidden="true" />
                    {dayCycle.label}
                  </span>
                </p>
                <p className="direction">
                  <Icon name="arrow-up" className={tide.rising ? "arrow rising" : "arrow falling"} />
                  Marée {tide.rising ? "montante" : "descendante"}
                </p>
                <h1>
                  <span className="height-value">{tide.height.toFixed(1).replace(".", ",")}</span>
                  <span className="height-unit">m</span>
                </h1>
                <p className="next-tide">
                  {tide.next.kind} dans {formatDuration(tide.minutesUntilNext)}
                </p>
              </section>

              <div className="level-marker" aria-hidden="true">
                {levelMarkers.map((marker, index) => (
                  <span key={`${marker}-${index}`}>{marker} m</span>
                ))}
              </div>

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

                <label className="sr-only" htmlFor="time-slider">
                  Choisir l’heure de la journée
                </label>
                <input
                  id="time-slider"
                  className="time-slider"
                  type="range"
                  min="0"
                  max="1435"
                  step="1"
                  value={minutes}
                  aria-valuetext={`${formatTime(minutes)}, ${dayCycle.label.toLowerCase()}, hauteur ${tide.height.toFixed(1).replace(".", ",")} mètres, marée ${tide.rising ? "montante" : "descendante"}`}
                  onPointerDown={() => {
                    sliderStartMinutesRef.current = minutes;
                  }}
                  onPointerUp={(event) => {
                    const value = Number(event.currentTarget.value);
                    const difference = Math.abs(value - sliderStartMinutesRef.current);
                    if (Math.min(difference, 1440 - difference) >= 75) agitateWater();
                  }}
                  onChange={(event) => {
                    setIsPlaying(false);
                    setIsFollowingLive(false);
                    setMinutes(Number(event.target.value));
                  }}
                  style={{ "--progress": `${(minutes / 1435) * 100}%` } as React.CSSProperties}
                />
                <div className="range-labels" aria-hidden="true">
                  <span>00:00</span>
                  <span>Midi</span>
                  <span>24:00</span>
                </div>

                <div className="tide-events">
                  {visibleTides.map((point) => {
                    const isActive = minutes === point.minutes;
                    return (
                      <button
                        className={`event ${isActive ? "is-active" : ""}`}
                        key={point.minutes}
                        type="button"
                        onClick={() => jumpToTide(point)}
                        aria-pressed={isActive}
                        aria-label={`Aller à ${point.kind.toLowerCase()} à ${formatTime(point.minutes)}, hauteur ${point.height.toFixed(1)} mètres${point.coefficient === null ? "" : `, coefficient ${point.coefficient}`}`}
                      >
                        <span className={point.kind === "Pleine mer" ? "event-icon high" : "event-icon low"}>
                          <Icon name={point.kind === "Pleine mer" ? "arrow-up" : "arrow-down"} />
                        </span>
                        <span className="event-copy">
                          <span>{point.kind}</span>
                          <strong>{formatTime(point.minutes)}</strong>
                        </span>
                        <span className="event-height">
                          {point.height.toFixed(1).replace(".", ",")} m
                          {point.coefficient === null ? null : <small> · {point.coefficient}</small>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  ref={forecastButtonRef}
                  className="forecast-button"
                  type="button"
                  onClick={() => showForecast()}
                >
                  <span>Voir les prochains jours</span>
                  <span className="dive-arrow" aria-hidden="true"><Icon name="arrow-down" /></span>
                </button>
                <div className="data-provenance">
                  <span
                    className={`source-badge ${hasLiveData ? "source-badge--live" : "source-badge--demo"}`}
                  >
                    {sourceLabel}
                  </span>
                  <button
                    className="source-badge source-badge--official"
                    type="button"
                    data-no-screen-swipe
                    aria-haspopup="dialog"
                    aria-controls="shom-tide-dialog"
                    onClick={(event) => openShomWidget(event.currentTarget)}
                  >
                    Horaires officiels SHOM
                  </button>
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
            <div className="seabed" aria-hidden="true">
              <span className="sand-ridge ridge-back" />
              <span className="sand-ridge ridge-front" />
              <span className="seabed-rock rock-one" />
              <span className="seabed-rock rock-two" />
              <span className="seabed-rock rock-three" />
              <span className="seagrass grass-one" />
              <span className="seagrass grass-two" />
              <span className="seagrass grass-three" />
              <span className="seabed-shell" />
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
                <h2>{selectedPort.name}</h2>
              </div>
              <span className="forecast-depth">7 jours</span>
            </header>

            <div className="underwater-intro">
              <p>Plongeons un peu plus loin</p>
              <h3 id="forecast-section-title">Les marées à venir</h3>
            </div>

            <div className="calendar" role="group" aria-label="Choisir un jour" data-no-screen-swipe>
              {forecast.map((day, index) => (
                <button
                  className={`day-button ${selectedDay === index ? "is-selected" : ""}`}
                  type="button"
                  key={day.date.toISOString()}
                  onClick={() => setSelectedDay(index)}
                  aria-pressed={selectedDay === index}
                  aria-current={index === 0 ? "date" : undefined}
                  aria-label={`${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(day.date)}, coefficient ${hasLiveData ? "estimé" : "d’exemple"} ${coefficientsLabel(day.coefficients)}`}
                >
                  <span>{index === 0 ? "Auj." : new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day.date).replace(".", "")}</span>
                  <strong>{day.date.getDate()}</strong>
                  <small>{coefficientsLabel(day.coefficients)}</small>
                </button>
              ))}
            </div>

            <section className="forecast-card">
              <div className="forecast-card-content" key={activeForecast.date.toISOString()}>
              <div className="forecast-card-heading">
                <div>
                  <p>{new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(activeForecast.date)}</p>
                  <h4>{new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(activeForecast.date)}</h4>
                </div>
                <div className="forecast-coef">
                  <span>Coef. {hasLiveData ? "estimé" : "exemple"}</span>
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
                      {point.height.toFixed(1).replace(".", ",")} m
                      {point.coefficient === null ? null : <small> · coef. {point.coefficient}</small>}
                    </span>
                  </div>
                ))}
              </div>
              </div>
            </section>

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

            <p className="underwater-note">
              {hasLiveData ? "Données api-maree.fr · " : "Animation avec données d’exemple · "}
              Prévisions indicatives — non destinées à la navigation
            </p>
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
