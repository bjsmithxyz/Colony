/**
 * @typedef {Object} NodePreset
 * @property {number} GROWTH_BRANCH_CHANCE - Likelihood a node branch will split (0-1).
 * @property {number} GROWTH_THICKNESS - Thickness in pixels for new growth.
 * @property {number} GROWTH_RANDOM_DIR_CHANGE - Random angular change when growing (0-1).
 * @property {number} BASE_GROWTH_CHANCE - Base per-frame chance to grow (0-1).
 *
 * @typedef {Object} Preset
 * @property {NodePreset} NODE - Per-node settings.
 * @property {number} GROWTH_ACTIONS_PER_FRAME - How many growth actions happen per frame.
 * @property {number} GROWTH_STEP_PIXELS - Pixels moved per growth action.
 * @property {boolean} GROWTH_CONTINUOUS - Whether growth is continuous (vs discrete/triggered).
 */

/** @type {Record<string, Preset>} */
const PRESETS = {
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

// Freeze nested objects to prevent accidental mutation at runtime.
const freezePreset = (p) => {
    if (p && typeof p === 'object') {
        if (p.NODE && typeof p.NODE === 'object') Object.freeze(p.NODE);
        Object.freeze(p);
    }
};
Object.values(PRESETS).forEach(freezePreset);
Object.freeze(PRESETS);

/**
 * Return a preset by name. Use this instead of accessing PRESETS directly if you
 * want a safe lookup that returns null for unknown keys.
 * @param {string} name
 * @returns {Preset | null}
 */
export function getPreset(name) {
    return PRESETS[name] || null;
}

export { PRESETS };
export default PRESETS;
