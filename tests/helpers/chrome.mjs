import { spawn } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";

/**
 * Un client CDP minimal, sans dépendance.
 *
 * Le projet n'a qu'une dépendance d'exécution et ce n'est pas un test qui va en
 * ajouter une : Node 23 expose `WebSocket` en global et Chrome est déjà installé
 * sur la machine, donc `--remote-debugging-port` suffit. Ce que ce fichier
 * apporte par rapport à une simple évaluation de script, c'est la capture
 * d'écran et la lecture des pixels rendus — la seule façon de mesurer un
 * contraste réel à travers un `backdrop-filter`, un dégradé et une illustration.
 */

const CANDIDATS = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export async function findChrome() {
  for (const chemin of CANDIDATS) {
    try {
      await access(chemin);
      return chemin;
    } catch {
      // suivant
    }
  }
  return null;
}

export async function launchBrowser() {
  const binaire = await findChrome();
  if (!binaire) throw new Error("aucun navigateur de la famille Chrome trouvé");

  const profil = await mkdtemp(join(tmpdir(), "maree-cdp-"));
  const child = spawn(binaire, [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profil}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  // Chrome annonce son port sur stderr : « DevTools listening on ws://… ».
  const urlSocket = await new Promise((resolve, reject) => {
    let tampon = "";
    const delai = setTimeout(() => reject(new Error(`Chrome n'a pas annoncé son port\n${tampon}`)), 30_000);
    child.stderr.on("data", (bloc) => {
      tampon += bloc;
      const trouve = tampon.match(/ws:\/\/[^\s]+/);
      if (trouve) { clearTimeout(delai); resolve(trouve[0]); }
    });
    child.once("exit", (code) => { clearTimeout(delai); reject(new Error(`Chrome s'est arrêté (${code})\n${tampon}`)); });
  });

  return {
    async newPage(largeur, hauteur) { return openPage(urlSocket, largeur, hauteur); },
    async close() {
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        child.once("exit", resolve);
        setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000);
      });
      await rm(profil, { recursive: true, force: true });
    },
  };
}

