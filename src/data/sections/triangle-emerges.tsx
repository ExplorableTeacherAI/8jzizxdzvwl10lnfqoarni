/**
 * Triangle Emerges Section
 * ========================
 *
 * The culminating aha moment: stacked ring-rectangles form a triangle with
 * base 2πR and height R, whose area equals πR² — the circle area formula.
 *
 * Ported faithfully from the approved live scene: dual visualization with
 * circle (left) and stacking bars (right). Dragging the handle outward on
 * the circle sweeps through the radii, adding bars to the triangle.
 */

import { type ReactElement, useEffect, useRef, useState } from "react";
import { StackLayout } from "@/components/layouts";
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
const VIEW_HEIGHT = 340;
const PADDING = 24;

// Circle area (left side)
const CIRCLE_CX = 140;
const CIRCLE_CY = 160;
const MAX_CIRCLE_RADIUS = 65;

// Triangle/bars area (right side)
const BARS_ORIGIN_X = 310;
const BARS_ORIGIN_Y = 280;
const BARS_WIDTH = 180;
const BARS_HEIGHT = 200;

// Colors (from design language)
const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#94A3B8";
const ACCENT = "#62D0AD"; // Soft teal — ONE accent
const ACCENT_FILL = "rgba(98, 208, 173, 0.18)";
const ACCENT_RING = "rgba(98, 208, 173, 0.35)";

// ── Bespoke Drawing Component ────────────────────────────────────────────────

