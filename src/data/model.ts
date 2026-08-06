/**
 * Domain Model — Circle Area Derivation via Concentric Rings
 * ==========================================================
 *
 * This file is the single source of mathematical truth for the lesson.
 * Every section's figure computes from these functions (via reactive wrappers
 * that read store variables). No section re-implements the math locally.
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Full circle radius for the lesson */
export const MAX_RADIUS = 4;

/** Thickness of each ring (dr) */
export const RING_THICKNESS = 0.3;

// ── Core formulas ────────────────────────────────────────────────────────────

/** Circumference at a given radius: C = 2πr */
export const circumference = (r: number): number => 2 * Math.PI * r;

/** Area of a thin ring at radius r with thickness dr: A ≈ 2πr × dr */
export const ringArea = (r: number, dr: number = RING_THICKNESS): number =>
    circumference(r) * dr;

/** Total area of a circle: A = πr² */
export const circleArea = (r: number): number => Math.PI * r * r;

/** Number of rings that fit from center to radius r */
export const ringCount = (r: number, dr: number = RING_THICKNESS): number =>
    Math.max(0, Math.floor(r / dr));

/** Generate array of ring radii from center to currentRadius */
export const getRingRadii = (
    currentRadius: number,
    dr: number = RING_THICKNESS
): number[] => {
    const rings: number[] = [];
    for (let i = 1; i <= ringCount(currentRadius, dr); i++) {
        rings.push(i * dr);
    }
    return rings;
};

// ── Ring Unwrapping (Section 2) ──────────────────────────────────────────────

/** Ring thickness when dividing radius R into n rings: dr = R/n */
export const ringThicknessForN = (R: number, n: number): number => R / n;

/** Midpoint radius of the i-th ring (0-indexed): r_i = (i + 0.5) × dr */
export const ringMidRadius = (R: number, n: number, i: number): number =>
    ((i + 0.5) / n) * R;

/** Outer radius of the i-th ring (0-indexed): r_outer = (i + 1) × dr */
export const ringOuterRadius = (R: number, n: number, i: number): number =>
    ((i + 1) / n) * R;

/** Area of i-th ring as rectangle = 2π × midRadius × dr */
export const ringRectangleArea = (R: number, n: number, i: number): number => {
    const r = ringMidRadius(R, n, i);
    const dr = ringThicknessForN(R, n);
    return circumference(r) * dr;
};

/** Total area of all unwrapped rectangles — approaches πR² as n → ∞ */
export const totalUnwrappedArea = (R: number, n: number): number => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        sum += ringRectangleArea(R, n, i);
    }
    return sum;
};

/**
 * Ring data for the unwrapping visualization.
 * Returns array of rings with their geometric properties.
 */
export interface RingData {
    index: number;
    innerRadius: number;
    outerRadius: number;
    midRadius: number;
    dr: number;
    circumference: number;
    rectangleWidth: number; // Same as circumference (2πr)
    rectangleHeight: number; // Same as dr
    area: number;
}

export const generateUnwrappingRings = (R: number, n: number): RingData[] => {
    const dr = ringThicknessForN(R, n);
    const rings: RingData[] = [];
    for (let i = 0; i < n; i++) {
        const innerRadius = (i / n) * R;
        const outerRadius = ringOuterRadius(R, n, i);
        const midRadius = ringMidRadius(R, n, i);
        const circ = circumference(midRadius);
        rings.push({
            index: i,
            innerRadius,
            outerRadius,
            midRadius,
            dr,
            circumference: circ,
            rectangleWidth: circ,
            rectangleHeight: dr,
            area: circ * dr,
        });
    }
    return rings;
};

// ── Triangle Emerges (Section 3) ─────────────────────────────────────────────

/** Maximum circumference at the outer edge: 2πR */
export const maxCircumference = (R: number): number => 2 * Math.PI * R;

/**
 * Accumulated area of all rings from center up to sweepR.
 * Uses the same ring model as the unwrapping section.
 */
export const accumulatedArea = (
    sweepR: number,
    R: number,
    numRings: number
): number => {
    const dr = ringThicknessForN(R, numRings);
    let total = 0;
    for (let i = 0; i < numRings; i++) {
        const ringR = ringMidRadius(R, numRings, i);
        if (ringR <= sweepR) {
            total += ringRectangleArea(R, numRings, i);
        }
    }
    return total;
};

/**
 * Number of complete rings visible at the current sweep position.
 */
export const visibleRingCount = (
    sweepR: number,
    R: number,
    numRings: number
): number => {
    const dr = ringThicknessForN(R, numRings);
    return Math.min(numRings, Math.floor(sweepR / dr));
};

/**
 * Triangle area formula: ½ × base × height
 * For our stacked rings: base = 2πR, height = R
 * Result: ½ × 2πR × R = πR²
 */
export const triangleAreaFormula = (R: number): number =>
    0.5 * maxCircumference(R) * R;

/**
 * Check if the sweep is complete (reached full radius).
 */
export const sweepComplete = (sweepR: number, R: number): boolean =>
    sweepR >= R - 0.01;
