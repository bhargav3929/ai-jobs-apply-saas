"use client";

import { useEffect, useState, useId } from "react";

interface ScoreGaugeProps {
    score: number;
    size: number;
    strokeWidth?: number;
    label?: string;
    animate?: boolean;
    delay?: number;
    /** @deprecated kept for backward compat -- ignored */
    showGlow?: boolean;
    /** @deprecated kept for backward compat -- ignored */
    showTicks?: boolean;
}

function getScoreColor(score: number): string {
    if (score <= 40) return "var(--color-error)";
    if (score <= 70) return "var(--color-warning)";
    return "var(--color-success)";
}

export default function ScoreGauge({
    score,
    size,
    strokeWidth = 6,
    label,
    animate: shouldAnimate = true,
    delay = 0,
}: ScoreGaugeProps) {
    const uniqueId = useId();
    const padding = 2;
    const radius = (size - strokeWidth - padding * 2) / 2;
    const circumference = 2 * Math.PI * radius;
    const center = size / 2;

    const [progress, setProgress] = useState(0);
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        if (!shouldAnimate) {
            setProgress(score / 100);
            setDisplayScore(score);
            return;
        }

        const timeout = setTimeout(() => {
            const duration = 1400;
            const start = performance.now();
            let raf: number;
            const step = (now: number) => {
                const t = Math.min((now - start) / duration, 1);
                const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
                setProgress(eased * (score / 100));
                setDisplayScore(Math.round(eased * score));
                if (t < 1) raf = requestAnimationFrame(step);
            };
            raf = requestAnimationFrame(step);
            return () => cancelAnimationFrame(raf);
        }, delay);

        return () => clearTimeout(timeout);
    }, [score, shouldAnimate, delay]);

    const color = getScoreColor(score);
    const dashOffset = circumference * (1 - progress);

    const fontSize =
        size >= 100 ? "text-2xl" : size >= 60 ? "text-base" : "text-xs";
    const labelSize =
        size >= 100 ? "text-[10px]" : "text-[8px]";

    return (
        <div
            className="relative inline-flex items-center justify-center"
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} className="-rotate-90">
                {/* Track */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="var(--color-border-subtle)"
                    strokeWidth={strokeWidth}
                    opacity={0.25}
                />
                {/* Arc */}
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    style={{ transition: shouldAnimate ? undefined : "stroke-dashoffset 0.4s ease" }}
                />
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className={`${fontSize} font-bold leading-none tabular-nums`}
                    style={{ color }}
                >
                    {displayScore}
                </span>
                {label && (
                    <span
                        className={`${labelSize} font-medium mt-0.5`}
                        style={{ color: "var(--color-text-tertiary)" }}
                    >
                        {label}
                    </span>
                )}
            </div>
        </div>
    );
}
