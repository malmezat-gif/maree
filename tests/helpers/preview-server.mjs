import { spawn } from "node:child_process";
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
  const child = spawn("npx vinext start", {
    shell: true,
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
            child.kill("SIGTERM");
            await new Promise((resolve) => {
              child.once("exit", resolve);
              setTimeout(() => { child.kill("SIGKILL"); resolve(); }, 3000);
            });
          },
        };
      }
    } catch {
      // Pas encore prêt.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  child.kill("SIGKILL");
  throw new Error(`le serveur n'a pas répondu en ${DEMARRAGE_MAX_MS} ms\n${journal}`);
}
