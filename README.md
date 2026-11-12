# Vimaksh website — v6

Continues from v4 (kept in `../site-v4` for comparison). Changes: wordmark-only header; the menu button lives in the navigation stack (fixed bottom-right, folds to just MENU when you scroll); every title left-aligned; the two identity graphics are the heat gradient and crisp pixels; each service has its own colourway of the 3D mark (`public/services/`, made with `tools/render_marks.mjs`); pixel dummy images on About (`src/v5/pixelart.js`).

## Run

    npm install
    npm run dev        # local dev server
    npm run build      # production files in dist/
    npm run pages      # regenerate the HTML pages from tools/v5pages.py

## Pages

- `/` — studio hero (copy top-left, 3D mark centre, stacked nav bottom-right), six work cards with video, about teaser, services teaser.
- `/services/` — Brand, Digital experiences, Product, Research, each with its own live graphic.
- `/about/` — mission, numbers, principles, team (upper-body portraits) and honourable mentions (ChatGPT, Claude).
- `/careers/` — calm page: how we work, open roles, hiring process.
- `/contact/` — "Submit brief" drops a form open (it composes an email: there is no form backend yet); emails and coordinates copy on click.
- `/work/paryatech/`, `/work/wingman/` — project pages, still in the v1 style.

Every page has the light/dark switch and the full-screen menu (dots, top right). Theme choice is remembered.

## Files

- `tools/v5pages.py` — page content and the shared header, menu and footer. Edit copy here, then `npm run pages`.
- `src/v5/v5.css` — all styles and both themes.
- `src/v5/main.js` — theme, menu, copy-to-clipboard, brief form, videos, graphics, scroll parallax, footer mark, clock.
- `src/v5/hero3d.js` — the 3D studio scene (backdrop, lights, soft shadows, theme colours).
- `public/video/` — six work-card clips from Wikimedia Commons; licences and authors in `credits.json`, credited in the footer.
  `tools/get_videos.py` re-downloads them.

## Still needed (shown as [PLACEHOLDER])

- Projects 03–06: names, descriptions and real footage (the clips are stand-ins).
- Confirm the four service names and descriptions (drafted from the site's own copy).
- Team names, roles and upper-body portraits; a studio photo.
- Real open roles and remote/hybrid policy.
- Social links, and whether to wire the brief form to a backend.

## v6 changes

Same as v5, plus: dummy team photos (Wikimedia Commons, CC BY-SA 4.0, credited on the About page; `public/team/`) and the real ChatGPT / Claude marks (`public/brands/`) for the honourable mentions. `tools/get_assets.py` fetches both.
