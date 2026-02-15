"use client";

import { useMemo } from "react";
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    Radar,
    ResponsiveContainer,
} from "recharts";
import type { ResumeAnalysis } from "@/types/firestore";

interface RadarChartProps {
    analysis: ResumeAnalysis;
}

// Custom tick renderer that wraps long text onto two lines.
// Recharts injects props (payload, x, y, textAnchor, etc.) at runtime via cloneElement.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTick(props: any) {
    const { payload, x, y, textAnchor } = props as {
        payload: { value: string };
        x: number;
        y: number;
        textAnchor: "start" | "middle" | "end" | "inherit";
    };
    const text = payload.value as string;
    const maxCharsPerLine = 14;

    if (text.length <= maxCharsPerLine) {
        return (
            <text
                x={x}
                y={y}
                textAnchor={textAnchor}
                fontSize={10}
                fill="var(--color-text-secondary)"
            >
                {text}
            </text>
        );
    }

    // Split at nearest space to the middle
    const mid = Math.floor(text.length / 2);
    let splitIndex = text.lastIndexOf(" ", mid);
    if (splitIndex === -1) splitIndex = text.indexOf(" ", mid);
    if (splitIndex === -1) splitIndex = maxCharsPerLine;

    const line1 = text.substring(0, splitIndex).trim();
    const line2 = text.substring(splitIndex).trim();

    return (
        <text
            x={x}
            y={y}
            textAnchor={textAnchor}
            fontSize={10}
            fill="var(--color-text-secondary)"
        >
            <tspan x={x} dy="-0.5em">
                {line1}
            </tspan>
            <tspan x={x} dy="1.2em">
                {line2}
            </tspan>
        </text>
    );
}

export default function ResumeRadarChart({ analysis }: RadarChartProps) {
    const data = useMemo(() => {
        return Object.entries(analysis.sections).map(([key, section]) => ({
            subject:
                section.displayName ||
                key
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase()),
            score: section.score ?? 0,
            fullMark: 100,
        }));
    }, [analysis.sections]);

    return (
        <div className="p-4 lg:p-5">
            <h3 className="text-[13px] font-semibold text-[var(--color-brand-dark)] mb-1">
                Section Strengths
            </h3>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mb-4">
                Performance across resume sections
            </p>

            <div className="w-full" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="62%"
                        data={data}
                    >
                        <PolarGrid stroke="var(--color-border-subtle)" />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={<CustomTick />}
                        />
                        <Radar
                            name="Score"
                            dataKey="score"
                            stroke="#635BFF"
                            fill="#635BFF"
                            fillOpacity={0.15}
                            strokeWidth={2}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
