# Colony

A lightweight browser-based simulation that models simple agents (individuals), nodes, and food sources on an interactive canvas. The UI is intentionally minimal and pixel-styled.

## Quick start

Serve the project over HTTP and open it in your browser. Two simple options:

```bash
# using Python's simple HTTP server
python3 -m http.server 8000 --bind 127.0.0.1

# or using the included helper server
python3 server.py
```

Then open your browser at: <http://127.0.0.1:8000>

## Project structure (important files)

- `index.html` — application entry and UI layout
- `styles.css` — global styles and bundled fonts
- `js/main.js` — bootstrap and initialization
- `js/Simulation.js` — core simulation orchestration
- `js/SimulationRenderer.js` — rendering and dirty-rect handling
- `js/SimulationEventHandler.js` — input and UI bindings
- `js/Node.js`, `js/Individual.js`, `js/FoodSource.js` — domain models
- `js/SpatialGrid.js`, `js/ObjectPool.js` — spatial partitioning and pooling helpers

## UI notes

- Fonts: Ubuntu is bundled under `assets/fonts/` and preloaded in `index.html` to avoid external dependencies and speed up first paint.

## Development notes

- The app uses native ES modules (no bundler). Entry point: `index.html` -> `js/main.js`.
- Typical dev server: `python3 -m http.server 8000 --bind 127.0.0.1` or `python3 server.py`.
- Important modules to look at when making changes: `js/Simulation.js`, `js/SimulationRenderer.js`, `js/SimulationEventHandler.js`, and the domain models in `js/`.

## Smoke tests (automated)

There is a lightweight Puppeteer-based smoke test that loads the local dev server, waits for the simulation to initialise (`window.simulation`) and calls `resetSimulation(true)` to ensure the reset path runs without uncaught exceptions. It captures console logs to `smoke-test-logs.json`.

Run locally:

```bash
# start server (in a separate terminal)
python3 server.py

# install deps
npm install

# run the smoke test (headless)
npm run smoke:test
```

Alternatively you can run `npm run smoke` which starts the server briefly and runs the smoke-test (convenience wrapper).

## License

This project is licensed under the MIT License — see `LICENSE` for details.
