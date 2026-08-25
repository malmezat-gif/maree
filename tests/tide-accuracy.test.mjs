import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { predictCoefficients, predictExtrema, predictLevels } from "../lib/harmonic-tides.ts";

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

  test("un coefficient est toujours attaché à sa propre pleine mer", () => {
    // La version précédente rendait un `number[]` dont les pleines mers sans
    // correspondance étaient simplement absentes, et l'appelant lisait ce
    // tableau par position : une marée non appariée décalait toutes les
    // suivantes d'un cran. Le coefficient affiché était alors celui de la marée
    // d'à côté, sous l'étiquette « calculé ».
    //
    // L'invariant qui rend ce décalage inexprimable : chaque coefficient porte
    // la minute de la marée qu'il qualifie, et cette minute est celle d'une
    // vraie pleine mer du jour.
    const ports = [
      "biarritz",
      "saint-jean-de-luz",
      "capbreton",
      "arcachon",
      "la-rochelle",
      "les-sables",
      "brest",
      "saint-malo",
    ];

    let verifies = 0;
    for (const port of ports) {
      for (let jour = 0; jour < 40; jour += 1) {
        const dateKey = new Date(Date.UTC(2026, 7, 1 + jour)).toISOString().slice(0, 10);

        const pleinesMers = new Set(
          predictExtrema(port, dateKey)
            .filter((e) => e.kind === "Pleine mer" && e.minutes >= 0 && e.minutes < 1440)
            .map((e) => e.minutes),
        );

        for (const entree of predictCoefficients(port, dateKey)) {
          assert.ok(
            pleinesMers.has(entree.minutes),
            `${port} ${dateKey} : coefficient ${entree.coefficient} rattaché à ${entree.minutes} min, qui n'est pas une pleine mer du jour`,
          );
          assert.ok(
            entree.coefficient >= 20 && entree.coefficient <= 120,
            `${port} ${dateKey} : coefficient ${entree.coefficient} hors de l'échelle 20-120`,
          );
          verifies += 1;
        }
      }
    }
    assert.ok(verifies > 400, `échantillon trop maigre : ${verifies} coefficients`);
  });

  test("le prédicteur donne toujours de quoi interpoler — le garde-fou reste dormant", () => {
    // getTideAt interpole entre deux extrema. Le garde-fou de buildTidePoints
    // bascule sur la courbe de démonstration en dessous de deux, mais ce chemin
    // ne peut pas être atteint par un test sans injecter un prédicteur truqué :
    // ce test vérifie donc que la condition ne se produit jamais aujourd'hui, et
    // sert d'alarme si une modification des constantes la rendait atteignable.
    const ports = [
      "biarritz",
      "saint-jean-de-luz",
      "capbreton",
      "arcachon",
      "la-rochelle",
      "les-sables",
      "brest",
      "saint-malo",
    ];

    for (const port of ports) {
      for (let jour = 0; jour < 60; jour += 1) {
        const dateKey = new Date(Date.UTC(2026, 0, 1 + jour * 6)).toISOString().slice(0, 10);
        const total = predictExtrema(port, dateKey).length;
        assert.ok(
          total >= 2,
          `${port} ${dateKey} : ${total} extremum — getTideAt ne peut plus interpoler`,
        );
      }
    }
  });

  test("l'écart aux annuaires officiels reste dans les bornes mesurées", () => {
    // Relevés contre maree.info, qui republie les prédictions SHOM. Ce test ne
    // prétend pas que l'app est exacte — elle ne l'est pas, et ne peut pas
    // l'être : prédiction astronomique seule, sans surcote météo, sur des
    // constantes TICON-4 qui ne sont pas les tables officielles. Il fige ce que
    // vaut réellement l'écart, pour qu'une modification qui le dégrade se voie.
    //
    // Ce que ces relevés ont établi, le 22 août 2026 :
    //   · le timing est bon — 3 minutes sur les ports à faible marnage, 6 à
    //     Saint-Malo, et jusqu'à 9 minutes en morte-eau où un extremum plat se
    //     date mal ;
    //   · les hauteurs portent un biais POSITIF d'environ +7,5 cm à
    //     Saint-Jean-de-Luz et à Brest, stable de la morte-eau à la vive-eau,
    //     mais ABSENT à Saint-Malo (−1,8 cm de moyenne).
    //
    // Il n'est donc pas proportionnel au marnage, ce qui écarte une erreur
    // d'amplitude et oriente vers un écart de datum propre à certaines
    // stations. Trois ports sur un ou deux jours ne suffisent pas à corriger un
    // datum : le biais est consigné, pas compensé.
    const RELEVES = [
      {
        port: "saint-jean-de-luz", date: "2026-08-28", regime: "vive-eau",
        attendu: [["PM", 329, 4.01], ["BM", 689, 0.85], ["PM", 1059, 4.32], ["BM", 1431, 0.69]],
      },
      {
        port: "saint-jean-de-luz", date: "2026-08-22", regime: "morte-eau",
        attendu: [["PM", 29, 3.01], ["BM", 398, 1.98], ["PM", 794, 3.17], ["BM", 1172, 1.89]],
      },
      {
        port: "brest", date: "2026-08-28", regime: "vive-eau",
        attendu: [["BM", 3, 1.50], ["PM", 361, 6.56], ["BM", 737, 1.53], ["PM", 1097, 6.92]],
      },
      {
        port: "saint-malo", date: "2026-08-28", regime: "vive-eau",
        attendu: [["BM", 166, 2.21], ["PM", 496, 11.40], ["BM", 904, 2.24], ["PM", 1231, 11.91]],
      },
    ];

    for (const releve of RELEVES) {
      const obtenus = predictExtrema(releve.port, releve.date)
        .filter((e) => e.minutes >= 0 && e.minutes < 1440);

      assert.equal(
        obtenus.length,
        releve.attendu.length,
        `${releve.port} ${releve.date} : ${obtenus.length} extrema contre ${releve.attendu.length} à l'annuaire`,
      );

      releve.attendu.forEach(([type, minutes, hauteur], index) => {
        const obtenu = obtenus[index];
        const attenduPleine = type === "PM";
        assert.equal(
          obtenu.kind === "Pleine mer",
          attenduPleine,
          `${releve.port} ${releve.date} : marée ${index + 1} de mauvais type`,
        );

        const ecartTemps = Math.abs(obtenu.minutes - minutes);
        assert.ok(
          ecartTemps <= 12,
          `${releve.port} ${releve.date} (${releve.regime}) : marée ${index + 1} à ${ecartTemps} min de l'annuaire — au-delà des 12 min tolérées`,
        );

        const ecartHauteur = Math.abs(obtenu.heightM - hauteur) * 100;
        assert.ok(
          ecartHauteur <= 20,
          `${releve.port} ${releve.date} (${releve.regime}) : marée ${index + 1} à ${ecartHauteur.toFixed(0)} cm de l'annuaire — au-delà des 20 cm tolérés`,
        );
      });
    }
  });
});
