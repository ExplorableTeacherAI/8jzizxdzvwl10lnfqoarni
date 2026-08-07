/**
 * Unwrapping Rings Section
 * ========================
 *
 * Second section: visualizing the direct correspondence between rings in the
 * circle and strips in the triangle. Ported faithfully from the approved live
 * scene — split-screen with circle on left and triangle on right; when a ring
 * is highlighted, the corresponding strip highlights simultaneously.
 *
 * Learning objective: See the direct connection between a ring in the circle
 * and its corresponding strip in the triangle — each ring becomes a horizontal
 * strip with width equal to its circumference.
 *
 * Proposition: A thin ring, when cut and unrolled, becomes a rectangle with
 * width 2πr (the circumference) and height dr (the thickness).
 */

import { type ReactElement, useEffect, useState, useRef, useCallback } from "react";
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
    ringThicknessForN,
    ringMidRadius,
    ringOuterRadius,
} from "../model";

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 500;
const VIEW_HEIGHT = 280;
const PADDING = 24;

// Circle panel (left side)
const CIRCLE_CX = 115;
const CIRCLE_CY = 140;
const CIRCLE_RADIUS_PX = 70;

// Triangle panel (right side)
const TRI_CENTER_X = 370;
const TRI_BOTTOM_Y = 245;
const TRI_MAX_BASE = 160;
const TRI_MAX_HEIGHT = 180;

// Colors (from design language)
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#94A3B8";
const ACCENT = "#62D0AD"; // Soft teal — ONE accent
const ACCENT_HIGHLIGHT = "rgba(98, 208, 173, 0.9)";

// ── Helper: generate color gradient for rings ────────────────────────────────

