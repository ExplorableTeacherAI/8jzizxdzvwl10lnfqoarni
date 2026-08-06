/**
 * Slicing Into Rings — Section 1 of Circle Area Derivation
 * =========================================================
 *
 * Learning objective: Understand that a circle can be decomposed into many thin
 * concentric rings stacked from center outward.
 *
 * Proposition: A circle can be divided into thin concentric rings at every
 * distance from center to edge.
 *
 * This is the OPENING section of the lesson — it also performs lesson-opening events.
 */

import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH1,
    EditableParagraph,
    InlineScrubbleNumber,
    InlineFormula,
    InlineTooltip,
    InlineClozeChoice,
    InlineFeedback,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, type Vec2 } from "@/lib/motion";
import {
    getVariableInfo,
    numberPropsFromDefinition,
    choicePropsFromDefinition,
} from "../variables";
import { MAX_RADIUS, RING_THICKNESS, ringCount } from "../model";

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 300;
const CENTER: Vec2 = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };
const PIXELS_PER_UNIT = 30; // 4 units * 30 = 120px max radius fits well

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";
const ACCENT_FILL = "rgba(98, 208, 173, 0.15)";
const ACCENT_RING_STROKE = "#99e2d8";

// Ring step in logical units (how often a new ring appears)
const RING_STEP = RING_THICKNESS;

// ── Bespoke Drawing Component ────────────────────────────────────────────────

