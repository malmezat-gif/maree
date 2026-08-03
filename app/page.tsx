"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getDayCycle } from "./day-cycle";

type TidePoint = {
  minutes: number;
  height: number;
  kind: "Pleine mer" | "Basse mer";
};

type ForecastDay = {
  date: Date;
  coefficient: number;
  tides: TidePoint[];
};

type Port = {
  id: string;
  name: string;
  area: string;
  coefficient: number;
  timeShift: number;
  heightFactor: number;
  heightOffset: number;
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
  reduceMotion: boolean;
};

const tideTemplate: TidePoint[] = [
  { minutes: -126, height: 4.0, kind: "Pleine mer" },
  { minutes: 208, height: 1.1, kind: "Basse mer" },
  { minutes: 582, height: 3.9, kind: "Pleine mer" },
  { minutes: 958, height: 1.3, kind: "Basse mer" },
  { minutes: 1334, height: 4.1, kind: "Pleine mer" },
  { minutes: 1708, height: 1.2, kind: "Basse mer" },
];

const ports: Port[] = [
  { id: "biarritz", name: "Biarritz", area: "Côte basque", coefficient: 78, timeShift: 0, heightFactor: 1, heightOffset: 0 },
  { id: "saint-jean-de-luz", name: "Saint-Jean-de-Luz", area: "Côte basque", coefficient: 77, timeShift: -18, heightFactor: 0.96, heightOffset: -0.04 },
  { id: "capbreton", name: "Capbreton", area: "Landes", coefficient: 76, timeShift: 14, heightFactor: 0.92, heightOffset: -0.04 },
  { id: "arcachon", name: "Arcachon", area: "Bassin d’Arcachon", coefficient: 72, timeShift: 42, heightFactor: 0.82, heightOffset: -0.12 },
  { id: "la-rochelle", name: "La Rochelle", area: "Charente-Maritime", coefficient: 82, timeShift: 68, heightFactor: 1.15, heightOffset: 0.02 },
  { id: "les-sables", name: "Les Sables-d’Olonne", area: "Vendée", coefficient: 80, timeShift: 54, heightFactor: 1.08, heightOffset: 0 },
  { id: "brest", name: "Brest", area: "Finistère", coefficient: 93, timeShift: 92, heightFactor: 1.38, heightOffset: 0.12 },
  { id: "saint-malo", name: "Saint-Malo", area: "Ille-et-Vilaine", coefficient: 104, timeShift: 138, heightFactor: 1.68, heightOffset: 0.18 },
];

const coefficientDeltas = [0, -4, -10, -17, -24, -30, -35];

type IconName = "waves" | "chevron" | "arrow-up" | "arrow-down" | "play" | "pause" | "search" | "check";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <span className={`ui-icon ui-icon-${name} ${className}`.trim()} aria-hidden="true" />;
}

