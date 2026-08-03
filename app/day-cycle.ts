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
  const daylight = clamp(sunAltitude * 1.05 + twilight * 0.18);
  const night = clamp(1 - daylight - twilight * 0.35);
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
    sunY: 70 - sunAltitude * 57,
    moonX: 8 + moonProgress * 84,
    moonY: 63 - Math.sin(moonProgress * Math.PI) * 48,
  };
}