const ringColor = (index: number, total: number): string => {
    // Quiet teal gradient — fills whisper, strokes carry identity
    const hue = 200 + (index / Math.max(1, total)) * 60; // 200 → 260
    const saturation = 40 + (index / Math.max(1, total)) * 20; // 40 → 60
    const lightness = 70 - (index / Math.max(1, total)) * 25; // 70 → 45
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// ── The bespoke drawing ──────────────────────────────────────────────────────

function RingCorrespondenceDrawing() {
    const setVar = useSetVar();
    const numRings = useVar<number>("numRings", 5);
    const R = useVar<number>("R", 4);
    const [hoveredRing, setHoveredRing] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    // Derive values
    const dr = ringThicknessForN(R, numRings);
    const pxPerUnit = CIRCLE_RADIUS_PX / R;

    // Highlighted ring: hovered if any, else middle ring
    const highlightIndex = hoveredRing !== null
        ? hoveredRing
        : Math.floor((numRings - 1) / 2);

    const highlightedMidR = ringMidRadius(R, numRings, highlightIndex);
    const highlightedCirc = circumference(highlightedMidR);

    // Write derived values to store
    useEffect(() => {
        setVar("unwrapping_dr", dr);
        setVar("unwrapping_highlightedRing", highlightIndex);
        setVar("unwrapping_highlightedCircumference", highlightedCirc);
    }, [setVar, dr, highlightIndex, highlightedCirc]);

    // Triangle scale calculation
    const maxCirc = circumference(R); // 2πR — the maximum strip width
    const triScale = Math.min(TRI_MAX_BASE / maxCirc, TRI_MAX_HEIGHT / R);
    const scaledBase = maxCirc * triScale;
    const scaledHeight = R * triScale;
    const triLeft = TRI_CENTER_X - scaledBase / 2;
    const triTop = TRI_BOTTOM_Y - scaledHeight;

    // Handle hover events on rings
    const handleRingEnter = useCallback((index: number) => {
        setHoveredRing(index);
    }, []);

    const handleRingLeave = useCallback(() => {
        setHoveredRing(null);
    }, []);

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label={`Circle with ${numRings} rings on left, triangle of stacked strips on right, with corresponding ring and strip highlighted`}
        >
            {/* Frozen parameter indicator */}
            <text
                x={VIEW_WIDTH - PADDING}
                y={18}
                fill={INK_QUIET}
                fontSize="11"
                textAnchor="end"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                R = {R} (from previous section)
            </text>

            {/* ─── LEFT PANEL: Circle with concentric rings ─── */}
            <g data-concept="numRings">
                {/* Draw rings from outside in so inner rings appear on top */}
                {Array.from({ length: numRings }, (_, i) => numRings - 1 - i).map((i) => {
                    const rOuter = ringOuterRadius(R, numRings, i) * pxPerUnit;

                    return (
                        <circle
                            key={`ring-${i}`}
                            cx={CIRCLE_CX}
                            cy={CIRCLE_CY}
                            r={rOuter}
                            fill={ringColor(i, numRings)}
                            stroke="#fff"
                            strokeWidth="0.5"
                            style={{ cursor: "pointer" }}
                            onPointerEnter={() => handleRingEnter(i)}
                            onPointerLeave={handleRingLeave}
                        />
                    );
                })}

                {/* Highlight ring — accent stroke on the selected ring */}
                <circle
                    cx={CIRCLE_CX}
                    cy={CIRCLE_CY}
                    r={ringMidRadius(R, numRings, highlightIndex) * pxPerUnit}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="3"
                    data-concept="unwrapping_highlightedRing"
                />
            </g>

            {/* Circle label */}
            <text
                x={CIRCLE_CX}
                y={CIRCLE_CY + CIRCLE_RADIUS_PX + 20}
                fill={INK}
                fontSize="11"
                textAnchor="middle"
            >
                r = {highlightedMidR.toFixed(1)}
            </text>

            {/* ─── RIGHT PANEL: Triangle of stacked strips ─── */}
            <g data-concept="unwrapping_highlightedCircumference">
                {/* Draw strips as trapezoids stacking to form triangle */}
                {Array.from({ length: numRings }, (_, i) => {
                    const rOuter = ringOuterRadius(R, numRings, i);
                    const rInner = i === 0 ? 0 : ringOuterRadius(R, numRings, i - 1);
                    const circOuter = circumference(rOuter);
                    const circInner = circumference(rInner);

                    const yBottom = TRI_BOTTOM_Y - rInner * triScale;
                    const yTop = TRI_BOTTOM_Y - rOuter * triScale;
                    const wBottom = circInner * triScale;
                    const wTop = circOuter * triScale;
                    const xBottomL = TRI_CENTER_X - wBottom / 2;
                    const xBottomR = TRI_CENTER_X + wBottom / 2;
                    const xTopL = TRI_CENTER_X - wTop / 2;
                    const xTopR = TRI_CENTER_X + wTop / 2;

                    const isHighlighted = i === highlightIndex;

                    // Innermost ring (i=0) is a triangle tip
                    const pathD = i === 0
                        ? `M${TRI_CENTER_X},${yBottom} L${xTopL},${yTop} L${xTopR},${yTop} Z`
                        : `M${xBottomL},${yBottom} L${xTopL},${yTop} L${xTopR},${yTop} L${xBottomR},${yBottom} Z`;

                    return (
                        <path
                            key={`strip-${i}`}
                            d={pathD}
                            fill={isHighlighted ? ACCENT_HIGHLIGHT : ringColor(i, numRings)}
                            stroke="#fff"
                            strokeWidth="0.5"
                            style={{ cursor: "pointer" }}
                            onPointerEnter={() => handleRingEnter(i)}
                            onPointerLeave={handleRingLeave}
                        />
                    );
                })}

                {/* Triangle outline */}
                <path
                    d={`M${TRI_CENTER_X},${TRI_BOTTOM_Y} L${triLeft},${triTop} L${triLeft + scaledBase},${triTop} Z`}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />

                {/* Dimension labels */}
                {/* Base label: 2πR */}
                <text
                    x={TRI_CENTER_X}
                    y={triTop - 8}
                    fill={ACCENT}
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="middle"
                >
                    2πR
                </text>

                {/* Height label: R */}
                <text
                    x={triLeft + scaledBase + 12}
                    y={(triTop + TRI_BOTTOM_Y) / 2}
                    fill={ACCENT}
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="start"
                >
                    R
                </text>
            </g>

            {/* Highlighted strip circumference readout */}
            <text
                x={TRI_CENTER_X}
                y={TRI_BOTTOM_Y + 20}
                fill={INK}
                fontSize="11"
                textAnchor="middle"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                width = 2πr = {highlightedCirc.toFixed(1)}
            </text>

            {/* Connection line between highlighted ring and strip (visual link) */}
            {highlightIndex >= 0 && (
                <line
                    x1={CIRCLE_CX + ringMidRadius(R, numRings, highlightIndex) * pxPerUnit}
                    y1={CIRCLE_CY}
                    x2={triLeft}
                    y2={TRI_BOTTOM_Y - ringMidRadius(R, numRings, highlightIndex) * triScale}
                    stroke={ACCENT}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    opacity="0.6"
                />
            )}
        </svg>
    );
}

