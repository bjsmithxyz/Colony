**Colony**

**Overview:**
- **Colony** is a lightweight browser-based simulation that models simple agents (individuals), nodes and food sources on a rendered canvas. The UI is intentionally minimal and pixel-styled.

**Quick Start:**
- **Static server (recommended):**
  - Run: `python3 -m http.server 8000 --bind 127.0.0.1`
  - Open: `http://127.0.0.1:8000`
- **Custom server:**
  - If present, you can also run: `python3 server.py` (project includes a basic server for convenience).

**Development:**
- Edit source files in the repo root and `js/` and `styles.css` to change behaviour and styling.
- After edits, refresh the browser to see changes live.

**Key Files:**
- `index.html`: main HTML document and UI layout.
- `styles.css`: central stylesheet — contains the pixel theme, font `@font-face` rules, and loading-screen styles.
- `js/main.js`: app bootstrap (initialises the simulation).
- `js/Simulation.js`, `js/SimulationRenderer.js`, `js/SimulationEventHandler.js`: core simulation logic, rendering and input handling.
- `js/bgPixels.js`: background pixel-splatter generator (renders behind the canvas).
- `assets/fonts/`: bundled Ubuntu WOFF2 font files used by the UI.

**UI Notes:**
- Fonts: Ubuntu is bundled locally in `assets/fonts/` (woff2) and preloaded in `index.html`.
- Loading screen: uses the project-wide pixel theme and a pixel spinner.
- Controls: pause/reset buttons are simple text links positioned in the canvas overlay.

**Contributing:**
- Make a branch, commit changes and open a PR. Keep UI and performance changes small and focused.

**License & Credits:**
- No license file included; add `LICENSE` if you want a specific license.
- Fonts used: Ubuntu (bundled WOFF2) — follow upstream licensing for redistribution.

If you want, I can expand this README with architecture diagrams, development scripts, or a CONTRIBUTING guide.
