# Marée

Horaires et coefficients de marée pour huit ports de la côte atlantique, avec une
scène côtière qui suit l'heure du jour et le niveau de l'eau.

**En ligne : https://maree-2mo.pages.dev**

PWA installable. Une fois posée sur l'écran d'accueil, elle fonctionne sans
réseau : les marées sont calculées sur l'appareil, pas récupérées.

## Prendre la main

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # build puis suite de tests
npm run deploy   # build et publication sur Cloudflare Pages
```

Node ≥ 22.13. Aucune clé d'API n'est nécessaire.

## Où vit ce projet, et pourquoi

`~/dossier sans titre/maree` — un dossier ordinaire, sous git, sans lien avec
aucun outil.

Il a d'abord vécu dans `~/.codex/.chatgpt-projects/…/marees`. C'était un miroir
d'un projet ChatGPT, et son propre `AGENTS.md` prévenait que les fichiers
pouvaient être remplacés à la création de la tâche suivante. Le 20 août 2026 ils
l'ont été : dix-sept jours de travail et tout l'historique git local ont disparu
d'un coup, parce que le dépôt distant, lui, s'était arrêté au 4 août.

Ce qui a sauvé le projet, c'est que le site déployé était intact. Le prédicteur
harmonique a été relu dans le bundle compilé et revalidé contre des dates dont
on connaissait le rendu réel ; la feuille de style a été réconciliée règle par
règle contre le CSS de production. Le dossier actuel est le résultat, vérifié :
le rendu serveur est identique à la production, caractère pour caractère.

**Ne remets pas ce projet sous `~/.codex/`.** C'est la seule règle qui compte
ici.

## Déploiement

Cloudflare Pages, projet `maree`, en envoi direct — pas d'intégration git, donc
rien à connecter et rien qui puisse se désynchroniser. `npm run deploy` construit
et publie. L'authentification est celle de wrangler, déjà en place.

Le script assemble le bundle dans `_deploy/` puis publie depuis un dossier
temporaire : Pages ne lit `wrangler.jsonc` que dans le répertoire courant, et un
fichier de config à la racine serait aussi ramassé par l'outillage de dev.

## Données

Prédiction harmonique hors-ligne, via `@neaps/tide-predictor` et les constantes
**TICON-4** extraites de la base [Neaps](https://github.com/openwatersio/tide-database)
(CC BY 4.0, usage commercial autorisé, datum LAT). 50 composantes par port,
21,7 Ko de JSON embarqué dans `lib/harmonics/stations.json`.

Deux pièges qui ont coûté du temps et qu'il ne faut pas refaire :

- Les constantes sont référencées au **niveau moyen**, les tables françaises au
  **zéro hydrographique**. La conversion passe par l'option `offset` du
  prédicteur, pas par une addition à la main.
- Le **coefficient** se calcule toujours à Brest — c'est une grandeur nationale.
  L'unité `U = 3,05 m` est la valeur officielle du SHOM, mais le niveau moyen
  doit venir du **datum de la station TICON**, pas des 4,03 m publiés : les
  hauteurs produites sont référencées à cette verticale-là. Mesuré sur les 706
  pleines mers de 2026, le datum station donne min 21 / moyenne 69,2, contre min
  27 / moyenne 74,9 pour la valeur SHOM — pour une échelle dont le minimum est 20
  et la moyenne 70.

C'est de la prédiction **astronomique seule**, sans surcote météo, et ce ne sont
pas les tables officielles. D'où l'étiquette « Calculé » et le lien SHOM
conservés partout, et la mention « non destinées à la navigation ».

## Ce qu'il faut savoir avant de toucher au code

**La mise en page ne se fie pas aux unités de viewport.** Sur un iPhone
installé, `innerHeight` renvoie 873 sur un écran de 932 et la page est décalée de
59. `app/viewport-fit.tsx` mesure la vraie hauteur
(`max(innerHeight, visualViewport.height + offsetTop)`) et l'écrit dans
`--app-height`, que `html`, `body`, `.app-stage` et `.phone` prennent **ensemble**
— `body` étant en `overflow: hidden`, agrandir `.phone` seul ne servirait à rien.

**`viewport-fit=cover` est injecté par le Worker**, dans la réponse. vinext écrit
la balise lui-même et supprime `viewportFit`, et la poser depuis un script après
coup ne marche pas : Safari ne lit cette clé qu'au parse initial.

**Le thème sombre suit `.is-dark`** (`dayCycle.night >= 0.32`), pas le nom de la
phase : « crépuscule » commence à 17:00 en plein jour. La scène est pilotée par
des variables numériques posées sur `.screen-stack`.

**Les tests mesurent, ils ne lisent pas.** `tests/rendering.test.mjs` pilote
Chrome et vérifie des rectangles et des pixels, parce que plusieurs bugs réels
sont passés à travers des assertions sur le source. Ne remplace jamais une
mesure par une lecture de feuille de style. Et ne code jamais en dur quatre
marées par jour : une journée civile en contient trois ou quatre.

## État

Reconstruit et vérifié le 21 août 2026. Restent à restaurer, perdus dans
l'incident : `tests/rendering.test.mjs`, `tests/tide-accuracy.test.mjs`,
`tests/icon-fingerprints.test.mjs`, le banc d'essai iPhone
(`public/dev/iphone-harness.html`) et les scripts `build-sw-precache.mjs` et
`fingerprint-icons.mjs`.
