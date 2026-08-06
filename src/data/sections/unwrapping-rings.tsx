/**
 * Unwrapping Rings Section
 * ========================
 *
 * Second section: visualizing how concentric rings become rectangles
 * when cut and unrolled, and how these rectangles stack into a triangle.
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

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 380;
const CIRCLE_CENTER_X = 130;
const CIRCLE_CENTER_Y = 170;
const CIRCLE_VISUAL_RADIUS = 100; // pixels

const RECT_STACK_LEFT = 280;
const RECT_STACK_BOTTOM = 340;
const RECT_MAX_WIDTH = 240; // max width for outermost rectangle
const RECT_SCALE_HEIGHT = 20; // pixels per unit of dr (scaled for visibility)

// Colors
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";

// ── Helper: generate color gradient for rings ────────────────────────────────

const ringColor = (index: number, total: number): string => {
    // Gradient from light teal to full accent
    const t = total > 1 ? index / (total - 1) : 0;
    const lightness = 85 - t * 35; // 85% to 50%
    return `hsl(160, 55%, ${lightness}%)`;
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

    useEffect(() => {
        setVar("unwrapping_dr", dr);
        setVar("unwrapping_totalArea", totalArea);
        setVar("unwrapping_outerCircumference", outerCirc);
    }, [dr, totalArea, outerCirc, setVar]);

    // Scale factors for visualization
    const pxPerUnit = CIRCLE_VISUAL_RADIUS / R;
    const rectWidthScale = RECT_MAX_WIDTH / outerCirc;

    return (
        <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label={`Circle divided into ${numRings} rings on left, unwrapped rectangles forming a triangle on right`}
        >
            {/* ─── Left side: Circle with concentric rings ─── */}
            <g data-concept="numRings">
                {/* Draw rings from outside in so inner rings appear on top */}
                {[...rings].reverse().map((ring, reverseI) => {
                    const i = numRings - 1 - reverseI; // original index
                    const innerPx = ring.innerRadius * pxPerUnit;
                    const outerPx = ring.outerRadius * pxPerUnit;

                    // Create annulus path (ring shape)
                    const cx = CIRCLE_CENTER_X;
                    const cy = CIRCLE_CENTER_Y;

                    return (
                        <g key={i}>
                            {/* Ring as annulus using path with arc */}
                            <path
                                d={`
                                    M ${cx + outerPx} ${cy}
                                    A ${outerPx} ${outerPx} 0 1 1 ${cx - outerPx} ${cy}
                                    A ${outerPx} ${outerPx} 0 1 1 ${cx + outerPx} ${cy}
                                    ${innerPx > 0 ? `
                                        M ${cx + innerPx} ${cy}
                                        A ${innerPx} ${innerPx} 0 1 0 ${cx - innerPx} ${cy}
                                        A ${innerPx} ${innerPx} 0 1 0 ${cx + innerPx} ${cy}
                                    ` : ''}
                                `}
                                fill={ringColor(i, numRings)}
                                fillRule="evenodd"
                            />
                        </g>
                    );
                })}
                {/* Center point */}
                <circle
                    cx={CIRCLE_CENTER_X}
                    cy={CIRCLE_CENTER_Y}
                    r="3"
                    fill={INK_STRUCTURE}
                />
                {/* Outer circle stroke */}
                <circle
                    cx={CIRCLE_CENTER_X}
                    cy={CIRCLE_CENTER_Y}
                    r={CIRCLE_VISUAL_RADIUS}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth="2"
                />
                {/* Ring boundary lines */}
                {rings.slice(0, -1).map((ring, i) => (
                    <circle
                        key={`boundary-${i}`}
                        cx={CIRCLE_CENTER_X}
                        cy={CIRCLE_CENTER_Y}
                        r={ring.outerRadius * pxPerUnit}
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                    />
                ))}
            </g>

            {/* Scissors cut indicator */}
            <line
                x1={CIRCLE_CENTER_X}
                y1={CIRCLE_CENTER_Y}
                x2={CIRCLE_CENTER_X + CIRCLE_VISUAL_RADIUS + 10}
                y2={CIRCLE_CENTER_Y}
                stroke={ACCENT}
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
            />
            <text
                x={CIRCLE_CENTER_X + CIRCLE_VISUAL_RADIUS + 15}
                y={CIRCLE_CENTER_Y + 4}
                fill={INK}
                fontSize="11"
            >
                cut
            </text>

            {/* Label: R */}
            <text
                x={CIRCLE_CENTER_X}
                y={CIRCLE_CENTER_Y + CIRCLE_VISUAL_RADIUS + 25}
                fill={INK_STRUCTURE}
                fontSize="12"
                textAnchor="middle"
                fontStyle="italic"
            >
                R = {R}
            </text>

            {/* ─── Right side: Stacked rectangles forming triangle ─── */}
            <g data-concept="unwrapping_totalArea">
                {rings.map((ring, i) => {
                    const rectWidth = ring.circumference * rectWidthScale;
                    const rectHeight = Math.max(2, (RECT_SCALE_HEIGHT * dr));
                    const y = RECT_STACK_BOTTOM - (i + 1) * rectHeight;
                    const x = RECT_STACK_LEFT;

                    return (
                        <g key={`rect-${i}`}>
                            <rect
                                x={x}
                                y={y}
                                width={rectWidth}
                                height={rectHeight}
                                fill={ringColor(i, numRings)}
                                stroke={INK_QUIET}
                                strokeWidth="0.5"
                            />
                        </g>
                    );
                })}

                {/* Triangle outline overlay (shows the approaching shape) */}
                <path
                    d={`M ${RECT_STACK_LEFT} ${RECT_STACK_BOTTOM}
                        L ${RECT_STACK_LEFT + RECT_MAX_WIDTH} ${RECT_STACK_BOTTOM}
                        L ${RECT_STACK_LEFT} ${RECT_STACK_BOTTOM - numRings * Math.max(2, RECT_SCALE_HEIGHT * dr)}
                        Z`}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.6"
                />
            </g>

            {/* ─── Labels for rectangles ─── */}
            {/* Width label: 2πr (on widest/top rectangle) */}
            {numRings > 0 && (
                <>
                    <text
                        x={RECT_STACK_LEFT + RECT_MAX_WIDTH / 2}
                        y={RECT_STACK_BOTTOM + 20}
                        fill={ACCENT}
                        fontSize="12"
                        textAnchor="middle"
                        fontWeight="600"
                    >
                        width = 2πr
                    </text>
                    {/* Height label: dr */}
                    <g>
                        <line
                            x1={RECT_STACK_LEFT - 15}
                            y1={RECT_STACK_BOTTOM}
                            x2={RECT_STACK_LEFT - 15}
                            y2={RECT_STACK_BOTTOM - Math.max(2, RECT_SCALE_HEIGHT * dr)}
                            stroke={INK_STRUCTURE}
                            strokeWidth="1.5"
                            markerStart="url(#arrowUp)"
                            markerEnd="url(#arrowDown)"
                        />
                        <text
                            x={RECT_STACK_LEFT - 25}
                            y={RECT_STACK_BOTTOM - Math.max(2, RECT_SCALE_HEIGHT * dr) / 2 + 4}
                            fill={INK}
                            fontSize="11"
                            textAnchor="end"
                            fontStyle="italic"
                        >
                            dr
                        </text>
                    </g>
                </>
            )}

            {/* ─── Readouts ─── */}
            <g fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
                {/* Number of rings */}
                <text x="30" y="30" fill={INK}>
                    Rings: <tspan fontWeight="600" fill={ACCENT}>{numRings}</tspan>
                </text>
                {/* Ring thickness */}
                <text x="30" y="50" fill={INK}>
                    dr = R/{numRings} ={" "}
                    <tspan data-concept="unwrapping_dr" fontWeight="600">{dr.toFixed(2)}</tspan>
                </text>
                {/* Total area */}
                <text x="280" y="30" fill={INK}>
                    Total area ≈{" "}
                    <tspan fontWeight="600" fill={ACCENT}>{totalArea.toFixed(2)}</tspan>
                </text>
                {/* Exact area comparison */}
                <text x="280" y="50" fill={INK_STRUCTURE}>
                    πR² = {exactArea.toFixed(2)}
                </text>
            </g>

            {/* Arrow markers */}
            <defs>
                <marker
                    id="arrowUp"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="10"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M 0 10 L 5 0 L 10 10" fill="none" stroke={INK_STRUCTURE} strokeWidth="1.5" />
                </marker>
                <marker
                    id="arrowDown"
                    viewBox="0 0 10 10"
                    refX="5"
                    refY="0"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                >
                    <path d="M 0 0 L 5 10 L 10 0" fill="none" stroke={INK_STRUCTURE} strokeWidth="1.5" />
                </marker>
            </defs>
        </svg>
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
                caption="A circle sliced into rings, with each ring cut and unrolled into a rectangle. The rectangles stack to form a triangle shape."
            >
                <UnwrappingRingsDrawing />
                <div className="px-6 pb-5">
                    <FigureSlider
                        varName="numRings"
                        label="Number of rings"
                        {...numberPropsFromDefinition(getVariableInfo("numRings"))}
                        formatValue={(v) => `${Math.round(v)} rings`}
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
                The width of that rectangle is the circumference at that radius — 2πr. The height is just the thickness of the ring. Adjust the slider to change how many rings divide the circle. As you add more rings, each one gets thinner, and the stack of rectangles on the right shows a cleaner approximation of... something familiar.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-figure" maxWidth="xl">
        <Block id="unwrapping-rings-figure" padding="sm" hasVisualization>
            <UnwrappingRingsFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-question" maxWidth="xl">
        <Block id="unwrapping-rings-question" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-question" blockId="unwrapping-rings-question">
                Do you see it forming? The rectangles are arranging themselves into a shape you already know how to calculate. That shape is a{" "}
                <InlineFeedback
                    varName="unwrapping_shapeAnswer"
                    correctValue="triangle"
                    position="terminal"
                    successMessage="— exactly! A triangle with base 2πR and height R"
                    failureMessage="— look again at the stacked rectangles"
                    hint="Notice how the widest strip is at the bottom and they get narrower as they stack upward"
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
