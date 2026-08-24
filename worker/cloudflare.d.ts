/**
 * Les quatre symboles Cloudflare que ce projet utilise réellement, déclarés ici
 * plutôt qu'installés.
 *
 * `@cloudflare/workers-types` serait le réflexe, et c'est le mauvais ici pour
 * trois raisons. Le paquet est versionné par date de compatibilité, donc il
 * faudrait le tenir aligné sur la `compatibility_date` du script de déploiement
 * à chaque changement. Il déclare des globaux — `Response`, `Request`,
 * `ReadableStream`, `fetch` — qui entrent en collision avec `lib: ["dom"]`, et
 * ce dépôt n'a qu'un seul `tsconfig.json` pour le Worker et pour tout le code
 * React côté navigateur : il faudrait scinder la configuration. Enfin il apporte
 * des centaines de types pour un usage qui en touche quatre.
 *
 * Si le projet se met un jour à utiliser Durable Objects, R2 ou les queues, le
 * calcul s'inverse — mais alors la scission du tsconfig devient nécessaire en
 * même temps, et c'est une décision à prendre pour de bon, pas pour faire taire
 * quatre erreurs.
 */

/** Le binding d'assets statiques de Cloudflare Pages. */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

/**
 * Réécriture en flux du HTML de réponse. Seule la surface employée par
 * `worker/index.ts` est décrite : `on()` avec un gestionnaire d'élément, et
 * `transform()`. Le vrai HTMLRewriter en fait bien davantage, mais un type plus
 * large serait du contrat non exercé.
 */
declare class HTMLRewriter {
  on(
    selector: string,
    handlers: { element(element: { setAttribute(name: string, value: string): void }): void },
  ): HTMLRewriter;
  transform(response: Response): Response;
}

/**
 * Les variables d'environnement du Worker. `Record<string, string | undefined>`
 * plutôt que `any` : c'est ce qui rend utile la lecture de `API_MAREE_KEY` dans
 * `app/api/tides/route.ts`, où une faute de frappe passait jusqu'ici inaperçue
 * à la compilation parce que le module non résolu retombait sur `any`.
 */
declare module "cloudflare:workers" {
  export const env: Record<string, string | undefined>;
}
