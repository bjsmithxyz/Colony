export const PRESETS = {
    sparse: {
        NODE: {
            // sparse: long thin extensions with low branching
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
            // bushy: lots of branching, thicker growth for fuller clusters
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
            // tendrils: thin, meandering tendrils with occasional branching
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

export default PRESETS;
