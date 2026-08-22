import assert from "node:assert/strict";
import test, { after, before, describe } from "node:test";
import { startPreviewServer } from "./helpers/preview-server.mjs";
import { contrast, findChrome, launchBrowser } from "./helpers/chrome.mjs";

/**
 * Ce que l'app rend vraiment, mesuré — pas ce que le source dit qu'elle rendra.
 *
 * `rendered-html.test.mjs` lit le source, et c'est un choix assumé du projet ;
 * mais plusieurs défauts réels sont passés à travers avec un source
 * parfaitement correct : un contraste tombé à 2,02:1 quand un conteneur flex a
 * écrasé le calendrier, un panneau de contrôle sorti de l'écran, une bande de
 * couleur au mauvais endroit. Aucun `assert.match` ne pouvait les voir.
 *
 * Tout ici vient donc de `getBoundingClientRect`, de `getComputedStyle` ou d'un
 * pixel relu dans une capture d'écran. Si une assertion peut passer alors que
 * l'écran est faux, c'est la mauvaise assertion.
 */

const CHROME = await findChrome();

let serveur;
let navigateur;

before(async () => {
  if (!CHROME) return;
  serveur = await startPreviewServer();
  navigateur = await launchBrowser();
});

after(async () => {
  await navigateur?.close();
  await serveur?.close();
});

// Un test qui se saute en silence est exactement le mécanisme qui a laissé
// croire que la suite était verte alors que six assertions ne s'exécutaient
// pas. S'il n'y a pas de Chrome, on le dit fort.
if (!CHROME) {
  console.warn(
    "\n  ⚠ rendering.test.mjs IGNORÉ : aucun navigateur de la famille Chrome trouvé.\n" +
      "    Ces tests sont les seuls à mesurer le rendu réel (contrastes, reflow,\n" +
      "    insets, hiérarchie typographique). Les lancer demande Chrome, ou la\n" +
      "    variable CHROME_PATH.\n",
  );
}

/** Ouvre l'app à une taille donnée, avec les insets d'un appareil injectés. */
async function ouvrir({ largeur, hauteur, insetHaut = 0, insetBas = 0, natif = true }) {
  const page = await navigateur.newPage(largeur, hauteur);
  await page.goto(serveur.origin);
  await page.evaluate((ins) => {
    const root = document.documentElement;
    // Inline : ViewportFit écrit --sa-top de cette façon, une règle CSS y perdrait.
    root.style.setProperty("--sa-top-native", ins.natif ? `${ins.haut}px` : "0px");
    root.style.setProperty("--sa-top", `${ins.haut}px`);
    root.style.setProperty("--sa-bottom", `${ins.bas}px`);
  }, { haut: insetHaut, bas: insetBas, natif });
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  return page;
}

/** Déplace l'horloge de l'app et laisse les transitions finir. */
async function reglerHeure(page, minutes) {
  await page.evaluate((valeur) => {
    const curseur = document.getElementById("time-slider");
    const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    poser.call(curseur, String(valeur));
    curseur.dispatchEvent(new Event("input", { bubbles: true }));
  }, minutes);
  // La plus longue transition de la scène est de 620 ms.
  await page.evaluate(() => new Promise((r) => setTimeout(r, 900)));
}

