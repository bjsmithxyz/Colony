# Colony

A lightweight browser-based simulation featuring organic node growth, intelligent agents, and real-time interactions on an interactive canvas.

## Quick start

Serve the project over HTTP and open it in your browser:

```bash
# using Python's simple HTTP server
python3 -m http.server 8000 --bind 127.0.0.1

# or using the included helper server
python3 server.py
```

Then open your browser at: <http://127.0.0.1:8000>

## GitHub Pages

Colony is a static site — no build step required. GitHub Pages serves the repo root directly.

**Live URL (after enabling Pages):** <https://bjsmithxyz.github.io/Colony/>

### One-time setup

1. Push this repo to GitHub (`bjsmithxyz/Colony`).
2. In the repo on GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually). The workflow is defined in `.github/workflows/pages.yml`.
5. After the workflow completes, the site is live at the URL above.

### Alternative (no Actions)

In **Settings → Pages**, set **Source** to **Deploy from a branch**, pick `main`, folder **`/ (root)`**, and save. This also works; the Actions workflow is optional but gives you deploy logs and a clear CI history.

### What's included for Pages compatibility

| File | Purpose |
|------|---------|
| `.nojekyll` | Tells GitHub Pages not to run Jekyll (avoids surprises with static assets) |
| `.github/workflows/pages.yml` | Optional automated deploy on push to `main` |
| `index.html` base-path script | Fixes asset loading on project subpaths (`/Colony/`) |

### Not needed on Pages

- `server.py` — local dev only; Pages serves static files over HTTPS
- `npm install` / `purge:css` — optional CSS optimization, not required to run the sim

### Notes

- The repo must be **public** (or you need GitHub Pro for Pages on private repos).
- ES modules (`type="module"`) work on GitHub Pages; all paths in this project are relative.
- Local dev is unchanged: `python3 server.py` at `http://127.0.0.1:8000`.

## Usage

1. **Click** on empty canvas area to place initial node (one-time only)
2. **Hover** over nodes to see statistics in tooltip
3. **Click** nodes to select/target them  
4. Use **pause/play** and **speed** controls in the UI
5. **Reset** button clears simulation and allows new placement

## Project structure

- `index.html` — Application entry and UI layout
- `styles.css` — Global styles (system font stack)
- `js/main.js` — Bootstrap and initialization logic
- `js/Simulation.js` — Core simulation orchestration and main loop
- `js/SimulationRenderer.js` — Rendering engine with dirty-rect optimization
- `js/SimulationEventHandler.js` — Input handling and UI interactions
- `js/Node.js`, `js/Individual.js`, `js/FoodSource.js` — Domain models
- `js/growth/` — Node growth logic (directional, toward-point, merge detection, terrain weights)
- `js/SpatialGrid.js`, `js/ObjectPool.js` — Spatial partitioning and memory management

## Development

- Uses native ES6 modules (no bundler required)
- Edit `js/config.js` to modify simulation parameters
- Built-in performance monitoring and debugging tools
- Access `window.simulation` in browser console for debugging

## License

This project is licensed under the MIT License — see `LICENSE` for details.
