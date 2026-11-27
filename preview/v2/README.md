# Preview v2 — rebuilt from the current app

Addresses the v1 rejection (unprofessional, squeezed on mobile, weak motion, generic copy, stale images).

All screenshots are captured from the **current** LydiaCRM app: the CRM monorepo (`W0l1-stack/CRM`) was booted locally (Postgres + Go backend + Vite frontend), the demo workspace seeded, and the current UI captured with `website/capture` plus the repo's own `previews/` feature shots.

- `index.html` — page source (artifact format)
- `build.sh` — regenerates `standalone.html` for local viewing
- `img/` — current-app screenshots (webp)
- `media/app-tour.mp4` — 48s silent walkthrough recorded live from the running app
- `media/interactions.mp4` — uncut scroll/hover recording of this preview
- `ba/` — before (live site) / after (v2) comparison captures

Not part of the Pages build; `gh-pages` is untouched.