describe("rendu mesuré", { skip: CHROME ? false : "aucun Chrome" }, () => {
  test("les repères de marée restent lisibles sur le sable", async () => {
    // Le seuil vient de l'audit du 21 août : .tide-mark-high mesurait 2,30:1 sur
    // le haut du sable et 2,09:1 sur le bas, contre 4,5 exigé. Après correction
    // (#433822 et un halo clair) : 5,07:1 et 4,61:1. Ce test fige ce gain.
    //
    // On échantillonne à marée basse, quand l'opacité des repères est maximale
    // ET que l'eau s'est retirée du sable : c'est le cas défavorable, et c'est
    // celui qui avait échoué. Le fond est lu dans les pixels rendus — à travers
    // l'illustration et les dégradés — et non calculé depuis la feuille de style.
    const page = await ouvrir({ largeur: 430, hauteur: 932, insetHaut: 59, insetBas: 34, natif: false });
    try {
      const basseMer = await page.evaluate(() => {
        const evenements = [...document.querySelectorAll(".tide-events .event")];
        const index = evenements.findIndex((e) => /basse mer/i.test(e.textContent));
        const heure = evenements[index]?.textContent.match(/(\d{2}):(\d{2})/);
        return heure ? Number(heure[1]) * 60 + Number(heure[2]) : 660;
      });
      await reglerHeure(page, basseMer);

      const mesure = await page.evaluate(() => {
        const marque = document.querySelector(".tide-mark-high");
        if (!marque) return null;
        const r = marque.getBoundingClientRect();
        const style = getComputedStyle(marque);
        return {
          couleurTexte: style.color,
          opacite: Number(style.opacity),
          // Trois points de fond entre le libellé (à gauche) et la valeur (à
          // droite), sur la même ligne que le texte.
          fonds: [0.4, 0.5, 0.6].map((part) => ({
            x: Math.round(r.left + r.width * part),
            y: Math.round(r.top + r.height / 2),
          })),
        };
      });

      assert.ok(mesure, ".tide-mark-high n'est pas rendu");
      assert.ok(mesure.opacite > 0.5, `repère presque invisible (opacité ${mesure.opacite}) — mauvais moment échantillonné`);

      const [r, g, b] = mesure.couleurTexte.match(/[\d.]+/g).map(Number);
      const fonds = await page.samplePixels(mesure.fonds);

      for (const fond of fonds) {
        const rapport = contrast({ r, g, b }, fond);
        assert.ok(
          rapport >= 4.5,
          `repère de pleine mer à ${rapport.toFixed(2)}:1 sur rgb(${fond.r},${fond.g},${fond.b}) — WCAG AA exige 4,5`,
        );
      }
    } finally {
      await page.close();
    }
  });

  test("le contenu hors écran reste atteignable par défilement", async () => {
    // WCAG 1.4.10. Mesuré au banc : l'écran des prévisions perd 18 px sur un
    // iPhone SE à taille normale, davantage en texte agrandi. Le correctif
    // initial visait `.interface`, qui ne déborde jamais — c'est
    // `.forecast-screen` qui perdait le contenu, mention de licence comprise.
    for (const taille of [16, 24]) {
      const page = await ouvrir({ largeur: 375, hauteur: 667, insetHaut: 20, insetBas: 0 });
      try {
        if (taille !== 16) await page.setRootFontSize(taille);
        const verdict = await page.evaluate(() => {
          const ecran = document.querySelector(".forecast-screen");
          const trop = ecran.scrollHeight - ecran.clientHeight;
          if (trop <= 0) return { trop, atteignable: true };
          ecran.scrollTop = 99999;
          const atteint = ecran.scrollTop >= trop - 1;
          ecran.scrollTop = 0;
          return { trop, atteignable: atteint, overflowY: getComputedStyle(ecran).overflowY };
        });
        assert.ok(
          verdict.atteignable,
          `texte à ${taille}px : ${verdict.trop}px de contenu hors écran et inatteignables (overflow-y: ${verdict.overflowY})`,
        );
      } finally {
        await page.close();
      }
    }
  });

  test("les insets sont consommés, et l'appareil a le dernier mot", async () => {
    // Deux règles à la fois. Les insets doivent réellement écarter le contenu ;
    // et ViewportFit ne doit substituer sa propre mesure que si --sa-top-native
    // vaut 0 — là où l'appareil sait répondre, il l'emporte.
    const avecNatif = await ouvrir({ largeur: 430, hauteur: 932, insetHaut: 59, insetBas: 34, natif: true });
    try {
      const lu = await avecNatif.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        const iface = document.querySelector(".interface");
        return {
          saTop: cs.getPropertyValue("--sa-top").trim(),
          paddingHaut: parseFloat(getComputedStyle(iface).paddingTop),
        };
      });
      assert.equal(lu.saTop, "59px", "ViewportFit a écrasé un inset que l'appareil déclarait");
      assert.ok(lu.paddingHaut >= 59, `l'inset haut n'écarte rien : padding ${lu.paddingHaut}px`);
    } finally {
      await avecNatif.close();
    }
  });

  test("la bascule sombre suit le seuil de nuit, pas le nom de la phase", async () => {
    // isDarkSky = dayCycle.night >= 0.32. « Crépuscule » commence à 17:00 en
    // plein jour : à cette heure le libellé annonce le crépuscule et l'interface
    // doit rester claire. Le basculement tombe vers 19:00.
    const page = await ouvrir({ largeur: 430, hauteur: 932 });
    try {
      const clair = await etatScene(page, 17 * 60);
      assert.match(clair.phase, /cr[ée]puscule/i, "17:00 devrait annoncer le crépuscule");
      assert.equal(clair.sombre, false, "17:00 est en plein jour : l'interface ne doit pas basculer");

      const sombre = await etatScene(page, 21 * 60);
      assert.equal(sombre.sombre, true, "21:00 : l'interface doit être en thème sombre");
    } finally {
      await page.close();
    }
  });

  test("la hiérarchie typographique tient ses rangs", async () => {
    // Les tailles relevées au 21 août, dans l'ordre. Ce test ne fige pas les
    // pixels — le rééquilibrage prévu les changera — mais l'ORDRE : la hauteur
    // d'eau domine, la prochaine marée reste sous elle. Si un remaniement
    // inverse deux rangs, c'est une décision, pas un accident.
    const page = await ouvrir({ largeur: 430, hauteur: 932, insetHaut: 59, insetBas: 34, natif: false });
    try {
      const tailles = await page.evaluate(() => {
        const px = (sel) => {
          const n = document.querySelector(sel);
          return n ? parseFloat(getComputedStyle(n).fontSize) : null;
        };
        return {
          hauteur: px(".height-value"),
          heure: px(".time-row strong"),
          port: px(".location-name"),
          coefficient: px(".coefficient-value"),
          prochaine: px(".next-tide"),
        };
      });

      for (const [nom, valeur] of Object.entries(tailles)) {
        assert.ok(valeur > 0, `${nom} n'est pas rendu`);
      }
      assert.ok(tailles.hauteur > tailles.heure, "la hauteur d'eau doit rester l'élément dominant");
      assert.ok(tailles.heure > tailles.coefficient, "l'heure explorée passe avant le coefficient");
      assert.ok(tailles.port > tailles.prochaine, "le nom du port passe avant la prochaine marée");
      assert.ok(tailles.hauteur >= 3 * tailles.prochaine,
        `écart héros/actionnable réduit à ${(tailles.hauteur / tailles.prochaine).toFixed(1)}× — vérifier que c'est voulu`);
    } finally {
      await page.close();
    }
  });
});

async function etatScene(page, minutes) {
  await reglerHeure(page, minutes);
  return page.evaluate(() => ({
    // La pilule de phase a été retirée de `.date` lors du remaniement — elle
    // faisait double emploi avec le ciel. Le libellé subsiste dans
    // `aria-valuetext`, qui reste la seule restitution textuelle de la phase.
    phase: document.getElementById("time-slider")?.getAttribute("aria-valuetext") ?? "",
    sombre: Boolean(document.querySelector(".surface-screen")?.classList.contains("is-dark")),
  }));
}
