import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

/**
 * Démarre le serveur de production du projet et attend qu'il réponde.
 *
 * `npm test` fait déjà `npm run build` avant, donc `dist/` existe : on sert le
 * vrai bundle, pas le serveur de développement, pour que ce qui est mesuré soit
 * ce qui sera déployé.
 */
const PORT = 4319; // hors des ports usuels de dev, pour ne pas heurter un `npm run dev` ouvert
const ORIGIN = `http://127.0.0.1:${PORT}`;
const DEMARRAGE_MAX_MS = 90_000;

export async function startPreviewServer() {
  // `new URL(...).pathname` rend un chemin percent-encodé, et ce dépôt vit dans
  // un dossier dont le nom contient des espaces : sans fileURLToPath, le spawn
  // échoue sur un répertoire qui n'existe pas.
  const racine = fileURLToPath(new URL("../..", import.meta.url));

  // Sans ce contrôle, la boucle d'attente plus bas prend « quelque chose répond
  // sur 4319 » pour « mon serveur est prêt ». Un orphelin d'une exécution
  // précédente sert alors un `dist/` écrasé depuis : la page arrive sans CSS et
  // les mesures portent sur un rendu qui n'existe plus. Ça s'est produit, et le
  // symptôme — des contrastes et des insets absurdes — ne désigne pas sa cause.
  if (!(await portLibre(PORT))) {
    throw new Error(
      `le port ${PORT} est déjà occupé.\n` +
        "Un serveur d'un lancement précédent y répond sans doute encore. Les\n" +
        "mesures porteraient sur SON build, pas sur celui qu'on vient de faire.\n" +
        `Pour le retrouver : lsof -nP -iTCP:${PORT} -sTCP:LISTEN`,
    );
  }

  // `detached` place le fils dans son propre groupe de processus. `npx` n'est
  // qu'une enveloppe : lui envoyer SIGTERM laisse le vrai serveur vivant, et
  // c'est ainsi que naissent les orphelins que le contrôle ci-dessus attrape.
  // On tue le groupe entier.
  const child = spawn("npx vinext start", {
    shell: true,
    detached: true,
    cwd: racine,
    env: { ...process.env, PORT: String(PORT), WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let journal = "";
  child.stdout.on("data", (bloc) => { journal += bloc; });
  child.stderr.on("data", (bloc) => { journal += bloc; });

  const debut = Date.now();
  while (Date.now() - debut < DEMARRAGE_MAX_MS) {
    if (child.exitCode !== null) {
      throw new Error(`le serveur s'est arrêté (code ${child.exitCode})\n${journal}`);
    }
    try {
      const reponse = await fetch(ORIGIN, { signal: AbortSignal.timeout(2000) });
      if (reponse.ok) {
        await reponse.text();
        return {
          origin: ORIGIN,
          async close() {
            await tuerLeGroupe(child);
          },
        };
      }
    } catch {
      // Pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await tuerLeGroupe(child);
  throw new Error(`le serveur n'a pas répondu en ${DEMARRAGE_MAX_MS} ms\n${journal}`);
}

/** Vrai si personne n'écoute déjà sur ce port. */
function portLibre(port) {
  return new Promise((resolve) => {
    const sonde = createServer();
    sonde.once("error", () => resolve(false));
    sonde.once("listening", () => sonde.close(() => resolve(true)));
    sonde.listen(port, "127.0.0.1");
  });
}

/** Termine le serveur ET ses descendants, puis attend que le port soit rendu. */
async function tuerLeGroupe(child) {
  const groupe = -child.pid;
  try { process.kill(groupe, "SIGTERM"); } catch { /* déjà mort */ }
  for (let i = 0; i < 40; i++) {
    if (await portLibre(PORT)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  try { process.kill(groupe, "SIGKILL"); } catch { /* déjà mort */ }
  for (let i = 0; i < 20; i++) {
    if (await portLibre(PORT)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`le port ${PORT} n'a pas été rendu après SIGKILL`);
}
