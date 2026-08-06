/**
 * Triangle Emerges Section
 * ========================
 *
 * The culminating aha moment: stacked ring-rectangles form a triangle with
 * base 2πR and height R, whose area equals πR² — the circle area formula.
 */

import { type ReactElement, useEffect, useRef, useState } from "react";
import { StackLayout, SplitLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InteractionHintSequence,
    InlineFeedback,
    InlineClozeInput,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring } from "@/lib/motion";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    clozePropsFromDefinition,
} from "../variables";
import {
    ringThicknessForN,
    ringMidRadius,
    circumference,
    maxCircumference,
    accumulatedArea,
    visibleRingCount,
    circleArea,
} from "../model";

// ── View Constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 560;
const VIEW_HEIGHT = 400;
const PADDING = 32;

// Drawing area boundaries
const DRAW_LEFT = PADDING + 60; // Space for Y-axis label
const DRAW_RIGHT = VIEW_WIDTH - PADDING - 20;
const DRAW_TOP = PADDING + 40; // Space for formula
const DRAW_BOTTOM = VIEW_HEIGHT - PADDING - 50; // Space for X-axis label and counter
const DRAW_WIDTH = DRAW_RIGHT - DRAW_LEFT;
const DRAW_HEIGHT = DRAW_BOTTOM - DRAW_TOP;

// Colors (from design language)
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#94A3B8";
const ACCENT = "#62D0AD"; // Soft teal — ONE accent
const ACCENT_FILL = "rgba(98, 208, 173, 0.18)";

// ── Bespoke Drawing Component ────────────────────────────────────────────────

