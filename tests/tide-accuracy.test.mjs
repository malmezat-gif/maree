import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { predictExtrema, predictLevels } from "../lib/harmonic-tides.ts";

/**
 * Justesse des horaires — le seul endroit qui vérifie que l'heure affichée est
 * bien l'heure qu'il sera.
 *
 * Les autres suites vérifient le source et les pixels. Aucune ne pouvait voir
 * qu'une marée était fausse d'une heure, et c'est exactement ce qui est arrivé :
 * `predictExtrema` rendait des minutes réelles écoulées depuis minuit à Paris,
 * que l'interface affichait comme une heure d'horloge. Les deux coïncident tous
 * les jours sauf les deux bascules d'heure, où le décalage UTC change en cours
 * de journée — et là, tout ce qui suit la bascule était faux de 60 minutes.
 *
 * Les heures attendues ci-dessous sont l'heure de Paris de l'instant réel de
 * chaque extremum, obtenue en formatant cet instant dans Europe/Paris.
 */

const hhmm = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Les extrema du jour civil, dans l'ordre, en heure locale affichable. */
function heuresDuJour(port, dateKey) {
  return predictExtrema(port, dateKey)
    .filter((extremum) => extremum.minutes >= 0 && extremum.minutes < 1440)
    .map((extremum) => hhmm(extremum.minutes));
}

describe("justesse des horaires de marée", () => {
  test("un jour ordinaire est inchangé — garde-fou de non-régression", () => {
    assert.deepEqual(heuresDuJour("biarritz", "2026-08-12"), [
      "05:04",
      "11:01",
      "17:21",
      "23:33",
    ]);
  });

  test("une journée civile peut contenir trois extrema", () => {
    // La marée semi-diurne dérive d'environ cinquante minutes par jour, donc un
    // jour civil en contient trois ou quatre. Coder 4 en dur casse deux jours
    // par mois.
    assert.deepEqual(heuresDuJour("biarritz", "2026-08-13"), [
      "05:48",
      "11:47",
      "18:05",
    ]);
  });

  test("passage à l'heure d'été : les marées suivent l'horloge", () => {
    // 29 mars 2026, 02:00 → 03:00. Tout ce qui suit la bascule était rendu une
    // heure trop tôt : l'app affichait 08:13 quand il était 09:13 à Paris.
    assert.deepEqual(heuresDuJour("biarritz", "2026-03-29"), [
      "01:53",
      "09:13",
      "15:32",
      "21:29",
    ]);
  });

  test("passage à l'heure d'hiver : les marées suivent l'horloge", () => {
    // 25 octobre 2026, 03:00 → 02:00. L'app affichait 04:31 pour 03:31.
    const heures = heuresDuJour("biarritz", "2026-10-25");
    for (const attendue of ["03:31", "09:30", "15:47", "21:55"]) {
      assert.ok(
        heures.includes(attendue),
        `${attendue} manque dans [${heures.join(" ")}]`,
      );
    }
  });

  test("la courbe couvre la journée réelle, pas toujours 24 heures", () => {
    // Une journée de bascule fait 23 ou 25 heures. Rendre 144 points de dix
    // minutes quoi qu'il arrive fait déborder l'un et tronquer l'autre.
    // On compte les points, pas la dernière heure affichée : sur un jour de
    // 23 heures l'horloge marque quand même 23:50 à la fin. C'est le nombre de
    // pas de dix minutes qui révèle la durée réelle.
    const points = (dateKey) => predictLevels("biarritz", dateKey).length;

    assert.equal(points("2026-08-12"), 144, "jour ordinaire — 24 h");
    assert.equal(points("2026-03-29"), 138, "jour de 23 h");
    assert.equal(points("2026-10-25"), 150, "jour de 25 h");
  });
});
