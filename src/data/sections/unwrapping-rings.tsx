/**
 * Unwrapping Rings Section
 * ========================
 *
 * Second section: visualizing how concentric rings become rectangles
 * when cut and unrolled, and how these rectangles stack into a triangle.
 *
 * Ported from approved live scene: Shows three views side by side:
 * 1. Circle divided into colored rings (left)
 * 2. Horizontal strips stacked — the unrolled rectangles (middle)
 * 3. Stepped triangle — showing the triangle approximation (right)
 */

import { type ReactElement, useEffect } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeChoice,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";
import {
    circumference,
    circleArea,
    ringThicknessForN,
    totalUnwrappedArea,
    generateUnwrappingRings,
} from "../model";

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 440;
const VIEW_HEIGHT = 240;

// Circle group position
const CIRCLE_CENTER_X = 70;
const CIRCLE_CENTER_Y = 120;
const CIRCLE_RADIUS_PX = 55;

// Strips group position (horizontal rectangles showing unrolled widths)
const STRIPS_CENTER_X = 190;
const STRIPS_CENTER_Y = 120;
const STRIPS_MAX_WIDTH = 80; // Max strip width for outermost circumference

// Triangle group position (stepped approximation)
const TRIANGLE_CENTER_X = 340;
const TRIANGLE_CENTER_Y = 120;
const TRIANGLE_BASE_WIDTH = 80;

// Colors
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const ACCENT = "#62D0AD"; // Soft Teal — the ONE accent

// ── Helper: generate color gradient for rings ────────────────────────────────

