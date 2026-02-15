"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { ResumeAnalysis } from "@/types/firestore";

interface ScoreCardsProps {
    analysis: ResumeAnalysis;
    onScrollToSection?: (section: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Animated number counter (ease-out cubic, ~1.4s)                   */
/* ------------------------------------------------------------------ */
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (value === 0) {
            setDisplay(0);
            return;
        }
        const duration = 1400;
        const start = performance.now();
        let raf: number;
        const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(eased * value));
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [value]);

    return (
        <>
            {display}
            {suffix}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Score color helper                                                */
/* ------------------------------------------------------------------ */
function scoreColor(v: number): string {
    if (v >= 75) return "var(--color-success)";
    if (v >= 50) return "var(--color-warning)";
    return "var(--color-error)";
}

/* ------------------------------------------------------------------ */
/*  Small animated circular gauge (72px) for metric cards             */
/* ------------------------------------------------------------------ */
function MiniGauge({
    score,
    size = 72,
    strokeWidth = 6,
}: {
    score: number;
    size?: number;
    strokeWidth?: number;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const color = scoreColor(score);

    const [offset, setOffset] = useState(circumference);
    const [displayValue, setDisplayValue] = useState(0);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (score === 0) {
            setOffset(circumference);
            setDisplayValue(0);
            return;
        }

        const targetOffset = circumference - (score / 100) * circumference;
        const startOffset = circumference;
        const duration = 1400;
        const start = performance.now();

        const animate = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            setOffset(startOffset + (targetOffset - startOffset) * eased);
            setDisplayValue(Math.round(eased * score));
            if (t < 1) rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [score, circumference]);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg
                width={size}
                height={size}
                viewBox={`0 0 ${size} ${size}`}
                className="block"
                style={{ transform: "rotate(-90deg)" }}
            >
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-border-subtle)"
                    strokeWidth={strokeWidth}
                    opacity={0.4}
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            <span
                className="absolute font-bold tabular-nums leading-none"
                style={{ fontSize: "18px", color }}
            >
                {displayValue}
            </span>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Animated horizontal progress bar for keywords card                */
/* ------------------------------------------------------------------ */
function ThinProgressBar({ value }: { value: number }) {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const id = requestAnimationFrame(() => setWidth(value));
        return () => cancelAnimationFrame(id);
    }, [value]);

    const barColor = scoreColor(value);

    return (
        <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--color-border-subtle)", opacity: 0.5 }}
        >
            <div
                className="h-full rounded-full"
                style={{
                    width: `${width}%`,
                    background: barColor,
                    transition: "width 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Shared card wrapper styles                                        */
/* ------------------------------------------------------------------ */
const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: "12px",
    border: "1px solid var(--color-border-subtle)",
    boxShadow: "0px 2px 5px rgba(50, 50, 93, 0.06), 0px 1px 1px rgba(0, 0, 0, 0.03)",
    minHeight: "140px",
};

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export default function ResumeScoreCards({ analysis, onScrollToSection }: ScoreCardsProps) {
    const {
        overallScore,
        atsScore,
        keywordsFound,
        keywordsMissing,
        industryBenchmark,
        criticalImprovements,
        atsIssues,
        sections,
    } = analysis;

    const keywordsTotal = keywordsFound.length + keywordsMissing.length;
    const keywordPercent = keywordsTotal > 0 ? Math.round((keywordsFound.length / keywordsTotal) * 100) : 0;
    const percentile = industryBenchmark.percentile;
    const topPercent = 100 - percentile;

    // Find the weakest section to scroll to on "Fix these"
    const handleFixClick = useCallback(() => {
        if (onScrollToSection) {
            const weakest = Object.entries(sections).sort((a, b) => a[1].score - b[1].score)[0];
            if (weakest) {
                onScrollToSection(weakest[0]);
                return;
            }
        }
        const target = document.getElementById("resume-sections");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, [onScrollToSection, sections]);

    const hasCritical = criticalImprovements.length > 0;
    const hasAtsIssues = atsIssues.length > 0;

    return (
        <div className="space-y-4">
            {/* ============================================================ */}
            {/*  METRIC CARDS GRID                                           */}
            {/* ============================================================ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Card 1: Overall Score */}
                <div
                    className="flex flex-col items-center justify-center px-3 py-4"
                    style={cardStyle}
                >
                    <MiniGauge score={overallScore} />
                    <span
                        className="mt-2 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--color-text-tertiary)" }}
                    >
                        Overall
                    </span>
                </div>

                {/* Card 2: ATS Score */}
                <div
                    className="flex flex-col items-center justify-center px-3 py-4"
                    style={cardStyle}
                >
                    <MiniGauge score={atsScore} />
                    <span
                        className="mt-2 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--color-text-tertiary)" }}
                    >
                        ATS Ready
                    </span>
                </div>

                {/* Card 3: Keywords */}
                <div
                    className="flex flex-col items-center justify-center px-3 py-4"
                    style={cardStyle}
                >
                    <div className="flex items-baseline gap-0.5">
                        <span
                            className="font-bold tabular-nums leading-none"
                            style={{ fontSize: "28px", color: scoreColor(keywordPercent) }}
                        >
                            <AnimatedNumber value={keywordsFound.length} />
                        </span>
                        <span
                            className="text-sm font-medium"
                            style={{ color: "var(--color-text-tertiary)" }}
                        >
                            /{keywordsTotal}
                        </span>
                    </div>
                    <div className="w-full mt-3 px-2">
                        <ThinProgressBar value={keywordPercent} />
                    </div>
                    <span
                        className="mt-2 text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "var(--color-text-tertiary)" }}
                    >
                        Keywords Found
                    </span>
                </div>

                {/* Card 4: Industry Rank */}
                <div
                    className="flex flex-col items-center justify-center px-3 py-4"
                    style={cardStyle}
                >
                    <span
                        className="font-bold tabular-nums leading-none"
                        style={{ fontSize: "28px", color: "var(--color-brand-primary)" }}
                    >
                        Top <AnimatedNumber value={topPercent} suffix="%" />
                    </span>
                    <span
                        className="mt-2 text-xs font-semibold uppercase tracking-widest text-center"
                        style={{ color: "var(--color-text-tertiary)" }}
                    >
                        in {industryBenchmark.category}
                    </span>
                </div>
            </div>

            {/* ============================================================ */}
            {/*  ACTION ITEMS — unified critical + ATS issues card           */}
            {/* ============================================================ */}
            {(hasCritical || hasAtsIssues) && (() => {
                const allIssues: { type: "critical" | "ats"; text: string }[] = [
                    ...criticalImprovements.map((t) => ({ type: "critical" as const, text: t })),
                    ...atsIssues.map((t) => ({ type: "ats" as const, text: t })),
                ];

                return (
                    <div style={cardStyle} className="px-5 py-5 md:px-6">
                        {/* Header */}
                        <div className="flex items-center gap-2.5 mb-4">
                            <span
                                className="text-sm font-semibold"
                                style={{ color: "var(--color-brand-dark)" }}
                            >
                                Action Items
                            </span>
                            <span
                                className="inline-flex items-center justify-center text-[11px] font-bold leading-none rounded-full"
                                style={{
                                    width: 22,
                                    height: 22,
                                    color: "#635BFF",
                                    background: "rgba(99, 91, 255, 0.08)",
                                }}
                            >
                                {allIssues.length}
                            </span>
                        </div>

                        {/* Issue rows */}
                        <div className="flex flex-col">
                            {allIssues.map((issue, i) => {
                                const isRed = issue.type === "critical";
                                const dotColor = isRed ? "#ED5F74" : "#F5A623";
                                const chipBg = isRed
                                    ? "rgba(237, 95, 116, 0.08)"
                                    : "rgba(245, 166, 35, 0.08)";
                                const chipText = isRed ? "#ED5F74" : "#F5A623";
                                const chipLabel = isRed ? "Critical" : "ATS";

                                return (
                                    <div key={i}>
                                        {i > 0 && (
                                            <div
                                                className="mx-0"
                                                style={{
                                                    height: 1,
                                                    background: "var(--color-border-subtle)",
                                                }}
                                            />
                                        )}
                                        <div className="flex items-start gap-3 py-3">
                                            {/* Colored dot */}
                                            <span
                                                className="mt-[6px] flex-shrink-0 rounded-full"
                                                style={{
                                                    width: 7,
                                                    height: 7,
                                                    background: dotColor,
                                                }}
                                            />

                                            {/* Category chip */}
                                            <span
                                                className="flex-shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold leading-snug"
                                                style={{
                                                    background: chipBg,
                                                    color: chipText,
                                                }}
                                            >
                                                {chipLabel}
                                            </span>

                                            {/* Issue text — 2 line clamp */}
                                            <span
                                                className="text-[13px] leading-snug"
                                                style={{
                                                    color: "var(--color-text-secondary)",
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {issue.text}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Fix button */}
                        <div className="mt-3 flex justify-end">
                            <Button
                                onClick={handleFixClick}
                                className="text-[13px] font-semibold h-8 px-4 rounded-lg"
                                style={{
                                    background: "#635BFF",
                                    color: "white",
                                    border: "none",
                                }}
                            >
                                Fix these &rarr;
                            </Button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
