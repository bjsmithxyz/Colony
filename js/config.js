export const CONFIG = {
    MAP: {
        WIDTH: 1024,
        HEIGHT: 1024,
        BACKGROUND_COLOR: '#1a1a1a'
    },
    NODE: {
        SIZE: 3,
        COLOR: '#4CAF50',
        MAX_NODES: 100,
        SPAWN_THRESHOLD: 10
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