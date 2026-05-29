/**
 * Constants used throughout the simulation
 * Centralizes magic numbers and configuration values
 */

export const CONSTANTS = {
    // Timing constants
    FRAME_RATE: 60,
    MILLISECONDS_PER_SECOND: 1000,
    
    // Spatial constants
    DEFAULT_CELL_SIZE: 32,
    NODE_GRID_CELL_SIZE: 64,
    DIRTY_RECT_CELL_SIZE: 64,
    
    // Growth constants
    SUPPORT_MILESTONE_INTERVAL: 5,
    SUPPORT_PIXELS_PER_MILESTONE: 2,
    MAX_GROWTH_STEPS: 64,
    DEFAULT_GROWTH_ANGLE_JITTER: 0.35,
    
    // Merge constants
    MIN_DEPOT_DISTANCE: 20,
    MERGE_CONTACT_THRESHOLD: 2,
    
    // Movement constants
    STUCK_THRESHOLD: 0.1,
    STUCK_FRAME_COUNT: 30,
    
    // Energy constants
    DEFAULT_MAX_ENERGY: 3000,
    DEFAULT_INITIAL_ENERGY: 3000,
    
    // Rendering constants
    IMAGE_DATA_THRESHOLD: 100,
    FPS_UPDATE_INTERVAL: 1000,
    FPS_HISTORY_SIZE: 10,
    
    // Performance constants
    STATS_UPDATE_INTERVAL: 30,
    POOL_TRIM_INTERVAL: 1800,
    POOL_TRIM_TARGET: 20,
    MAX_UPDATES_PER_FRAME: 4,
    DEFAULT_MAX_PIXELS_PER_NODE: 2500,
    
    // Terrain constants
    TERRAIN_HEIGHT_RANGE: 255,
    TERRAIN_MIN_GROWTH_COST: 0.5,
    
    // Color parsing constants
    HASH_PRIME_1: 15731,
    HASH_PRIME_2: 789221,
    HASH_PRIME_3: 1376312589,
    HASH_MASK: 0x7fffffff,
    
    // Neighbor offsets (8-directional)
    NEIGHBOR_OFFSETS: [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [-1, -1], [1, -1], [-1, 1]
    ],
    
    // Cardinal directions
    CARDINAL_OFFSETS: [
        [1, 0], [-1, 0], [0, 1], [0, -1]
    ]
};

