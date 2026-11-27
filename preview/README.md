# Review preview (not published)

A standalone prototype of the proposed homepage and tour changes, built on the restored site (gh-pages `a03dba7`) with real product screenshots. It is not part of the GitHub Pages build.

- `index.html` – page source (artifact format, no document skeleton)
- `standalone.html` – locally runnable copy; regenerate with `./build-standalone.sh`
- `ba/` – before/after captures (1440×900 and 390×844, Chromium)
- `media/interactions.mp4` – uncut scroll and hover recording
- `media/tour.mp4` – the current 5:35 narrated tour, unchanged

Run locally: `cd preview && python3 -m http.server 8090`, then open http://localhost:8090/standalone.html

The production version belongs in the private `website/` source (React + Framer Motion) once approved.
