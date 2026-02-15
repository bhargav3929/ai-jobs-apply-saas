"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, RefreshCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResumeAnalysisResponse } from "@/types/firestore";

interface ResumeHeroProps {
    data: ResumeAnalysisResponse;
    onUpload: () => void;
    onReanalyze: () => void;
    onViewResume: () => void;
    analyzing: boolean;
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Animated counter: counts from 0 to `target` over ~1.6s with cubic ease-out.
 */
function useAnimatedScore(target: number, duration = 1600): number {
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (target === 0) {
            setDisplay(0);
            return;
        }
        const start = performance.now();
        let raf: number;
        const step = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // Cubic ease-out
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(eased * target));
            if (t < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, duration]);

    return display;
}

function getScoreColor(score: number): string {
    if (score >= 80) return "var(--color-success)";
    if (score >= 60) return "var(--color-warning)";
    return "var(--color-error)";
}

function buildNarrative(
    score: number,
    percentile: number,
    category: string,
    criticalCount: number,
): string {
    if (score < 75) {
        const passedBy = 100 - percentile;
        return `Your resume would be passed over by ${passedBy}% of hiring managers in ${category}.`;
    }
    const suffix =
        criticalCount > 0
            ? ` ${criticalCount} issue${criticalCount !== 1 ? "s" : ""} remain${criticalCount === 1 ? "s" : ""}.`
            : "";
    return `Your resume outperforms ${percentile}% of ${category} candidates.${suffix}`;
}

/* ------------------------------------------------------------------ */
/*  Animated SVG Ring Gauge (~160px diameter)                          */
/* ------------------------------------------------------------------ */
function ScoreRingGauge({
    score,
    animatedScore,
    color,
}: {
    score: number;
    animatedScore: number;
    color: string;
}) {
    const svgSize = 160;
    const strokeWidth = 10;
    const radius = (svgSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const [offset, setOffset] = useState(circumference);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        if (score === 0) {
            setOffset(circumference);
            return;
        }

        const targetOffset = circumference - (score / 100) * circumference;
        const startOffset = circumference;
        const duration = 1600;
        const start = performance.now();

        const animate = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // Cubic ease-out
            const eased = 1 - Math.pow(1 - t, 3);
            setOffset(startOffset + (targetOffset - startOffset) * eased);
            if (t < 1) rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(rafRef.current);
    }, [score, circumference]);

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: svgSize, height: svgSize }}>
            <svg
                width={svgSize}
                height={svgSize}
                viewBox={`0 0 ${svgSize} ${svgSize}`}
                className="block"
                style={{ transform: "rotate(-90deg)" }}
            >
                {/* Background track */}
                <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--color-border-subtle)"
                    strokeWidth={strokeWidth}
                    opacity={0.4}
                />
                {/* Animated foreground arc */}
                <circle
                    cx={svgSize / 2}
                    cy={svgSize / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                />
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className="font-extrabold tabular-nums leading-none select-none"
                    style={{ fontSize: "42px", letterSpacing: "-0.03em", color }}
                >
                    {animatedScore}
                </span>
                <span
                    className="text-xs font-medium mt-1"
                    style={{ color: "var(--color-text-tertiary)" }}
                >
                    /100
                </span>
            </div>
        </div>
    );
}

export default function ResumeHero({
    data,
    onUpload,
    onReanalyze,
    onViewResume,
    analyzing,
}: ResumeHeroProps) {
    const { analysis, metadata, jobCategory } = data;
    const { overallScore, industryBenchmark, criticalImprovements } = analysis;

    const uploadDate = metadata?.uploadedAt
        ? new Date(metadata.uploadedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : null;

    const animatedScore = useAnimatedScore(overallScore);
    const scoreColor = getScoreColor(overallScore);

    const narrative = buildNarrative(
        overallScore,
        industryBenchmark.percentile,
        jobCategory || industryBenchmark.category || "your field",
        criticalImprovements.length,
    );

    // Build metadata caption pieces
    const metaParts: string[] = [];
    if (metadata?.filename) metaParts.push(metadata.filename);
    if (metadata?.size) metaParts.push(formatFileSize(metadata.size));
    if (uploadDate) metaParts.push(uploadDate);

    return (
        <section className="w-full py-6 md:py-8">
            {/* ---- Ring Gauge ---- */}
            <div className="flex justify-center">
                <ScoreRingGauge
                    score={overallScore}
                    animatedScore={animatedScore}
                    color={scoreColor}
                />
            </div>

            {/* ---- Narrative line ---- */}
            <p
                className="mt-5 mx-auto max-w-xl text-center text-base md:text-lg font-medium leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
            >
                {narrative}
            </p>

            {/* ---- Metadata caption ---- */}
            {metaParts.length > 0 && (
                <p
                    className="mt-4 text-center text-xs tracking-wide"
                    style={{ color: "var(--color-text-tertiary)" }}
                >
                    {metaParts.join("  \u00B7  ")}
                </p>
            )}

            {/* ---- Actions: 3 buttons ---- */}
            <div className="mt-5 flex items-center justify-center gap-3">
                <Button
                    onClick={onUpload}
                    variant="outline"
                    className="rounded-lg h-9 px-4 text-[13px] font-medium"
                >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Upload New
                </Button>
                <Button
                    onClick={onReanalyze}
                    disabled={analyzing}
                    className="rounded-lg h-9 px-4 text-[13px] font-medium text-white"
                    style={{
                        backgroundColor: analyzing
                            ? "var(--color-brand-primary)"
                            : "var(--color-brand-primary)",
                        opacity: analyzing ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) => {
                        if (!analyzing) {
                            e.currentTarget.style.backgroundColor = "var(--color-brand-hover)";
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-brand-primary)";
                    }}
                >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${analyzing ? "animate-spin" : ""}`} />
                    {analyzing ? "Analyzing\u2026" : "Re-analyze"}
                </Button>
                <Button
                    onClick={onViewResume}
                    variant="outline"
                    className="rounded-lg h-9 px-4 text-[13px] font-medium"
                >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    View Resume
                </Button>
            </div>
        </section>
    );
}
