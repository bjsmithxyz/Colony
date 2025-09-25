## Colony — AI contributor quick guide

This file gives targeted, actionable guidance for automated coding agents working on the Colony codebase.

- Project type: single-page, browser-based simulation using native ES modules (no bundler). Entry: `index.html` -> `js/main.js`.
- Serve over HTTP to load ES modules and fonts. Typical dev servers:
  - `python3 -m http.server 8000 --bind 127.0.0.1`
  - or run the included `server.py` (also binds to port 8000).

- Big picture architecture (what to read first):
  - `js/Simulation.js` — core simulation orchestration and most high-level logic.
  - `js/SimulationRenderer.js` — drawing / render loop specifics and dirty-rect handling.
  - `js/SimulationEventHandler.js` — input and UI bindings (how user actions map to simulation methods).
  - `js/Node.js`, `js/Individual.js`, `js/FoodSource.js` — main domain models and interaction rules.
  - `js/SpatialGrid.js` and `js/ObjectPool.js` — spatial partitioning and pooling patterns used throughout.

- Key runtime conventions and patterns (do not change without checking usages):
  - Modules use named exports and are imported by path (e.g. `import { Simulation } from './Simulation.js'`). No bundler is assumed.
  - Many systems are manager-style objects attached to `Simulation` (e.g., `renderer`, `eventHandler`, `trailSystem`). Prefer adding features to existing managers where appropriate.
  - Spatial queries use `SpatialGrid` and `nodeGrid`. For containment checks use `node.hasPixel(relX, relY)` (fast) rather than brute-force geometry when possible.
  - Objects are pooled via `ObjectPool.acquire()` / `release()`; returning objects to the pool is expected on death to avoid leaks.
  - `Simulation.sharedNodePool` and `node.sharedPool` hold global/aggregate node state (e.g. `totalFood`); check shared pool logic before changing food accounting.
  - Renderer uses `DirtyRectManager` and explicit dirty marking (`markEntityDirty`) — avoid full-canvas clears unless necessary for correctness.

- DOM & debug/QA hooks (useful for quick validation):
  - Canvas id: `simulationCanvas`. Loading screen id: `loadingScreen`.
  - Several overlay stats use ids: `ov_nodeCount`, `ov_individualCount`, `ov_totalFood`, `ov_foodCollected`.
  - Global debug handles: `window.simulation` (the Simulation instance) and `window.enhancedUI` (if available).
  - Cursor classes toggled on the canvas: `can-drop` / `cannot-drop` (used to indicate player drop state).

- Dev/build commands discovered in repo:
  - `npm run purge:css` (defined in `package.json`) runs PurgeCSS to create `build/styles.css` from `styles.css` and JS/HTML content.
  - There is no JS bundler or test harness present; use the local HTTP server and the browser console for smoke testing.

- Coding-agent behavior rules (concise):
  - Keep changes minimal and local: prefer editing a single JS module and its direct callers. The codebase relies on module imports/side-effects — large refactors must be verified in-browser.
  - When changing rendering or performance-sensitive loops, run the app in the browser and monitor `PerformanceMonitor` logs (it exists and is used by `Simulation`).
  - Preserve public API names: `Simulation.start()`, `Simulation.update()/render()`, `addNode(x,y,opts)`, and `getNodeAt(x,y)` are used in UI handlers and tests (manual).
  - When adding new DOM elements, follow the minimal UI styling (pixel theme) and add any font references to `index.html` or `styles.css` (fonts are bundled under `assets/fonts/`).

- Example quick changes and where to make them:
  - To add a new debug command available from the console, attach a method to `Simulation.prototype` or add a small function in `js/main.js` that sets `window.simulation.<fn>`.
  - To optimize node containment checks, edit `js/Node.js` (add/optimize `hasPixel`) and ensure `Simulation.getNodeAt` still queries `nodeGrid` first.

- When in doubt:
  - Run the server, open the browser devtools console, and interact with `window.simulation`.
  - Search `js/` for the symbol you intend to change — many files reference managers by name (e.g., `renderer`, `eventHandler`).

If any section is vague or you want the agent to follow stricter rules (tests, CI, or branching), tell me what policy to enforce and I will update this file.
