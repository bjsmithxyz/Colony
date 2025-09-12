export const CONFIG = {
    MAP: {
        WIDTH: 512,
        HEIGHT: 512,
        BACKGROUND_COLOR: '#1a1a1a'
    },
    NODE: {
        SIZE: 3,
        COLOR: '#4CAF50',
        MAX_NODES: 100,
        SPAWN_THRESHOLD: 10,
        FOOD_PER_PIXEL: 1,           // how much food is required for one growth pixel
        GROWTH_BRANCH_CHANCE: 0.75,  // chance that a growth step will create a branch
        GROWTH_THICKNESS: 1          // thickness (in pixels) to add around growth paths
        ,
        GROWTH_RANDOM_DIR_CHANGE: 0.35 // chance each growth step to pick a less-targeted direction (more meandering)
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