function TriangleDualDrawing() {
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
    const handleScale = useSpring(dragging || hovered ? 1.2 : 1, {
        stiffness: 400,
        damping: 26,
    });

    // Scale factors
    const circlePxPerUnit = MAX_CIRCLE_RADIUS / R;
    const sweepPx = sweepR * circlePxPerUnit;

    // Bar dimensions
    const barWidthTotal = BARS_WIDTH / numRings;
    const barHeightScale = BARS_HEIGHT / maxCirc;

    // Build bars data
    const bars: Array<{
        index: number;
        width: number;
        height: number;
        x: number;
        y: number;
        r: number;
    }> = [];

    for (let i = 0; i < visibleCount; i++) {
        const ringR = ringMidRadius(R, numRings, i);
        const ringCirc = circumference(ringR);
        const barHeight = ringCirc * barHeightScale;
        const x = BARS_ORIGIN_X + i * barWidthTotal;
        const y = BARS_ORIGIN_Y - barHeight;
        bars.push({ index: i, width: barWidthTotal - 1, height: barHeight, x, y, r: ringR });
    }

    // Current ring (last visible one)
    const currentRing = bars.length > 0 ? bars[bars.length - 1] : null;

    // Handle position on circle (at sweep radius, right side)
    const handleAngle = 0; // radians — pointing right
    const handleX = CIRCLE_CX + sweepPx * Math.cos(handleAngle);
    const handleY = CIRCLE_CY - sweepPx * Math.sin(handleAngle);

    // Pointer event handlers
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
        // Calculate distance from circle center
        const dx = point.x - CIRCLE_CX;
        const dy = point.y - CIRCLE_CY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Map back to sweep value
        const newSweep = distance / circlePxPerUnit;
        setVar("sweepR", clamp(newSweep, 0, R));
    };

    // Triangle diagonal line for visualization
    const maxBarHeight = maxCirc * barHeightScale;
    const triangleEndX = BARS_ORIGIN_X + numRings * barWidthTotal;
    const triangleEndY = BARS_ORIGIN_Y - maxBarHeight;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="Circle being swept outward with bars stacking to form a triangle"
        >
            <defs>
                {/* Soft shadow for draggable handle */}
                <filter id="triangle-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Frozen parameters indicator */}
            <g style={{ fontVariantNumeric: "tabular-nums" }}>
                <text x={VIEW_WIDTH - PADDING} y={20} fill={INK_QUIET} fontSize="11" textAnchor="end">
                    R = {R} · {numRings} rings (from previous section)
                </text>
            </g>

            {/* ── LEFT SIDE: Circle visualization ── */}
            <g transform={`translate(${CIRCLE_CX}, ${CIRCLE_CY})`}>
                {/* Full circle outline (target) */}
                <circle
                    r={MAX_CIRCLE_RADIUS}
                    fill="none"
                    stroke={INK_QUIET}
                    strokeWidth="1"
                    strokeDasharray="4 3"
                    opacity="0.5"
                />

                {/* Filled circle area (swept so far) */}
                <circle
                    r={sweepPx}
                    fill={ACCENT_FILL}
                    stroke="none"
                />

                {/* Current ring highlight */}
                {visibleCount > 0 && !isComplete && (
                    <circle
                        r={Math.max(0, sweepPx - (dr * circlePxPerUnit) / 2)}
                        fill="none"
                        stroke={ACCENT}
                        strokeWidth="3"
                        opacity="0.7"
                    />
                )}

                {/* Ring formula label */}
                {!isComplete && sweepPx > 10 && (
                    <text
                        x={sweepPx / 2}
                        y={-Math.max(sweepPx + 14, 45)}
                        fill={ACCENT}
                        fontSize="11"
                        fontStyle="italic"
                        textAnchor="middle"
                    >
                        2πr × dr
                    </text>
                )}

                {/* Draggable handle */}
                <g
                    data-manipulated-variable="sweepR"
                    transform={`translate(${sweepPx}, 0) scale(${handleScale})`}
                >
                    <circle
                        r="10"
                        fill={ACCENT}
                        filter="url(#triangle-handle-shadow)"
                        data-concept="sweepR"
                    />
                </g>

                {/* Invisible hit area for handle (larger for touch) */}
                <circle
                    cx={sweepPx}
                    cy={0}
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
            </g>

            {/* Circle label */}
            <text x={CIRCLE_CX} y={CIRCLE_CY + MAX_CIRCLE_RADIUS + 20} fill={INK} fontSize="11" textAnchor="middle">
                Sweep from center outward
            </text>

            {/* ── RIGHT SIDE: Stacked bars (triangle) ── */}
            <g>
                {/* Axes */}
                <line
                    x1={BARS_ORIGIN_X}
                    y1={BARS_ORIGIN_Y}
                    x2={BARS_ORIGIN_X + BARS_WIDTH + 10}
                    y2={BARS_ORIGIN_Y}
                    stroke={INK_QUIET}
                    strokeWidth="1"
                />
                <line
                    x1={BARS_ORIGIN_X}
                    y1={BARS_ORIGIN_Y}
                    x2={BARS_ORIGIN_X}
                    y2={BARS_ORIGIN_Y - BARS_HEIGHT - 10}
                    stroke={INK_QUIET}
                    strokeWidth="1"
                />

                {/* Stacked bars */}
                <g data-concept="triangleEmerges_accumulatedArea">
                    {bars.map((bar) => (
                        <rect
                            key={bar.index}
                            x={bar.x}
                            y={bar.y}
                            width={bar.width}
                            height={bar.height}
                            fill={bar.index === bars.length - 1 && !isComplete ? ACCENT : ACCENT_FILL}
                            stroke={ACCENT}
                            strokeWidth="1.5"
                            rx="1"
                        />
                    ))}
                </g>

                {/* Triangle diagonal line (showing ideal triangle) */}
                {visibleCount > 0 && (
                    <line
                        x1={BARS_ORIGIN_X}
                        y1={BARS_ORIGIN_Y}
                        x2={BARS_ORIGIN_X + visibleCount * barWidthTotal}
                        y2={BARS_ORIGIN_Y - (currentRing?.height ?? 0)}
                        stroke={ACCENT}
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                        opacity="0.6"
                    />
                )}

                {/* Full triangle outline when complete */}
                {isComplete && (
                    <polygon
                        points={`${BARS_ORIGIN_X},${BARS_ORIGIN_Y} ${triangleEndX},${BARS_ORIGIN_Y} ${BARS_ORIGIN_X},${triangleEndY}`}
                        fill="none"
                        stroke={INK_STRUCTURE}
                        strokeWidth="2"
                        strokeDasharray="6 4"
                        opacity="0.7"
                    />
                )}

                {/* Dimension labels when complete */}
                {isComplete && (
                    <>
                        <text
                            x={BARS_ORIGIN_X + BARS_WIDTH / 2}
                            y={BARS_ORIGIN_Y + 18}
                            fill={ACCENT}
                            fontSize="12"
                            fontWeight="600"
                            textAnchor="middle"
                        >
                            Base = 2πR = {maxCirc.toFixed(1)}
                        </text>
                        <text
                            x={BARS_ORIGIN_X - 8}
                            y={BARS_ORIGIN_Y - BARS_HEIGHT / 2}
                            fill={ACCENT}
                            fontSize="12"
                            fontWeight="600"
                            textAnchor="end"
                            transform={`rotate(-90, ${BARS_ORIGIN_X - 8}, ${BARS_ORIGIN_Y - BARS_HEIGHT / 2})`}
                        >
                            Height = R
                        </text>
                    </>
                )}

                {/* Axis labels */}
                <text
                    x={BARS_ORIGIN_X + BARS_WIDTH / 2}
                    y={BARS_ORIGIN_Y + 35}
                    fill={INK}
                    fontSize="10"
                    textAnchor="middle"
                >
                    ring index →
                </text>
                <text
                    x={BARS_ORIGIN_X - 12}
                    y={BARS_ORIGIN_Y - BARS_HEIGHT / 2}
                    fill={INK}
                    fontSize="10"
                    textAnchor="middle"
                    transform={`rotate(-90, ${BARS_ORIGIN_X - 12}, ${BARS_ORIGIN_Y - BARS_HEIGHT / 2})`}
                >
                    circumference →
                </text>
            </g>

            {/* Running area counter */}
            <g style={{ fontVariantNumeric: "tabular-nums" }}>
                <text x={BARS_ORIGIN_X + 10} y={50} fill={INK} fontSize="12">
                    Area =
                </text>
                <text
                    x={BARS_ORIGIN_X + 52}
                    y={50}
                    fill={ACCENT}
                    fontSize="14"
                    fontWeight="600"
                    data-concept="triangleEmerges_accumulatedArea"
                >
                    {totalArea.toFixed(1)}
                </text>
                {isComplete && (
                    <text x={BARS_ORIGIN_X + 105} y={50} fill={INK_STRUCTURE} fontSize="12">
                        ≈ πR² = {exactArea.toFixed(1)}
                    </text>
                )}
                {!isComplete && (
                    <text x={BARS_ORIGIN_X + 105} y={50} fill={INK_QUIET} fontSize="11" fontStyle="italic">
                        → πR²
                    </text>
                )}
            </g>

            {/* Sweep position readout */}
            <text
                x={CIRCLE_CX + sweepPx + 18}
                y={CIRCLE_CY + 4}
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

    return (
        <Figure
            id="triangle-emerges-figure"
            onReset={() => {
                setVar("sweepR", 1.2);
            }}
            caption="Drag the teal handle outward on the circle. Watch bars stack on the right, widening with r, forming a triangle."
        >
            <TriangleDualDrawing />
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
                        gesture: "drag-horizontal",
                        label: "Drag the handle outward",
                        position: { x: "32%", y: "52%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -15, y: 0 },
                            endOffset: { x: 30, y: 0 },
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
                Here's the aha moment. Those stacked strips form a triangle. Look at its
                dimensions: the base is the longest strip — the outer circumference, 2πR.
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
                Drag outward from the center again, just like before. This time watch the area
                accumulate: each ring contributes 2πr × dr. The bars grow wider as r increases,
                forming that triangular profile. The running total climbs toward a familiar value.
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
