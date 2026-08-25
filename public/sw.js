/*
 * Cette application n'a pas besoin du réseau pour faire son travail.
 *
 * `lib/harmonics/stations.json` embarque 50 composantes harmoniques pour chacun
 * des huit ports : les heures et les hauteurs se calculent sur l'appareil. Le
 * réseau n'apporte que les valeurs officielles d'api-maree.fr, plus justes de
 * quelques centimètres, et la vignette du SHOM.
 *
 * La version précédente servait pourtant `offline.html` à la moindre coupure —
 * une page « vous êtes hors connexion » sur un téléphone qui tenait tout le
 * nécessaire. Pour une app de marées, consultée sur la côte là où le réseau est
 * le plus mauvais, c'était renoncer exactement au moment où elle sert.
 *
 * Désormais : la coquille de l'application est conservée et resservie hors
 * ligne, le code de prédiction prend le relais, et `offline.html` ne reste que
 * pour le cas où l'app n'a jamais été ouverte en ligne — il n'y a alors rien à
 * resservir.
 */

const SHELL_CACHE = "maree-shell-v3";
const ASSET_CACHE = "maree-assets-v3";
const CACHE_PREFIX = "maree-";
const SHELL_FILES = ["/offline.html"];

/*
 * Clé unique sous laquelle la coquille est rangée. L'app n'a qu'une route ;
 * ranger sous l'URL demandée créerait autant d'entrées que de variantes de
 * requête pour un même document.
 */
const SHELL_KEY = "/";

/** Les chemins `/assets/...` cités dans un texte — HTML ou feuille de style. */
function assetsCites(texte) {
  return [...new Set([...texte.matchAll(/\/assets\/[A-Za-z0-9._\-/]+/g)].map((m) => m[0]))];
}

/**
 * Remplit le cache dès l'installation, sans attendre une deuxième visite.
 *
 * Le remplissage à l'usage ne suffit pas : lors de la toute première visite, le
 * worker n'est pas encore aux commandes et ne voit passer ni le document ni ses
 * fichiers. Le hors-ligne n'aurait donc fonctionné qu'à partir de la deuxième
 * ouverture — soit précisément pas pour quelqu'un qui installe l'app chez lui
 * et l'ouvre à la plage.
 *
 * On récupère donc la coquille, puis les fichiers qu'elle cite, puis ceux que
 * la feuille de style cite à son tour : l'illustration du fond marin n'apparaît
 * que là, et sans elle la scène serait amputée hors ligne.
 *
 * Un échec ici n'est pas fatal : installation sans réseau, fichier absent. Le
 * remplissage à l'usage reprend le travail à la visite suivante.
 */
