# Lydia CRMS website

The built marketing site for Lydia CRMS: the landing page (`index.html`) and the narrated product tour (`product.html`).

This repository only holds the **published output**. The source lives in the private `W0l1-stack/CRM` repo under `website/`; rebuild there with `npm run build` and copy `dist/` here to update the site.

GitHub Pages publishes from the `gh-pages` branch, root folder. Deploy the rebuilt output to `gh-pages` and confirm the Pages run and public URLs for both the landing page and product tour.

The `main` branch also keeps changes to the published output for review. Incorporate output-only changes into the private `website/` source before rebuilding.
