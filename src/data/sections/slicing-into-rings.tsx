/**
 * Slicing Into Rings — Section 1 of Circle Area Derivation
 * =========================================================
 *
 * Learning objective: Understand that a circle can be decomposed into many thin
 * concentric rings stacked from center outward.
 *
 * Proposition: A circle can be divided into thin concentric rings at every
 * distance from center to edge.
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
import { MAX_RADIUS, RING_THICKNESS, ringCount, getRingRadii } from "../model";

// ── View constants ───────────────────────────────────────────────────────────

const VIEW_WIDTH = 480;
const VIEW_HEIGHT = 400;
const CENTER: Vec2 = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 + 20 };
const PIXELS_PER_UNIT = 80;

const INK = "#334155";
const INK_STRUCTURE = "#64748B";
const INK_QUIET = "#CBD5E1";
const ACCENT = "#62D0AD";
const ACCENT_RING_FILL = "rgba(98, 208, 173, 0.25)";

// ── Bespoke Drawing Component ────────────────────────────────────────────────

function ConcentricRingsDrawing() {
    const setVar = useSetVar();
    const currentRadius = useVar<number>("rings_currentRadius", 0.2);

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    // Compute derived values from the model
    const numRings = ringCount(currentRadius, RING_THICKNESS);
    const ringRadii = getRingRadii(currentRadius, RING_THICKNESS);

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

    // Direct 1:1 tracking during drag — constrained to radial direction
    const handlePointerMove = (event: React.PointerEvent<SVGCircleElement>) => {
        if (!dragging) return;
        const point = svgPointFromEvent(event);
        const dx = point.x - CENTER.x;
        const dy = point.y - CENTER.y;
        const distance = Math.sqrt(dx * dx + dy * dy) / PIXELS_PER_UNIT;
        setVar("rings_currentRadius", clamp(distance, 0, MAX_RADIUS));
    };

    // Calculate handle position (to the right of center along the radius line)
    const handleX = CENTER.x + currentRadius * PIXELS_PER_UNIT;
    const handleY = CENTER.y;

    // Find which ring to label with dr (the outermost complete ring)
    const labelRingIndex = numRings > 0 ? numRings - 1 : -1;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="Circle decomposed into concentric rings"
        >
            <defs>
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

            {/* Readout panel — positioned above the circle */}
            <g
                fontSize="13"
                style={{ fontVariantNumeric: "tabular-nums" }}
                data-concept="rings_ringCount"
            >
                <text x={CENTER.x} y="36" fill={INK} textAnchor="middle">
                    <tspan fill={ACCENT} fontWeight="600">
                        {numRings}
                    </tspan>
                    <tspan> ring{numRings !== 1 ? "s" : ""} shown</tspan>
                </text>
            </g>

            {/* Full circle boundary — static, ink-quiet outline */}
            <circle
                cx={CENTER.x}
                cy={CENTER.y}
                r={MAX_RADIUS * PIXELS_PER_UNIT}
                fill="none"
                stroke={INK_QUIET}
                strokeWidth="1.5"
                strokeDasharray="4 4"
            />

            {/* Accumulated rings — filled from center outward */}
            {ringRadii.map((r, i) => {
                const outerR = r * PIXELS_PER_UNIT;
                const innerR = (r - RING_THICKNESS) * PIXELS_PER_UNIT;
                return (
                    <g key={i}>
                        {/* Ring fill */}
                        <circle
                            cx={CENTER.x}
                            cy={CENTER.y}
                            r={outerR}
                            fill={ACCENT_RING_FILL}
                            stroke="none"
                        />
                        {/* Ring boundary (structure stroke) */}
                        <circle
                            cx={CENTER.x}
                            cy={CENTER.y}
                            r={outerR}
                            fill="none"
                            stroke={ACCENT}
                            strokeWidth="1.5"
                            strokeOpacity="0.6"
                        />
                        {/* Inner boundary to show ring structure */}
                        {innerR > 0 && (
                            <circle
                                cx={CENTER.x}
                                cy={CENTER.y}
                                r={innerR}
                                fill="white"
                                stroke="none"
                            />
                        )}
                    </g>
                );
            })}

            {/* Re-draw ring outlines on top for clarity */}
            {ringRadii.map((r, i) => (
                <circle
                    key={`outline-${i}`}
                    cx={CENTER.x}
                    cy={CENTER.y}
                    r={r * PIXELS_PER_UNIT}
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth={i === labelRingIndex ? "2.5" : "1.5"}
                    strokeOpacity={i === labelRingIndex ? "1" : "0.5"}
                />
            ))}

            {/* dr label on the outermost ring */}
            {labelRingIndex >= 0 && numRings > 1 && (
                <g>
                    {/* dr bracket on the right side of the labeled ring */}
                    <line
                        x1={CENTER.x + (ringRadii[labelRingIndex] - RING_THICKNESS) * PIXELS_PER_UNIT + 4}
                        y1={CENTER.y}
                        x2={CENTER.x + ringRadii[labelRingIndex] * PIXELS_PER_UNIT - 4}
                        y2={CENTER.y}
                        stroke={INK}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <text
                        x={CENTER.x + (ringRadii[labelRingIndex] - RING_THICKNESS / 2) * PIXELS_PER_UNIT}
                        y={CENTER.y - 8}
                        fill={INK}
                        fontSize="11"
                        fontStyle="italic"
                        textAnchor="middle"
                    >
                        dr
                    </text>
                </g>
            )}

            {/* Radius line from center to handle — accent, heaviest stroke */}
            <line
                x1={CENTER.x}
                y1={CENTER.y}
                x2={handleX}
                y2={handleY}
                stroke={ACCENT}
                strokeWidth="3"
                strokeLinecap="round"
                data-concept="rings_currentRadius"
            />

            {/* Center point — small dot */}
            <circle cx={CENTER.x} cy={CENTER.y} r="4" fill={INK_STRUCTURE} />

            {/* Draggable handle — accent, with affordances */}
            <g
                data-manipulated-variable="rings_currentRadius"
                transform={`translate(${handleX} ${handleY}) scale(${handleScale})`}
            >
                <circle r="14" fill={ACCENT} filter="url(#rings-handle-shadow)" />
            </g>

            {/* Oversized hit area for the handle */}
            <circle
                cx={handleX}
                cy={handleY}
                r="28"
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

            {/* Current radius label */}
            <text
                x={handleX}
                y={handleY - 24}
                fill={ACCENT}
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                r = {currentRadius.toFixed(1)}
            </text>

            {/* R label at the edge */}
            <text
                x={CENTER.x + MAX_RADIUS * PIXELS_PER_UNIT + 12}
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

