# Colony Simulation - Claude Development Guide

## Project Overview

This is a browser-based colony simulation featuring autonomous pixel entities that emerge from nodes, search for food, and return resources to their parent colonies. The simulation demonstrates emergent behavior through simple rules and includes a comprehensive module system for customization.

## Development Commands

### Running the Simulation
```bash
# Start local development server
python3 server.py

# Alternative with Node.js
npx serve
npx http-server

# Then open: http://localhost:8000
```

### Testing Commands
```bash
# Run basic functionality test
python3 -m http.server 8000 && open http://localhost:8000/test.html

# Performance testing (monitor browser console)
# Load simulation with 10 nodes and observe FPS
```

## Project Structure

```
pixsim/
├── index.html              # Main application entry point
├── styles.css              # Global styles and UI components
├── server.py               # Development server script
├── test.html               # Module system testing page
├── js/
│   ├── main.js             # Application initialization
│   ├── config.js           # Global configuration constants
│   ├── Simulation.js       # Main simulation controller
│   ├── Node.js             # Colony node class
│   ├── Individual.js       # Individual entity class
│   ├── FoodSource.js       # Food cluster generation and management
│   ├── TrailSystem.js      # Path visualization system
│   ├── Module.js           # Base module class and interface
│   ├── ModuleManager.js    # Module lifecycle management
│   └── modules/            # Module implementations
│       ├── VisionModule.js      # Enhanced detection range
│       ├── SpeedModule.js       # Increased movement speed
│       ├── EfficiencyModule.js  # Reduced energy consumption
│       ├── CapacityModule.js    # Increased carrying capacity
│       ├── ColorModule.js       # Visual theme modules
│       ├── SizeModule.js        # Node size enhancement
│       ├── TrailModule.js       # Persistent path trails
│       ├── BeaconModule.js      # Navigation beacon signals
│       ├── CommunicationModule.js   # Information sharing
│       ├── SpecializationModule.js # Scout/Worker types
│       ├── PriorityModule.js        # Proximity-based selection
│       └── ClusterModule.js         # Group movement patterns
└── docs/                   # Documentation (future)
```

## Key Technologies

- **Frontend**: Vanilla JavaScript ES6+ modules
- **Rendering**: HTML5 Canvas API with 2D context
- **Architecture**: Object-oriented with modular design
- **State Management**: Local storage for save/load
- **Performance**: RequestAnimationFrame loop with optimizations

## Core Architecture

### Simulation Loop
1. **Update Phase**: Entity logic, module effects, state transitions
2. **Render Phase**: Canvas drawing with layered rendering
3. **Input Handling**: Mouse/touch events for node placement and selection

### Module System
- **Base Module Class**: Standardized interface for all enhancements
- **Module Manager**: Lifecycle management and dependency resolution
- **Three Categories**: Enhancement, Visual, Behavior modules
- **Cost System**: Food-based activation requirements
- **Requirements**: Dependency chains between advanced modules

### Entity Behavior
- **State Machine**: SEARCHING → MOVING_TO_FOOD → COLLECTING → RETURNING → DEPOSITING
- **Pathfinding**: A* for direct movement, random walk for exploration
- **Memory System**: Individuals remember discovered food sources
- **Communication**: Information sharing between nearby entities

## Configuration

### Key Constants (config.js)
```javascript
CONFIG.MAP.WIDTH = 512           // Canvas width
CONFIG.MAP.HEIGHT = 512          // Canvas height
CONFIG.NODE.SPAWN_THRESHOLD = 10 // Food needed to spawn individual
CONFIG.INDIVIDUAL.DETECTION_RANGE = 5  // Base detection distance
CONFIG.FOOD.TOTAL_PIXELS = 20    // Pixels per food cluster
```

### Module Costs
- Enhancement Modules: 15-30 food
- Visual Modules: 5-12 food  
- Behavior Modules: 25-50 food (with requirements)

## Development Patterns

### Adding New Modules
1. Create module class extending `Module`
2. Implement `applyEffects()` and `removeEffects()` methods
3. Register in `Simulation.initializeModules()`
4. Update relevant entity classes to use new properties

### Performance Considerations
- Use `for` loops instead of `forEach` for hot paths
- Batch canvas operations where possible
- Update statistics only every 30 frames
- Implement object pooling for high-frequency entities

### Code Style
- ES6+ syntax with modules
- Camelcase naming convention
- No external dependencies (vanilla JS)
- Minimal comments in code, detailed documentation here

## Testing Strategies

### Manual Testing Checklist
1. **Basic Functionality**
   - [ ] Node placement works
   - [ ] Individuals spawn and move
   - [ ] Food detection and collection
   - [ ] Return and deposit behavior

2. **Module System**
   - [ ] Module activation/deactivation
   - [ ] Cost requirements enforced
   - [ ] Dependency requirements work
   - [ ] Visual effects apply correctly

3. **Performance**
   - [ ] Smooth 60 FPS with 100+ individuals
   - [ ] No memory leaks over 10+ minutes
   - [ ] Save/load preserves state correctly

### Debug Tools
- Browser console logs for state transitions
- Performance profiler for optimization
- Canvas inspector for rendering issues

## Common Issues & Solutions

### Module System Not Loading
- Ensure ES6 modules are served over HTTP (not file://)
- Check console for import errors
- Verify module registration in initializeModules()

### Performance Issues
- Monitor individual count (limit to ~500 for smooth performance)
- Check for infinite loops in state machine
- Profile canvas rendering calls

### State Machine Problems
- Verify all state transitions have valid targets
- Check for null reference errors in movement code
- Ensure proper cleanup when individuals are removed

## Future Development Guidelines

### Scalability Considerations
- Implement spatial partitioning for >1000 entities
- Consider WebGL for rendering performance
- Add Web Workers for background AI processing

### Module Design Principles
- Keep modules focused on single responsibilities
- Use dependency injection for testability
- Maintain backward compatibility in module interface

### Code Quality Standards
- Maintain sub-100ms frame times
- Keep bundle size under 500KB
- Ensure accessibility compliance
- Support modern browsers (ES6+ required)

## Useful Development Commands

```bash
# Quick server start
cd /path/to/pixsim && python3 server.py

# Check bundle size
du -sh js/

# Find TODO items
grep -r "TODO\|FIXME" js/

# Performance testing
# Open browser dev tools, start simulation with 10 nodes
# Monitor: Performance tab, Memory tab, Console for FPS
```

## Project Status

**Current Version**: 0.9.0 (Advanced Behaviors)
**Next Milestone**: 1.0.0 (Polish & Release)
**Estimated Completion**: ~40 hours additional development

### Completed Features
- ✅ Core simulation engine
- ✅ Complete module system (11 modules)
- ✅ Save/load functionality
- ✅ Trail visualization
- ✅ Advanced AI behaviors

### In Progress
- 🔄 Performance optimizations
- 🔄 UI/UX improvements  
- 🔄 Statistics dashboard

### Planned
- 📋 Mobile responsiveness
- 📋 Documentation system
- 📋 Module marketplace

This simulation serves as an excellent example of emergent behavior, modular architecture, and real-time interactive systems built with vanilla web technologies.