const ringColor = (index: number, total: number): string => {
    // Quiet teal gradient — fills whisper, strokes carry identity
    const hue = 165; // Consistent teal hue
    const saturation = 35; // Muted
    const lightness = 78 - (index / Math.max(1, total - 1)) * 20; // 78% (lightest/inner) to 58% (darkest/outer)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// ── The bespoke drawing ──────────────────────────────────────────────────────

function UnwrappingRingsDrawing() {
    const setVar = useSetVar();
    const numRings = useVar<number>("numRings", 5);
    const R = useVar<number>("R", 4);

    // Compute derived values and write to store for verification
    const dr = ringThicknessForN(R, numRings);
    const totalArea = totalUnwrappedArea(R, numRings);
    const outerCirc = circumference(R);
    const exactArea = circleArea(R);
    const rings = generateUnwrappingRings(R, numRings);
    const errorPercent = Math.abs(exactArea - totalArea) / exactArea * 100;

    useEffect(() => {
        setVar("unwrapping_dr", dr);
        setVar("unwrapping_totalArea", totalArea);
        setVar("unwrapping_outerCircumference", outerCirc);
        setVar("unwrapping_errorPercent", errorPercent);
    }, [dr, totalArea, outerCirc, errorPercent, setVar]);

    // Scale factors for visualization
    const pxPerUnit = CIRCLE_RADIUS_PX / R;
    const totalHeight = R;
    const stripHeightScale = (CIRCLE_RADIUS_PX * 2) / totalHeight; // Map R to visual height

    // Highlight the middle ring to show dr
    const highlightRingIndex = Math.floor(numRings / 2);
    const showDrHighlight = numRings <= 12;

    return (
        <div>
            {/* Readouts above the drawing surface */}
            <div
                className="flex justify-between px-4 pb-2 text-xs"
                style={{ fontVariantNumeric: "tabular-nums", color: INK }}
            >
                <span>
                    Rings: <span className="font-semibold">{numRings}</span>
                </span>
                <span style={{ color: INK_STRUCTURE }}>
                    Error: ~{errorPercent.toFixed(1)}%
                </span>
            </div>
            <svg
                viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
                className="block w-full"
                role="img"
                aria-label={`Circle divided into ${numRings} rings, unrolled strips, and stepped triangle approximation`}
            >
            {/* ─── Left: Circle with concentric rings ─── */}
            <g data-concept="numRings">
                {/* Draw rings from outside in so inner rings appear on top */}
                {[...rings].reverse().map((ring, reverseI) => {
                    const i = numRings - 1 - reverseI;
                    const rOuter = ring.outerRadius * pxPerUnit;

                    return (
                        <circle
                            key={`ring-${i}`}
                            cx={CIRCLE_CENTER_X}
                            cy={CIRCLE_CENTER_Y}
                            r={rOuter}
                            fill={ringColor(i, numRings)}
                            stroke="#fff"
                            strokeWidth="0.5"
                        />
                    );
                })}

                {/* Highlight one ring to show dr when few rings */}
                {showDrHighlight && numRings > 0 && (
                    <>
                        {/* Arc showing thickness dr on the highlighted ring — accent at heavier stroke */}
                        <circle
                            cx={CIRCLE_CENTER_X}
                            cy={CIRCLE_CENTER_Y}
                            r={rings[highlightRingIndex]?.midRadius * pxPerUnit || 0}
                            fill="none"
                            stroke={ACCENT}
                            strokeWidth={Math.max(3, dr * pxPerUnit * 0.85)}
                            strokeDasharray={`${Math.PI * (rings[highlightRingIndex]?.midRadius || 0) * pxPerUnit * 0.35} 1000`}
                            strokeLinecap="round"
                        />
                        {/* dr label — ink color for readability, positioned clearly */}
                        <text
                            x={CIRCLE_CENTER_X + (rings[highlightRingIndex]?.outerRadius || 0) * pxPerUnit + 8}
                            y={CIRCLE_CENTER_Y + 4}
                            fill={INK}
                            fontSize="12"
                            fontWeight="500"
                            fontStyle="italic"
                        >
                            dr
                        </text>
                    </>
                )}
            </g>

            {/* ─── Middle: Horizontal strips (unrolled rectangles) ─── */}
            <g data-concept="unwrapping_totalArea">
                {rings.map((ring, i) => {
                    // Width proportional to circumference at this radius
                    const stripWidth = (ring.circumference / outerCirc) * STRIPS_MAX_WIDTH;
                    const rectHeight = Math.max((dr * stripHeightScale) - 0.5, 0.5);
                    const y = STRIPS_CENTER_Y - (totalHeight * stripHeightScale) / 2 + i * dr * stripHeightScale;
                    const x = STRIPS_CENTER_X - STRIPS_MAX_WIDTH / 2;

                    return (
                        <rect
                            key={`strip-${i}`}
                            x={x}
                            y={y}
                            width={stripWidth}
                            height={rectHeight}
                            fill={ringColor(i, numRings)}
                            stroke="#fff"
                            strokeWidth="0.3"
                        />
                    );
                })}
            </g>

            {/* ─── Right: Stepped triangle approximation ─── */}
            <g>
                {rings.map((ring, i) => {
                    // Width proportional to radius fraction (r/R)
                    const frac = ring.midRadius / R;
                    const stepWidth = frac * TRIANGLE_BASE_WIDTH;
                    const rectHeight = Math.max((dr * stripHeightScale) - 0.5, 0.5);
                    const y = TRIANGLE_CENTER_Y - (totalHeight * stripHeightScale) / 2 + i * dr * stripHeightScale;
                    const x = TRIANGLE_CENTER_X - TRIANGLE_BASE_WIDTH / 2;

                    return (
                        <rect
                            key={`tri-step-${i}`}
                            x={x}
                            y={y}
                            width={stepWidth}
                            height={rectHeight}
                            fill={ringColor(i, numRings)}
                            stroke="#fff"
                            strokeWidth="0.3"
                        />
                    );
                })}

                {/* Dashed triangle outline showing the ideal shape */}
                <path
                    d={`M ${TRIANGLE_CENTER_X - TRIANGLE_BASE_WIDTH / 2} ${TRIANGLE_CENTER_Y - (totalHeight * stripHeightScale) / 2}
                        L ${TRIANGLE_CENTER_X + TRIANGLE_BASE_WIDTH / 2} ${TRIANGLE_CENTER_Y + (totalHeight * stripHeightScale) / 2}
                        L ${TRIANGLE_CENTER_X - TRIANGLE_BASE_WIDTH / 2} ${TRIANGLE_CENTER_Y + (totalHeight * stripHeightScale) / 2}
                        Z`}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                    strokeLinejoin="round"
                />
            </g>

        </svg>
        </div>
    );
}

// ── Figure shell composition ─────────────────────────────────────────────────

function UnwrappingRingsFigure() {
    const setVar = useSetVar();

    return (
        <div data-manipulated-variable="numRings">
            <Figure
                id="unwrapping-rings-figure"
                onReset={() => {
                    setVar("numRings", 5);
                }}
                caption="A circle sliced into rings (left), unrolled as horizontal strips (middle), rearranged to show the emerging triangle (right)."
            >
                <UnwrappingRingsDrawing />
                <div className="px-6 pb-5">
                    <FigureSlider
                        varName="numRings"
                        label="Rings"
                        {...numberPropsFromDefinition(getVariableInfo("numRings"))}
                        formatValue={(v) => `${Math.round(v)}`}
                    />
                </div>
                <InteractionHintSequence
                    hintKey="unwrapping-rings-slider"
                    steps={[
                        {
                            gesture: "drag-horizontal",
                            label: "Drag to change the number of rings",
                            position: { x: "50%", y: "92%" },
                            dragPath: {
                                type: "line",
                                startOffset: { x: -40, y: 0 },
                                endOffset: { x: 40, y: 0 },
                            },
                        },
                    ]}
                />
            </Figure>
        </div>
    );
}

// ── Exported section blocks ──────────────────────────────────────────────────

export const unwrappingRingsBlocks: ReactElement[] = [
    <StackLayout key="layout-unwrapping-rings-heading" maxWidth="xl">
        <Block id="unwrapping-rings-heading" padding="md">
            <EditableH2 id="h2-unwrapping-rings-heading" blockId="unwrapping-rings-heading">
                Unwrapping the Rings
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-intro" maxWidth="xl">
        <Block id="unwrapping-rings-intro" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-intro" blockId="unwrapping-rings-intro">
                Now for the key trick. Imagine taking scissors to one of those rings, snipping it open, and laying it flat on the table. What do you get? A thin rectangle.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-explanation" maxWidth="xl">
        <Block id="unwrapping-rings-explanation" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-explanation" blockId="unwrapping-rings-explanation">
                The width of that rectangle is the circumference at that radius — 2πr. The height is just the thickness of the ring. Adjust the slider to change how many rings divide the circle. As you add more rings, each one gets thinner, and the stack of rectangles shows a cleaner approximation of something familiar.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-figure" maxWidth="xl">
        <Block id="unwrapping-rings-figure" padding="sm" hasVisualization>
            <UnwrappingRingsFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-observation" maxWidth="xl">
        <Block id="unwrapping-rings-observation" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-observation" blockId="unwrapping-rings-observation">
                Do you see it forming? The rectangles are arranging themselves into a shape you already know.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-question" maxWidth="xl">
        <Block id="unwrapping-rings-question" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-question" blockId="unwrapping-rings-question">
                What shape do the stacked rectangles form? A{" "}
                <InlineFeedback
                    varName="unwrapping_shapeAnswer"
                    correctValue="triangle"
                    position="terminal"
                    successMessage="— exactly! A triangle with base 2πR and height R"
                    failureMessage="— look again at the stacked rectangles"
                    hint="Notice how the widest strip is at the bottom and they get narrower as they go up"
                >
                    <InlineClozeChoice
                        varName="unwrapping_shapeAnswer"
                        correctAnswer="triangle"
                        options={["circle", "square", "triangle", "rectangle"]}
                        {...choicePropsFromDefinition(getVariableInfo("unwrapping_shapeAnswer"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