function BuildingCircleDrawing() {
    const setVar = useSetVar();
    const currentRadius = useVar<number>("rings_currentRadius", 0.2);

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Compute derived values from the model
    const numRings = ringCount(currentRadius, RING_STEP);

    // Write derived value to store for verification
    React.useEffect(() => {
        setVar("rings_ringCount", numRings);
    }, [numRings, setVar]);

    // Spring for handle affordance
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, {
        stiffness: 400,
        damping: 26,
    });

    // Convert pointer to SVG coordinates
    const svgPointFromEvent = (event: React.PointerEvent): Vec2 => {
        const svg = svgRef.current;
        if (!svg) return { x: 0, y: 0 };
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
        };
    };

    // Direct 1:1 tracking during drag — measure distance from center
    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging) return;
        const point = svgPointFromEvent(event);
        const dx = point.x - CENTER.x;
        const dy = point.y - CENTER.y;
        const distance = Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_UNIT;
        setVar("rings_currentRadius", clamp(distance, 0, MAX_RADIUS));
    };

    // Calculate handle position (to the right of center along radius)
    const radiusPx = currentRadius * PIXELS_PER_UNIT;
    const handleX = CENTER.x + radiusPx;
    const handleY = CENTER.y;

    // Arrow line ends slightly before the handle (ensure at least a small visible arrow)
    const arrowEndX = CENTER.x + Math.max(4, radiusPx - 8);

    // Generate ring radii for drawing
    const ringRadii: number[] = [];
    for (let i = 1; i <= numRings; i++) {
        ringRadii.push(i * RING_STEP * PIXELS_PER_UNIT);
    }

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="Circle decomposed into concentric rings by dragging radius outward"
            style={{ touchAction: "none" }}
        >
            <defs>
                {/* Arrowhead marker for the radius line */}
                <marker
                    id="rings-arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon points="0 0, 10 3.5, 0 7" fill={ACCENT} />
                </marker>
                {/* Shadow for draggable handle */}
                <filter id="rings-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow
                        dx="0"
                        dy="1"
                        stdDeviation="1.5"
                        floodColor="#0F172A"
                        floodOpacity="0.25"
                    />
                </filter>
            </defs>

            {/* Full circle boundary — dashed outline showing target */}
            <circle
                cx={CENTER.x}
                cy={CENTER.y}
                r={MAX_RADIUS * PIXELS_PER_UNIT}
                fill="none"
                stroke={INK_QUIET}
                strokeWidth="1.5"
                strokeDasharray="4 4"
            />

            {/* Filled area that grows with radius */}
            <circle
                cx={CENTER.x}
                cy={CENTER.y}
                r={radiusPx}
                fill={ACCENT_FILL}
                stroke="none"
                data-concept="rings_filledArea"
            />

            {/* Accumulated concentric ring strokes */}
            {ringRadii.map((r, i) => (
                <circle
                    key={`ring-${i}`}
                    cx={CENTER.x}
                    cy={CENTER.y}
                    r={r}
                    fill="none"
                    stroke={ACCENT_RING_STROKE}
                    strokeWidth="1"
                    strokeLinecap="round"
                />
            ))}

            {/* Outermost ring highlighted — thicker stroke */}
            <circle
                cx={CENTER.x}
                cy={CENTER.y}
                r={radiusPx}
                fill="none"
                stroke={ACCENT}
                strokeWidth="3"
                strokeLinecap="round"
                data-concept="rings_currentRadius"
            />

            {/* Center point */}
            <circle cx={CENTER.x} cy={CENTER.y} r="3" fill={INK_STRUCTURE} />

            {/* Radius arrow line with arrowhead */}
            <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={arrowEndX}
                y2={handleY}
                stroke={ACCENT}
                strokeWidth="2"
                strokeLinecap="round"
                markerEnd="url(#rings-arrowhead)"
            />

            {/* Handle glow (pulsing affordance) */}
            <circle
                cx={handleX}
                cy={handleY}
                r="12"
                fill={ACCENT}
                opacity={dragging ? 0.5 : 0.3}
                className={!dragging && !hovered ? "animate-pulse" : ""}
            />

            {/* Draggable handle — accent, with affordances */}
            <g
                data-manipulated-variable="rings_currentRadius"
                transform={`translate(${handleX} ${handleY}) scale(${handleScale})`}
            >
                <circle
                    r="8"
                    fill={ACCENT}
                    stroke="#fff"
                    strokeWidth="2"
                    filter="url(#rings-handle-shadow)"
                />
            </g>

            {/* Oversized hit area for the handle */}
            <circle
                cx={handleX}
                cy={handleY}
                r="24"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab" }}
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

            {/* Readouts positioned below the circle */}
            <g
                fontSize="13"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                <text x={CENTER.x - 50} y={VIEW_HEIGHT - 20} fill={INK} textAnchor="middle">
                    r ={" "}
                    <tspan fill={ACCENT} fontWeight="600" data-concept="rings_currentRadius_readout">
                        {currentRadius.toFixed(1)}
                    </tspan>
                </text>
                <text x={CENTER.x + 60} y={VIEW_HEIGHT - 20} fill={INK} textAnchor="middle">
                    <tspan fill={ACCENT} fontWeight="600" data-concept="rings_ringCount">
                        {numRings}
                    </tspan>
                    <tspan> ring{numRings !== 1 ? "s" : ""}</tspan>
                </text>
            </g>

            {/* R label at the edge */}
            <text
                x={CENTER.x + MAX_RADIUS * PIXELS_PER_UNIT + 10}
                y={CENTER.y + 4}
                fill={INK_QUIET}
                fontSize="12"
                fontStyle="italic"
            >
                R
            </text>
        </svg>
    );
}

// ── Figure Shell ─────────────────────────────────────────────────────────────

function BuildingCircleFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="slicing-rings-figure"
            onReset={() => {
                setVar("rings_currentRadius", 0.2);
            }}
            caption="Drag the arrow tip outward from the center. Watch rings paint in one by one as the circle grows."
        >
            <BuildingCircleDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="rings_currentRadius"
                    label="Radius"
                    {...numberPropsFromDefinition(getVariableInfo("rings_currentRadius"))}
                    formatValue={(v) => v.toFixed(1)}
                />
            </div>
            <InteractionHintSequence
                hintKey="slicing-rings-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the arrow tip outward",
                        position: { x: "54%", y: "50%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -15, y: 0 },
                            endOffset: { x: 60, y: 0 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Exported Section Blocks ──────────────────────────────────────────────────

export const slicingIntoRingsBlocks: ReactElement[] = [
    // ── Lesson Opening: Title ────────────────────────────────────────────────
    <StackLayout key="layout-rings-title" maxWidth="xl">
        <Block id="rings-title" padding="md">
            <EditableH1 id="h1-rings-title" blockId="rings-title">
                Slicing a Circle into Rings
            </EditableH1>
        </Block>
    </StackLayout>,

    // ── Lesson Opening: Hook + Goal + Recall ─────────────────────────────────
    <StackLayout key="layout-rings-opening" maxWidth="xl">
        <Block id="rings-opening" padding="sm">
            <EditableParagraph id="para-rings-opening" blockId="rings-opening">
                You've memorized{" "}
                <InlineFormula latex="\pi r^2" colorMap={{}} />. But what if you
                could see exactly where it comes from? Let's slice a circle into
                rings and watch a familiar shape emerge. By the end, you'll
                understand where the formula{" "}
                <InlineFormula latex="\pi r^2" colorMap={{}} /> comes from by
                seeing how concentric rings unwrap and stack into a triangle.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ── Recall: Prior knowledge ──────────────────────────────────────────────
    <StackLayout key="layout-rings-recall" maxWidth="xl">
        <Block id="rings-recall" padding="sm">
            <EditableParagraph id="para-rings-recall" blockId="rings-recall">
                You already know that the{" "}
                <InlineTooltip
                    id="tooltip-circumference"
                    tooltip="The distance around the edge of a circle"
                >
                    circumference
                </InlineTooltip>{" "}
                of a circle equals{" "}
                <InlineFormula
                    latex="2\pi r"
                    colorMap={{}}
                />, and that the{" "}
                <InlineTooltip
                    id="tooltip-radius"
                    tooltip="The distance from the center of a circle to any point on its edge"
                >
                    radius
                </InlineTooltip>{" "}
                is simply the distance from the center to the edge. These two
                facts are the building blocks for what follows.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ── Main Content: Introduction ───────────────────────────────────────────
    <StackLayout key="layout-rings-intro" maxWidth="xl">
        <Block id="rings-intro" padding="sm">
            <EditableParagraph id="para-rings-intro" blockId="rings-intro">
                We usually think of a circle as one solid shape. But what if we
                imagined it differently — as many thin rings nested inside each
                other, like the rings in a tree trunk?
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ── Visualization ────────────────────────────────────────────────────────
    <StackLayout key="layout-rings-visualization" maxWidth="xl">
        <Block id="rings-visualization" padding="sm" hasVisualization>
            <BuildingCircleFigure />
        </Block>
    </StackLayout>,

    // ── Main Content: Guided Exploration ─────────────────────────────────────
    <StackLayout key="layout-rings-exploration" maxWidth="xl">
        <Block id="rings-exploration" padding="sm">
            <EditableParagraph id="para-rings-exploration" blockId="rings-exploration">
                Drag the radius outward from the center. As you pull, watch rings
                appear one by one. Each ring sits at a specific distance from the
                center, and together they fill the entire circle.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ── Main Content: Key Insight ────────────────────────────────────────────
    <StackLayout key="layout-rings-insight" maxWidth="xl">
        <Block id="rings-insight" padding="sm">
            <EditableParagraph id="para-rings-insight" blockId="rings-insight">
                This decomposition is the key to understanding where{" "}
                <InlineFormula latex="\pi r^2" colorMap={{}} /> comes from.
                Instead of thinking about the circle's area all at once, we can
                think about it ring by ring.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    // ── Assessment Question ──────────────────────────────────────────────────
    <StackLayout key="layout-rings-question" maxWidth="xl">
        <Block id="rings-question" padding="md">
            <EditableParagraph id="para-rings-question" blockId="rings-question">
                When you drag the radius all the way out, the circle is filled
                with{" "}
                <InlineFeedback
                    varName="rings_answer_fills"
                    correctValue="concentric rings"
                    position="terminal"
                    successMessage="— exactly! The circle is made of many thin rings stacked from the center outward"
                    failureMessage="— not quite."
                    hint="Think about what appeared as you dragged the arrow outward"
                >
                    <InlineClozeChoice
                        varName="rings_answer_fills"
                        correctAnswer="concentric rings"
                        options={["solid color", "concentric rings", "pie slices", "grid squares"]}
                        {...choicePropsFromDefinition(getVariableInfo("rings_answer_fills"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
