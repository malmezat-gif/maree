export type DayPhase = "night" | "dawn" | "day" | "dusk";

export type DayCycle = {
  phase: DayPhase;
  label: string;
  daylight: number;
  night: number;
  dawn: number;
  dusk: number;
  twilight: number;
  moonlight: number;
  sunX: number;
  sunY: number;
  moonX: number;
  moonY: number;
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function getDayCycle(minutes: number): DayCycle {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const sunProgress = clamp((normalized - 330) / 780);
  const sunIsAboveHorizon = normalized >= 330 && normalized <= 1110;
  const sunAltitude = sunIsAboveHorizon ? Math.sin(sunProgress * Math.PI) : 0;
  const dawn = Math.exp(-Math.pow((normalized - 390) / 95, 2));
  const dusk = Math.exp(-Math.pow((normalized - 1110) / 95, 2));
  const twilight = clamp(Math.max(dawn, dusk));
  // Le plateau de jour est atteint bien avant le zénith : `sunAltitude * 3.2`
  // saturé donne une pleine lumière dès que le soleil est franchement levé, et
  // la nuit se creuse symétriquement. Les deux ne sont donc PAS complémentaires
  // — `night` n'est pas `1 - daylight` — et c'est voulu : le crépuscule doit
  // pouvoir être à la fois peu lumineux et pas encore nocturne.
  const solar = clamp(sunAltitude * 3.2);
  const daylight = clamp(solar * 0.96 + twilight * 0.1);
  const night = clamp(1 - solar - twilight * 0.5);
  const moonMinutes = normalized < 1080 ? normalized + 1440 : normalized;
  const moonProgress = clamp((moonMinutes - 1080) / 720);
  const moonlight = Math.sin(moonProgress * Math.PI) * night;

  let phase: DayPhase = "day";
  if (normalized < 300 || normalized >= 1200) phase = "night";
  else if (normalized < 450) phase = "dawn";
  else if (normalized >= 1020) phase = "dusk";

  const labels: Record<DayPhase, string> = {
    night: "Nuit",
    dawn: "Aube",
    day: "Journée",
    dusk: "Crépuscule",
  };

  return {
    phase,
    label: labels[phase],
    daylight,
    night,
    dawn,
    dusk,
    twilight,
    moonlight,
    sunX: 7 + sunProgress * 86,
    sunY: 42 - sunAltitude * 35,
    moonX: 8 + moonProgress * 84,
    moonY: 42 - Math.sin(moonProgress * Math.PI) * 32,
  };
}