function buildTidePoints(port: Port): TidePoint[] {
  const core = tideTemplate.map((point) => ({
    ...point,
    minutes: point.minutes + port.timeShift,
    height: Number(Math.max(0.4, point.height * port.heightFactor + port.heightOffset).toFixed(1)),
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

function buildForecast(startDate: Date, port: Port, visibleTides: TidePoint[]): ForecastDay[] {
  const start = new Date(startDate);

  return coefficientDeltas.map((delta, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const shift = index * 48;
    return {
      date,
      coefficient: Math.max(20, Math.min(120, port.coefficient + delta)),
      tides: visibleTides
        .map((point) => ({
          ...point,
          minutes: (point.minutes + shift) % 1440,
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUnderwater, setIsUnderwater] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedPortId, setSelectedPortId] = useState("biarritz");
  const [portQuery, setPortQuery] = useState("");
  const [portAnnouncement, setPortAnnouncement] = useState("");
  const portDialogRef = useRef<HTMLDialogElement>(null);
  const portSearchRef = useRef<HTMLInputElement>(null);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const forecastButtonRef = useRef<HTMLButtonElement>(null);
  const backButtonRef = useRef<HTMLButtonElement>(null);
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
  const tidePoints = useMemo(() => buildTidePoints(selectedPort), [selectedPort]);
  const visibleTides = useMemo(
    () => tidePoints.filter((point) => point.minutes >= 0 && point.minutes < 1440),
    [tidePoints],
  );
  const forecast = useMemo(
    () => buildForecast(currentDate, selectedPort, visibleTides),
    [currentDate, selectedPort, visibleTides],
  );
  const filteredPorts = useMemo(() => {
    const query = normalizeSearch(portQuery);
    if (!query) return ports;
    return ports.filter((port) =>
      normalizeSearch(`${port.name} ${port.area}`).includes(query),
    );
  }, [portQuery]);

  useEffect(() => {
    const now = new Date();
    const currentMinutes =
      (now.getHours() * 60 + Math.round(now.getMinutes() / 5) * 5) % 1440;
    now.setHours(12, 0, 0, 0);
    let savedPort: string | null = null;

    try {
      savedPort = window.localStorage.getItem("maree.selected-port");
    } catch {
      // Le choix reste simplement limité à cette session si le stockage est indisponible.
    }

    const frame = window.requestAnimationFrame(() => {
      setMinutes(currentMinutes);
      setCurrentDate(now);
      if (savedPort && ports.some((port) => port.id === savedPort)) {
        setSelectedPortId(savedPort);
      }
      setSceneReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

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

  const tide = useMemo(() => getTideAt(minutes, tidePoints), [minutes, tidePoints]);
  const dayCycle = useMemo(() => getDayCycle(minutes), [minutes]);
  const tideRange = useMemo(() => {
    const heights = tidePoints.map((point) => point.height);
    return { min: Math.min(...heights), max: Math.max(...heights) };
  }, [tidePoints]);
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
  const activeForecast = forecast[selectedDay];
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
    setMinutes(point.minutes);
    agitateWater();
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
    if (event.pointerType !== "touch" || !event.isPrimary || portDialogRef.current?.open) return;

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
      <section ref={phoneRef} className="phone" aria-label="Prototype de l’application Marée">
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
                <div className="coefficient" aria-label={`Coefficient de marée ${selectedPort.coefficient}`}>
                  <span>Coef.</span>
                  <strong>{selectedPort.coefficient}</strong>
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

              <section className="controls" aria-label="Simuler la marée au fil de la journée">
                <div className="time-row">
                  <div>
                    <p>Heure simulée</p>
                    <strong>{formatTime(minutes)}</strong>
                  </div>
                  <button
                    className={`play ${isPlaying ? "is-playing" : ""}`}
                    type="button"
                    onClick={() => setIsPlaying((playing) => !playing)}
                    aria-label="Lecture automatique de la journée"
                    aria-pressed={isPlaying}
                  >
                    <Icon key={isPlaying ? "pause" : "play"} name={isPlaying ? "pause" : "play"} />
                  </button>
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
                        aria-label={`Aller à ${point.kind.toLowerCase()} à ${formatTime(point.minutes)}, hauteur ${point.height.toFixed(1)} mètres`}
                      >
                        <span className={point.kind === "Pleine mer" ? "event-icon high" : "event-icon low"}>
                          <Icon name={point.kind === "Pleine mer" ? "arrow-up" : "arrow-down"} />
                        </span>
                        <span className="event-copy">
                          <span>{point.kind}</span>
                          <strong>{formatTime(point.minutes)}</strong>
                        </span>
                        <span className="event-height">{point.height.toFixed(1).replace(".", ",")} m</span>
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
                <p className="demo-note">Simulation visuelle · données d’exemple</p>
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
                  aria-label={`${new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(day.date)}, coefficient ${day.coefficient}`}
                >
                  <span>{index === 0 ? "Auj." : new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day.date).replace(".", "")}</span>
                  <strong>{day.date.getDate()}</strong>
                  <small>{day.coefficient}</small>
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
                  <span>Coefficient</span>
                  <strong>{activeForecast.coefficient}</strong>
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
                    <span>{point.height.toFixed(1).replace(".", ",")} m</span>
                  </div>
                ))}
              </div>
              </div>
            </section>

            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              Prévisions pour {new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(activeForecast.date)}, coefficient {activeForecast.coefficient}
            </p>

            <p className="underwater-note">Coefficients et horaires de démonstration</p>
          </section>
        </div>

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
                          <small>Coef. {port.coefficient}</small>
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

            <p className="port-demo-note">Ports et marées simulés pour ce prototype</p>
          </div>
        </dialog>

        <p className="sr-only" aria-live="polite">
          {portAnnouncement}
        </p>
      </section>
    </main>
  );
}