function TriangleStackDrawing() {
    const setVar = useSetVar();
    const R = useVar<number>("R", 4);
    const numRings = useVar<number>("numRings", 5);
    const sweepR = useVar<number>("sweepR", 1.2);

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Compute derived values from model
    const dr = ringThicknessForN(R, numRings);
    const totalArea = accumulatedArea(sweepR, R, numRings);
    const visibleCount = visibleRingCount(sweepR, R, numRings);
    const maxCirc = maxCircumference(R);
    const exactArea = circleArea(R);
    const isComplete = sweepR >= R - 0.05;

    // Write derived values to store for verification
    useEffect(() => {
        setVar("triangleEmerges_accumulatedArea", totalArea);
        setVar("triangleEmerges_currentRingArea", visibleCount > 0
            ? circumference(ringMidRadius(R, numRings, visibleCount - 1)) * dr
            : 0);
        setVar("triangleEmerges_triangleArea", exactArea);
    }, [setVar, totalArea, visibleCount, R, numRings, dr, exactArea]);

    // Spring for smooth handle scale
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, {
        stiffness: 400,
        damping: 26,
    });

    // Scale factors to map model coordinates to view coordinates
    // X: circumference (0 to 2πR) maps to DRAW_WIDTH
    // Y: radius (0 to R) maps to DRAW_HEIGHT (but inverted — bottom is 0, top is R)
    const scaleX = DRAW_WIDTH / maxCirc;
    const scaleY = DRAW_HEIGHT / R;

    // Build bars data
    const bars: Array<{
        index: number;
        width: number;
        height: number;
        y: number;
        r: number;
    }> = [];

    for (let i = 0; i < visibleCount; i++) {
        const ringR = ringMidRadius(R, numRings, i);
        const barWidth = circumference(ringR) * scaleX;
        const barHeight = dr * scaleY;
        // Bars stack from bottom (y = DRAW_BOTTOM) upward
        const y = DRAW_BOTTOM - (i + 1) * barHeight;
        bars.push({ index: i, width: barWidth, height: barHeight, y, r: ringR });
    }

    // Current ring label position (if there are visible rings)
    const currentRing = bars.length > 0 ? bars[bars.length - 1] : null;

    // Handle position for sweep control (on the right edge of the triangle)
    const handleY = DRAW_BOTTOM - (sweepR / R) * DRAW_HEIGHT;
    const handleX = DRAW_RIGHT;

    // Pointer event handlers for dragging
    const svgPointFromEvent = (event: React.PointerEvent): { x: number; y: number } => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
        };
    };

    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging) return;
        const point = svgPointFromEvent(event);
        // Map Y position back to sweep value
        const newSweep = R * (1 - (point.y - DRAW_TOP) / DRAW_HEIGHT);
        setVar("sweepR", clamp(newSweep, 0, R));
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="Stacked ring-rectangles forming a triangle shape"
        >
            <defs>
                {/* Soft shadow for draggable handle */}
                <filter id="triangle-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Frozen parameters indicator (carried over from previous section) */}
            <g style={{ fontVariantNumeric: "tabular-nums" }}>
                <text
                    x={VIEW_WIDTH - PADDING}
                    y={20}
                    fill={INK_QUIET}
                    fontSize="11"
                    textAnchor="end"
                >
                    R = {R} · {numRings} rings
                </text>
                <text
                    x={VIEW_WIDTH - PADDING}
                    y={33}
                    fill={INK_QUIET}
                    fontSize="9"
                    textAnchor="end"
                    fontStyle="italic"
                >
                    (from previous section)
                </text>
            </g>

            {/* Axis labels */}
            <text
                x={DRAW_LEFT + DRAW_WIDTH / 2}
                y={VIEW_HEIGHT - 12}
                fill={INK}
                fontSize="12"
                textAnchor="middle"
            >
                Circumference (width = 2πr)
            </text>
            <text
                x={16}
                y={DRAW_TOP + DRAW_HEIGHT / 2}
                fill={INK}
                fontSize="12"
                textAnchor="middle"
                transform={`rotate(-90, 16, ${DRAW_TOP + DRAW_HEIGHT / 2})`}
            >
                Radius (height = R)
            </text>

            {/* Draw area border (subtle) */}
            <rect
                x={DRAW_LEFT}
                y={DRAW_TOP}
                width={DRAW_WIDTH}
                height={DRAW_HEIGHT}
                fill="none"
                stroke={INK_QUIET}
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity="0.5"
            />

            {/* The stacked bars (rectangles) — building the triangle */}
            <g data-concept="triangleEmerges_accumulatedArea">
                {bars.map((bar) => (
                    <rect
                        key={bar.index}
                        x={DRAW_LEFT}
                        y={bar.y}
                        width={bar.width}
                        height={Math.max(bar.height - 1, 1)}
                        fill={ACCENT_FILL}
                        stroke={ACCENT}
                        strokeWidth="1.5"
                        rx="1"
                    />
                ))}
            </g>

            {/* Triangle outline when complete — shows the ideal shape */}
            {isComplete && (
                <polygon
                    points={`${DRAW_LEFT},${DRAW_BOTTOM} ${DRAW_LEFT + DRAW_WIDTH},${DRAW_BOTTOM} ${DRAW_LEFT},${DRAW_TOP}`}
                    fill="none"
                    stroke={INK_STRUCTURE}
                    strokeWidth="2"
                    strokeDasharray="6 4"
                    opacity="0.6"
                />
            )}

            {/* Current ring formula label */}
            {currentRing && !isComplete && (
                <g>
                    <text
                        x={DRAW_LEFT + currentRing.width + 8}
                        y={currentRing.y + currentRing.height / 2 + 4}
                        fill={ACCENT}
                        fontSize="11"
                        fontStyle="italic"
                    >
                        2π × {currentRing.r.toFixed(1)} × dr
                    </text>
                </g>
            )}

            {/* Dimension labels when complete */}
            {isComplete && (
                <>
                    {/* Base label: 2πR */}
                    <text
                        x={DRAW_LEFT + DRAW_WIDTH / 2}
                        y={DRAW_BOTTOM + 20}
                        fill={ACCENT}
                        fontSize="13"
                        fontWeight="600"
                        textAnchor="middle"
                    >
                        Base = 2πR = {maxCirc.toFixed(1)}
                    </text>
                    {/* Height label: R */}
                    <text
                        x={DRAW_LEFT - 8}
                        y={DRAW_TOP + DRAW_HEIGHT / 2}
                        fill={ACCENT}
                        fontSize="13"
                        fontWeight="600"
                        textAnchor="end"
                        transform={`rotate(-90, ${DRAW_LEFT - 8}, ${DRAW_TOP + DRAW_HEIGHT / 2})`}
                    >
                        Height = R = {R}
                    </text>
                </>
            )}

            {/* Running area counter — positioned below the drawing */}
            <g style={{ fontVariantNumeric: "tabular-nums" }}>
                <text
                    x={DRAW_LEFT}
                    y={DRAW_BOTTOM + 38}
                    fill={INK}
                    fontSize="12"
                >
                    Accumulated area:
                </text>
                <text
                    x={DRAW_LEFT + 108}
                    y={DRAW_BOTTOM + 38}
                    fill={ACCENT}
                    fontSize="13"
                    fontWeight="600"
                    data-concept="triangleEmerges_accumulatedArea"
                >
                    {totalArea.toFixed(2)}
                </text>
                {isComplete && (
                    <text
                        x={DRAW_LEFT + 170}
                        y={DRAW_BOTTOM + 38}
                        fill={INK_STRUCTURE}
                        fontSize="12"
                    >
                        = πR² = π × {R}² ≈ {exactArea.toFixed(2)}
                    </text>
                )}
            </g>

            {/* Sweep position indicator line */}
            <line
                x1={DRAW_LEFT}
                x2={DRAW_RIGHT}
                y1={handleY}
                y2={handleY}
                stroke={ACCENT}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.6"
            />

            {/* Draggable handle for sweep position */}
            <g
                data-manipulated-variable="sweepR"
                transform={`translate(${handleX}, ${handleY}) scale(${handleScale})`}
            >
                <circle
                    r="12"
                    fill={ACCENT}
                    filter="url(#triangle-handle-shadow)"
                    data-concept="sweepR"
                />
                {/* Arrow indicator inside handle */}
                <path
                    d="M -4 -3 L 0 -6 L 4 -3 M -4 3 L 0 6 L 4 3"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                />
            </g>

            {/* Invisible hit area for the handle (larger for touch) */}
            <circle
                cx={handleX}
                cy={handleY}
                r="24"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(true);
                }}
                onPointerMove={handlePointerMove}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            />

            {/* Sweep position readout */}
            <text
                x={handleX + 16}
                y={handleY + 4}
                fill={INK}
                fontSize="11"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                r = {sweepR.toFixed(1)}
            </text>
        </svg>
    );
}

