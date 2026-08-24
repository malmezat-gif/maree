#!/usr/bin/env bash
# Build and publish to Cloudflare Pages -> https://maree-2mo.pages.dev
#
# Pages only reads wrangler.jsonc from the working directory, and a config at
# the repo root would also be picked up by the vinext dev/build tooling, so the
# bundle and its config are assembled in _deploy/ and published from there.
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build

rm -rf _deploy
mkdir -p _deploy/maree/_worker.js
cp -R dist/client/. _deploy/maree/
cp -R dist/server/. _deploy/maree/_worker.js/
rm -rf _deploy/maree/.vite _deploy/maree/_worker.js/.vite

# public/dev is the iPhone test rig. It has to live under public/ to be served
# from the app's own origin — it reaches into the frame to set the safe-area
# insets, which same-origin policy would otherwise refuse — but it is a
# workbench and does not belong on the deployed site. Dropped here rather than
# through .assetsignore, which the copy above overwrites with the build's own.
rm -rf _deploy/maree/dev

# Static paths must bypass the Worker: it answers 404 for /assets/* instead of
# falling through, which leaves the app unstyled. /offline is listed alongside
# /offline.html because Pages redirects the one to the other, and an unexcluded
# /offline sent that redirect straight to the Worker for a 404 — which is why
# the offline fallback page had never once been reachable in production.
cat > _deploy/maree/_routes.json <<'JSON'
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/assets/*", "/icons/*", "/sw.js", "/manifest.webmanifest",
              "/offline.html", "/offline",
              "/apple-touch-icon.png", "/og.png",
              "/file.svg", "/globe.svg", "/window.svg"]
}
JSON

# nodejs_compat is required: the vinext bundle imports node:async_hooks and
# node:path, and without it the Worker dies mid-stream (Pages answers 522).
cat > _deploy/wrangler.jsonc <<'JSON'
{
  "name": "maree",
  "pages_build_output_dir": "maree",
  "compatibility_date": "2026-08-01",
  "compatibility_flags": ["nodejs_compat"]
}
JSON

# Publish from outside the repo: wrangler refuses to run when it finds both a
# user config here and the project's own .wrangler/deploy/config.json, which
# vinext writes at build time and which sits at a different base path.
STAGE="$(mktemp -d)"
cp -R _deploy/. "$STAGE"/
cd "$STAGE"
npx --prefix "$OLDPWD" wrangler pages deploy --branch main --commit-dirty=true
rm -rf "$STAGE"