async function openPage(urlNavigateur, largeur, hauteur) {
  const base = urlNavigateur.replace(/^ws:\/\//, "http://").replace(/\/devtools\/browser\/.*$/, "");
  const cible = await (await fetch(`${base}/json/new?about:blank`, { method: "PUT" })).json();
  const socket = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let identifiant = 0;
  const attentes = new Map();
  socket.addEventListener("message", (evenement) => {
    const message = JSON.parse(evenement.data);
    const attente = attentes.get(message.id);
    if (!attente) return;
    attentes.delete(message.id);
    if (message.error) attente.reject(new Error(`${message.error.message} (${attente.methode})`));
    else attente.resolve(message.result);
  });

  const envoyer = (methode, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++identifiant;
      attentes.set(id, { resolve, reject, methode });
      socket.send(JSON.stringify({ id, method: methode, params }));
    });

  await envoyer("Page.enable");
  await envoyer("Runtime.enable");
  await envoyer("Emulation.setDeviceMetricsOverride", {
    width: largeur, height: hauteur, deviceScaleFactor: 1, mobile: true,
  });

  return {
    async goto(url) {
      await envoyer("Page.navigate", { url });
      // Le rendu de la scène est piloté par des variables et des transitions ;
      // mesurer trop tôt donne l'état de départ, pas celui qu'on veut vérifier.
      await new Promise((resolve) => setTimeout(resolve, 2500));
    },
    async evaluate(fonction, argument) {
      const resultat = await envoyer("Runtime.evaluate", {
        expression: `(${fonction.toString()})(${JSON.stringify(argument ?? null)})`,
        awaitPromise: true,
        returnByValue: true,
      });
      if (resultat.exceptionDetails) {
        throw new Error(resultat.exceptionDetails.exception?.description ?? "évaluation en échec");
      }
      return resultat.result.value;
    },
    /** Couleurs réellement rendues, lues dans une capture d'écran. */
    async samplePixels(points) {
      const capture = await envoyer("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const image = decodePng(Buffer.from(capture.data, "base64"));
      return points.map(({ x, y }) => image.at(Math.round(x), Math.round(y)));
    },
    async setRootFontSize(px) {
      await this.evaluate((taille) => {
        document.documentElement.style.setProperty("font-size", `${taille}px`, "important");
      }, px);
      await new Promise((resolve) => setTimeout(resolve, 400));
    },
    async close() { socket.close(); },
  };
}

/**
 * Décodeur PNG minimal : profondeur 8, couleur vraie avec ou sans alpha.
 * C'est ce que produit `Page.captureScreenshot`, et rien d'autre n'est géré —
 * un décodeur généraliste serait du code non exercé.
 */
function decodePng(tampon) {
  if (tampon.readUInt32BE(0) !== 0x89504e47) throw new Error("ce n'est pas un PNG");

  let position = 8;
  let largeur = 0, hauteur = 0, typeCouleur = 0, profondeur = 0;
  const morceaux = [];

  while (position < tampon.length) {
    const taille = tampon.readUInt32BE(position);
    const type = tampon.toString("ascii", position + 4, position + 8);
    const donnees = tampon.subarray(position + 8, position + 8 + taille);
    if (type === "IHDR") {
      largeur = donnees.readUInt32BE(0);
      hauteur = donnees.readUInt32BE(4);
      profondeur = donnees[8];
      typeCouleur = donnees[9];
    } else if (type === "IDAT") {
      morceaux.push(donnees);
    } else if (type === "IEND") {
      break;
    }
    position += 12 + taille;
  }

  if (profondeur !== 8 || (typeCouleur !== 2 && typeCouleur !== 6)) {
    throw new Error(`PNG non géré : profondeur ${profondeur}, type ${typeCouleur}`);
  }

  const canaux = typeCouleur === 6 ? 4 : 3;
  const brut = inflateSync(Buffer.concat(morceaux));
  const parLigne = largeur * canaux;
  const pixels = Buffer.alloc(hauteur * parLigne);

  for (let ligne = 0; ligne < hauteur; ligne += 1) {
    const filtre = brut[ligne * (parLigne + 1)];
    const source = brut.subarray(ligne * (parLigne + 1) + 1, (ligne + 1) * (parLigne + 1));
    const sortie = pixels.subarray(ligne * parLigne, (ligne + 1) * parLigne);
    const dessus = ligne > 0 ? pixels.subarray((ligne - 1) * parLigne, ligne * parLigne) : null;

    for (let i = 0; i < parLigne; i += 1) {
      const gauche = i >= canaux ? sortie[i - canaux] : 0;
      const haut = dessus ? dessus[i] : 0;
      const diagonale = dessus && i >= canaux ? dessus[i - canaux] : 0;
      let valeur = source[i];
      if (filtre === 1) valeur += gauche;
      else if (filtre === 2) valeur += haut;
      else if (filtre === 3) valeur += (gauche + haut) >> 1;
      else if (filtre === 4) {
        const p = gauche + haut - diagonale;
        const dg = Math.abs(p - gauche), dh = Math.abs(p - haut), dd = Math.abs(p - diagonale);
        valeur += dg <= dh && dg <= dd ? gauche : dh <= dd ? haut : diagonale;
      }
      sortie[i] = valeur & 0xff;
    }
  }

  return {
    largeur,
    hauteur,
    at(x, y) {
      const bornéX = Math.max(0, Math.min(largeur - 1, x));
      const bornéY = Math.max(0, Math.min(hauteur - 1, y));
      const index = bornéY * parLigne + bornéX * canaux;
      return { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2] };
    },
  };
}

/** Luminance relative WCAG. */
export function luminance({ r, g, b }) {
  const canal = (valeur) => {
    const v = valeur / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Rapport de contraste WCAG entre deux couleurs rendues. */
export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
