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

## Usage

1. **Click** on empty canvas area to place initial node (one-time only)
2. **Hover** over nodes to see statistics in tooltip
3. **Click** nodes to select/target them  
4. Use **pause/play** and **speed** controls in the UI
5. **Reset** button clears simulation and allows new placement

## Project structure

- `index.html` — Application entry and UI layout
- `styles.css` — Global styles with bundled Ubuntu fonts
- `js/main.js` — Bootstrap and initialization logic
- `js/Simulation.js` — Core simulation orchestration and main loop
- `js/SimulationRenderer.js` — Rendering engine with dirty-rect optimization
- `js/SimulationEventHandler.js` — Input handling and UI interactions
- `js/Node.js`, `js/Individual.js`, `js/FoodSource.js` — Domain models
- `js/SpatialGrid.js`, `js/ObjectPool.js` — Spatial partitioning and memory management

## Development

- Uses native ES6 modules (no bundler required)
- Edit `js/config.js` to modify simulation parameters
- Built-in performance monitoring and debugging tools
- Access `window.simulation` in browser console for debugging

## License

This project is licensed under the MIT License — see `LICENSE` for details.