// ── Figure Shell Composition ─────────────────────────────────────────────────

function TriangleStackFigure() {
    const setVar = useSetVar();
    const R = useVar<number>("R", 4);

    return (
        <Figure
            id="triangle-emerges-figure"
            onReset={() => {
                setVar("sweepR", 1.2);
            }}
            caption="Sweep through the radii using the slider. Bars stack upward, widening with r, to form a triangle with base 2πR and height R."
        >
            <TriangleStackDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="sweepR"
                    label="Sweep radius"
                    {...numberPropsFromDefinition(getVariableInfo("sweepR"))}
                    formatValue={(v) => `r = ${v.toFixed(1)}`}
                />
            </div>
            <InteractionHintSequence
                hintKey="triangle-emerges-drag"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag up to sweep outward through the radii",
                        position: { x: "91%", y: "58%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: 0, y: 25 },
                            endOffset: { x: 0, y: -35 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported Section Blocks ──────────────────────────────────────────────────

export const triangleEmergesBlocks: ReactElement[] = [
    <StackLayout key="layout-triangle-emerges-heading" maxWidth="xl">
        <Block id="triangle-emerges-heading" padding="md">
            <EditableH2 id="h2-triangle-emerges-heading" blockId="triangle-emerges-heading">
                The Triangle Emerges
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-triangle-emerges-intro" maxWidth="xl">
        <Block id="triangle-emerges-intro" padding="sm">
            <EditableParagraph id="para-triangle-emerges-intro" blockId="triangle-emerges-intro">
                You spotted the triangle. Now let's see why it matters. Look at its
                dimensions: the base is the longest rectangle — the outer circumference, 2πR.
                The height is the full radius R.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-triangle-emerges-figure" maxWidth="xl">
        <Block id="triangle-emerges-figure" padding="sm" hasVisualization>
            <TriangleStackFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-triangle-emerges-guidance" maxWidth="xl">
        <Block id="triangle-emerges-guidance" padding="sm">
            <EditableParagraph id="para-triangle-emerges-guidance" blockId="triangle-emerges-guidance">
                Drag the handle upward to sweep from the center outward. Watch each ring's area
                (2πr × dr) stack one by one. The running total shows your accumulated area
                climbing toward a familiar value.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-triangle-emerges-reveal" maxWidth="xl">
        <Block id="triangle-emerges-reveal" padding="sm">
            <EditableParagraph id="para-triangle-emerges-reveal" blockId="triangle-emerges-reveal">
                When you reach the full radius, the triangle is complete. Its area? Half base
                times height: ½ × 2πR × R = πR². That's not a formula handed down from above —
                it's the inevitable consequence of how circles are built from rings.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-triangle-emerges-question" maxWidth="xl">
        <Block id="triangle-emerges-question" padding="md">
            <EditableParagraph id="para-triangle-emerges-question" blockId="triangle-emerges-question">
                The circle area formula πR² comes directly from the area of what
                geometric shape?{" "}
                <InlineFeedback
                    varName="triangleEmerges_formulaAnswer"
                    correctValue="triangle"
                    position="standalone"
                    successMessage="Exactly! The stacked ring-rectangles form a triangle, and its area formula ½ × base × height gives us πR²"
                    failureMessage="Look at the shape the bars form when fully stacked"
                    hint="Half base times height equals πR²"
                >
                    <InlineClozeInput
                        varName="triangleEmerges_formulaAnswer"
                        correctAnswer="triangle"
                        {...clozePropsFromDefinition(getVariableInfo("triangleEmerges_formulaAnswer"))}
                    />
                </InlineFeedback>
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