function ConcentricRingsFigure() {
    const setVar = useSetVar();

    return (
        <Figure
            id="slicing-rings-figure"
            onReset={() => {
                setVar("rings_currentRadius", 0.2);
            }}
            caption="Drag the teal handle outward from the center. Watch rings appear one by one, filling the circle from inside out."
        >
            <ConcentricRingsDrawing />
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
                        label: "Drag the handle outward from the center",
                        position: { x: "54%", y: "55%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -20, y: 0 },
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
            <ConcentricRingsFigure />
        </Block>
    </StackLayout>,

    // ── Main Content: Guided Exploration ─────────────────────────────────────
    <StackLayout key="layout-rings-exploration" maxWidth="xl">
        <Block id="rings-exploration" padding="sm">
            <EditableParagraph id="para-rings-exploration" blockId="rings-exploration">
                Drag the radius outward from the center. As you pull, watch rings
                appear one by one. Each ring sits at a specific distance from the
                center, and together they fill the entire circle. The outermost
                ring you see is always at the current radius of{" "}
                <InlineScrubbleNumber
                    varName="rings_currentRadius"
                    {...numberPropsFromDefinition(getVariableInfo("rings_currentRadius"))}
                    formatValue={(v) => v.toFixed(1)}
                />.
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
                    hint="Think about what appeared as you dragged the handle outward"
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
