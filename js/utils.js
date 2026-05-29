/**
 * Shared geometry helpers used across growth and terrain systems.
 */

const DIRECTION_ANGLES = {
    north: -Math.PI / 2,
    northeast: -Math.PI / 4,
    east: 0,
    southeast: Math.PI / 4,
    south: Math.PI / 2,
    southwest: 3 * Math.PI / 4,
    west: Math.PI,
    northwest: -3 * Math.PI / 4
};

/** Map eight cardinal/diagonal direction names to radians (canvas Y-axis points down). */
export function directionToAngle(direction) {
    return DIRECTION_ANGLES[direction] ?? 0;
}