// ── Figure shell composition ─────────────────────────────────────────────────

function RingCorrespondenceFigure() {
    const setVar = useSetVar();

    return (
        <div data-manipulated-variable="numRings">
            <Figure
                id="unwrapping-rings-figure"
                onReset={() => {
                    setVar("numRings", 5);
                }}
                caption="Circle divided into rings (left) and the same rings stacked into a triangle (right). Hover over any ring or strip to see the correspondence."
            >
                <RingCorrespondenceDrawing />
                <div className="px-6 pb-5">
                    <FigureSlider
                        varName="numRings"
                        label="Rings"
                        {...numberPropsFromDefinition(getVariableInfo("numRings"))}
                        formatValue={(v) => `${Math.round(v)}`}
                    />
                </div>
                <InteractionHintSequence
                    hintKey="unwrapping-rings-hover"
                    steps={[
                        {
                            gesture: "hover",
                            label: "Hover over a ring to see its matching strip",
                            position: { x: "28%", y: "50%" },
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
                The Magic Connection
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-intro" maxWidth="xl">
        <Block id="unwrapping-rings-intro" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-intro" blockId="unwrapping-rings-intro">
                You've seen rings filling the circle. Now watch what happens when we unroll them.
                On the left, the same circle divided into rings. On the right, each ring laid out flat as a strip, stacking into a triangle.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-figure" maxWidth="xl">
        <Block id="unwrapping-rings-figure" padding="sm" hasVisualization>
            <RingCorrespondenceFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-guidance" maxWidth="xl">
        <Block id="unwrapping-rings-guidance" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-guidance" blockId="unwrapping-rings-guidance">
                Hover over any ring in the circle. The matching strip in the triangle lights up
                at the same moment — a direct one-to-one correspondence. Each ring's width when
                unrolled is its circumference, 2πr.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-conclusion" maxWidth="xl">
        <Block id="unwrapping-rings-conclusion" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-conclusion" blockId="unwrapping-rings-conclusion">
                The connection between circle and triangle is direct and visible. Every ring
                has its place in the triangle.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-unwrapping-rings-question" maxWidth="xl">
        <Block id="unwrapping-rings-question" padding="sm">
            <EditableParagraph id="para-unwrapping-rings-question" blockId="unwrapping-rings-question">
                What shape do the stacked strips form? A{" "}
                <InlineFeedback
                    varName="unwrapping_shapeAnswer"
                    correctValue="triangle"
                    position="terminal"
                    successMessage="— exactly! A triangle with base 2πR and height R"
                    failureMessage="— look again at the stacked strips on the right"
                    hint="Notice how the widest strip is at the top and they get narrower as they go down"
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
