// Presets inlined here (previously in config-presets.js)
const PRESETS = {
    sparse: {
        NODE: {
            GROWTH_BRANCH_CHANCE: 0.06,
            GROWTH_THICKNESS: 1,
            GROWTH_RANDOM_DIR_CHANGE: 0.08,
            BASE_GROWTH_CHANCE: 0.003
        },
        GROWTH_ACTIONS_PER_FRAME: 2,
        GROWTH_STEP_PIXELS: 1,
        GROWTH_CONTINUOUS: true
    },
    bushy: {
        NODE: {
            GROWTH_BRANCH_CHANCE: 0.62,
            GROWTH_THICKNESS: 2,
            GROWTH_RANDOM_DIR_CHANGE: 0.6,
            BASE_GROWTH_CHANCE: 0.04
        },
        GROWTH_ACTIONS_PER_FRAME: 5,
        GROWTH_STEP_PIXELS: 3,
        GROWTH_CONTINUOUS: true
    },
    tendrils: {
        NODE: {
            GROWTH_BRANCH_CHANCE: 0.22,
            GROWTH_THICKNESS: 1,
            GROWTH_RANDOM_DIR_CHANGE: 0.32,
            BASE_GROWTH_CHANCE: 0.02
        },
        GROWTH_ACTIONS_PER_FRAME: 3,
        GROWTH_STEP_PIXELS: 2,
        GROWTH_CONTINUOUS: true
    }
};

export const CONFIG = {
    MAP: {
        WIDTH: 1000,
        HEIGHT: 1000,
        BACKGROUND_COLOR: '#1a1a1a'
    },
    NODE: {
        SIZE: 3,
        COLOR: '#4CAF50',
        MAX_NODES: 20,
        SPAWN_THRESHOLD: 10,
        FOOD_PER_PIXEL: 1,           // how much food is required for one growth pixel
    GROWTH_BRANCH_CHANCE: 0.32,  // higher to encourage more branching
    GROWTH_THICKNESS: 1,         // slightly thinner dendrites for finer branching
        
        GROWTH_RANDOM_DIR_CHANGE: 0.35, // chance each growth step to pick a less-targeted direction (more meandering)
        // Small per-tick chance to grow a baseline pixel even when food is not available
        BASE_GROWTH_CHANCE: 0.02
    },
    // Allow a node to immediately spawn multiple individuals if it receives a large food deposit.
    // Disabled by default; use `DEBUG_FORCE_MULTI_SPAWN` to enable in debugging.
    ALLOW_IMMEDIATE_MULTI_SPAWN: false,
    // Debug override: when true multi-spawn will be forced even if ALLOW_IMMEDIATE_MULTI_SPAWN is false
    DEBUG_FORCE_MULTI_SPAWN: false,
    // Growth tuning
    // Number of growth actions (calls) to perform per node per frame when queued
    GROWTH_ACTIONS_PER_FRAME: 3,
    // Number of pixels to attempt per growth action (randomized 1..N)
    GROWTH_STEP_PIXELS: 2,
    // When true, nodes will continuously convert stored food into growth every tick
    GROWTH_CONTINUOUS: true,
    // Debug flags (centralized)
    DEBUG: {
        startup: false,
        performance: false,
        spawn: false,
        growth: false
    },
    INDIVIDUAL: {
        SIZE: 1,
        COLOR: '#2196F3',
        MOVEMENT_SPEED: 1,
        DETECTION_RANGE: 15,
        CARRYING_CAPACITY: 2,
        ENERGY_CONSUMPTION: 1
    },
    FOOD: {
        TOTAL_PIXELS: 20,
        COLOR_HIDDEN: '#1a1a1a',
        COLOR_REVEALED: '#FFC107',
        DEPLETION_RATE: 2
    },
    SIMULATION: {
        FPS: 60
    }
};

// Rendering-specific tuning for experimental optimizations
CONFIG.RENDER = {
    OFFSCREEN_CANVAS_ENABLED: true,
    OFFSCREEN_CANVAS_SAVE_MEMORY: false, // if true, reuse a single smaller canvas when possible
    SILHOUETTE_BLUR_ENABLED: false,
    SILHOUETTE_BLUR_RADIUS: 6,
    MARCHING_SQUARES_ENABLED: false,
    MARCHING_SQUARES_STROKE_WIDTH: 2
};

// Apply default preset: 'tendrils' (merge shallowly for relevant keys)
const defaultPreset = PRESETS.tendrils || {};
if (defaultPreset.NODE) {
    Object.assign(CONFIG.NODE, defaultPreset.NODE);
}
for (const key of ['GROWTH_ACTIONS_PER_FRAME', 'GROWTH_STEP_PIXELS', 'GROWTH_CONTINUOUS']) {
    if (defaultPreset[key] !== undefined) CONFIG[key] = defaultPreset[key];
}

// Freeze presets to discourage runtime mutation
function deepFreeze(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((k) => {
        if (obj[k] && typeof obj[k] === 'object') deepFreeze(obj[k]);
    });
    return Object.freeze(obj);
}
deepFreeze(PRESETS);

export { PRESETS };
export default CONFIG;