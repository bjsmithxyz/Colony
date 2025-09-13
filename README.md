# Colony

A lightweight browser-based simulation that models simple agents (individuals), nodes, and food sources on an interactive canvas. The project uses a minimalist, pixel-inspired UI.

## Quick Start

- Serve locally with Python's simple server:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
# then open http://127.0.0.1:8000 in your browser
```

- Alternatively, if provided, run the included server script:

```bash
python3 server.py
```

## Development

- Edit files under the project root and in the `js/` folder. Styles are in `styles.css`.
- After making changes, refresh the browser to see updates.

## Project Structure (key files)

- `index.html` — application entry and UI layout
- `styles.css` — global styles, pixel theme, bundled font `@font-face` rules
- `js/main.js` — app bootstrap and initialization
- `js/Simulation.js` — simulation core logic
- `js/SimulationRenderer.js` — rendering and FPS handling
- `js/SimulationEventHandler.js` — input and UI bindings
- `js/bgPixels.js` — pixel-splatter background renderer
- `assets/fonts/` — bundled Ubuntu WOFF2 files (preloaded in `index.html`)

## UI Notes

- Fonts: Ubuntu is bundled locally to avoid external dependencies and is preloaded for faster first paint.
- Loading screen: uses the project pixel aesthetic and a pixel spinner.
- Controls: simplified text-only `pause` and `reset` buttons sit in the top-left overlay.

## License

This project is licensed under the MIT License — see `LICENSE` for details.
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

**License & Credits:**
- No license file included; add `LICENSE` if you want a specific license.
- Fonts used: Ubuntu (bundled WOFF2) — follow upstream licensing for redistribution.