async function preremplir() {
  const coquille = await caches.open(SHELL_CACHE);
  await coquille.addAll(SHELL_FILES);

  const reponse = await fetch(SHELL_KEY, { cache: "reload" });
  if (!reponse.ok) return;
  const html = await reponse.text();
  await coquille.put(
    SHELL_KEY,
    new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }),
  );

  const aPrendre = new Set(assetsCites(html));
  const assets = await caches.open(ASSET_CACHE);
  // Sans le spread, et c'est voulu : parcourir directement le `Set` fait visiter
  // les chemins ajoutés PENDANT le parcours, ce qui est tout l'objet de la
  // manœuvre — la feuille de style est lue au passage et ce qu'elle cite entre
  // dans la file. Un `[...aPrendre]` fige la liste et laisse le fond marin
  // dehors ; c'est l'erreur que ce code contenait, invisible tant que le
  // remplissage à l'usage la masquait à la visite suivante.
  for (const chemin of aPrendre) {
    try {
      const fichier = await fetch(chemin, { cache: "reload" });
      if (!canCache(fichier)) continue;
      if (chemin.endsWith(".css")) {
        const feuille = fichier.clone();
        await assets.put(chemin, fichier);
        for (const cite of assetsCites(await feuille.text())) aPrendre.add(cite);
      } else {
        await assets.put(chemin, fichier);
      }
    } catch {
      // Ce fichier sera pris au vol lors d'une prochaine visite.
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    preremplir()
      .catch(() => {
        // Installation sans réseau : le cache se remplira à l'usage.
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) &&
                key !== SHELL_CACHE &&
                key !== ASSET_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function canCache(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  return new URL(response.url).origin === self.location.origin;
}

/**
 * Le nom d'un fichier une fois son empreinte de build retirée.
 *
 * `/assets/index-CdfUywb6.css` et `/assets/index-DIop71yp.css` sont deux builds
 * du même fichier : ils partagent `/assets/index.css`. C'est ce qui permet de
 * reconnaître, et de supprimer, la version périmée.
 *
 * Rend `null` pour un nom stable comme `/assets/coast/coast-v3.webp` : `v3` est
 * une version écrite à la main, pas une empreinte, et un tel fichier ne doit
 * jamais être purgé — il n'a pas de successeur à qui céder la place.
 */
function sansEmpreinte(chemin) {
  const trouve = /^(.*)-[A-Za-z0-9_-]{8,}(\.[a-z0-9]+)$/.exec(chemin);
  return trouve ? trouve[1] + trouve[2] : null;
}

/**
 * Retire du cache les fichiers qu'un nouveau build a remplacés.
 *
 * Sans cela le cache d'assets ne fait que grossir : chaque déploiement y ajoute
 * un jeu complet de fichiers et n'en retire aucun, sur le téléphone de
 * quelqu'un, indéfiniment.
 *
 * La purge est volontairement prudente. Elle ne supprime que les fichiers dont
 * le successeur est présent dans la page qu'on vient de recevoir. Un fichier
 * qu'on ne sait pas rattacher — un morceau chargé à la demande, une image au
 * nom stable — est conservé : mieux vaut garder un fichier de trop que casser
 * le hors-ligne en supprimant quelque chose d'encore utilisé.
 */
async function purgerLesAssetsRemplaces(html) {
  const references = [...html.matchAll(/\/assets\/[A-Za-z0-9._\-/]+/g)].map((m) => m[0]);
  if (references.length === 0) return; // lecture douteuse : on ne purge rien

  const actuels = new Map();
  for (const chemin of references) {
    const cle = sansEmpreinte(chemin);
    if (cle) actuels.set(cle, chemin);
  }
  if (actuels.size === 0) return;

  const cache = await caches.open(ASSET_CACHE);
  for (const requete of await cache.keys()) {
    const chemin = new URL(requete.url).pathname;
    const cle = sansEmpreinte(chemin);
    if (!cle) continue; // nom stable : jamais purgé
    const remplacant = actuels.get(cle);
    if (remplacant && remplacant !== chemin) await cache.delete(requete);
  }
}

/**
 * Documents : réseau d'abord, coquille conservée ensuite.
 *
 * Réseau d'abord parce qu'un rendu serveur frais vaut mieux qu'un rendu de la
 * veille quand la connexion est là. La copie conservée ne sert qu'en repli, et
 * l'application recalcule de toute façon ses horaires à l'hydratation, à partir
 * de l'heure courante : une coquille datée reste juste.
 */
async function navigationResponse(request, event) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const reponse = await fetch(request);
    if (canCache(reponse) && !reponse.redirected) {
      const copie = reponse.clone();
      // `waitUntil` et non `await` : la réponse part vers la page tout de suite,
      // et le worker reste en vie le temps que l'écriture s'achève.
      event.waitUntil(
        copie
          .text()
          .then(async (html) => {
            await cache.put(
              SHELL_KEY,
              new Response(html, {
                status: 200,
                headers: { "Content-Type": "text/html; charset=utf-8" },
              }),
            );
            await purgerLesAssetsRemplaces(html);
          })
          .catch(() => {
            // Une coquille non enregistrée n'empêche pas la navigation en cours.
          }),
      );
    }
    return reponse;
  } catch {
    return (
      (await cache.match(SHELL_KEY)) ||
      (await cache.match("/offline.html")) ||
      new Response("Application hors ligne", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cachedAssetResponse(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (canCache(response)) {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/") ||
    request.headers.get("RSC") === "1" ||
    url.searchParams.has("_rsc")
  ) {
    // `/api/` reste hors cache à dessein : une marée officielle périmée servie
    // silencieusement serait pire qu'une absence de réponse. L'échec de cette
    // requête fait basculer l'app sur son calcul embarqué, ce qui est le
    // comportement voulu hors ligne.
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationResponse(request, event));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cachedAssetResponse(request));
  }
});
