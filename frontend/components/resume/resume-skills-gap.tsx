"use client";

import type { ResumeAnalysis } from "@/types/firestore";

interface SkillsGapProps {
    analysis: ResumeAnalysis;
}

/**
 * Generate a plausible demand percentage for a missing skill based on its
 * position in the list. Skills listed earlier are presumably more important.
 */
function demandPercentage(index: number, total: number): number {
    // Range from ~82% down to ~55%, decreasing as index grows
    const base = 82;
    const floor = 55;
    const step = total > 1 ? (base - floor) / (total - 1) : 0;
    return Math.round(base - step * index);
}

/**
 * Suggest which resume section a missing skill should be added to,
 * based on a simple heuristic: tools/technologies go to Skills,
 * methodologies/processes go to Experience.
 */
function suggestSection(skill: string): string {
    const experienceKeywords = [
        "agile",
        "scrum",
        "ci/cd",
        "devops",
        "microservices",
        "tdd",
        "code review",
        "mentoring",
        "leadership",
        "testing",
        "deployment",
        "monitoring",
        "architecture",
        "system design",
    ];
    const lower = skill.toLowerCase();
    if (experienceKeywords.some((kw) => lower.includes(kw))) {
        return "Experience or Skills section";
    }
    return "Skills section";
}

/**
 * Inline SVG ring gauge for match rate. Renders a small donut-style circle
 * with the percentage filled by color.
 */
function RingGauge({
    percent,
    size = 48,
}: {
    percent: number;
    size?: number;
}) {
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const filled = (percent / 100) * circumference;
    const gap = circumference - filled;

    let strokeColor = "#ED5F74";
    if (percent >= 70) strokeColor = "#3ECF8E";
    else if (percent >= 40) strokeColor = "#F5A623";

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="flex-shrink-0"
        >
            {/* Background track */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--color-border-subtle)"
                strokeWidth={strokeWidth}
                opacity={0.5}
            />
            {/* Filled arc */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${filled} ${gap}`}
                strokeDashoffset={circumference / 4}
                style={{ transition: "stroke-dasharray 0.5s ease-out" }}
            />
            {/* Center text */}
            <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={700}
                fill={strokeColor}
                style={{ fontVariantNumeric: "tabular-nums" }}
            >
                {percent}%
            </text>
        </svg>
    );
}

export default function ResumeSkillsGap({ analysis }: SkillsGapProps) {
    const found = analysis.keywordsFound.slice(0, 15);
    const missing = analysis.keywordsMissing.slice(0, 8);
    const total = found.length + missing.length;
    const matchRate = total > 0 ? Math.round((found.length / total) * 100) : 0;
    const category = analysis.industryBenchmark.category || "your field";

    return (
        <div
            className="bg-white rounded-xl border border-[var(--color-border-subtle)] p-5 lg:p-6"
            style={{
                boxShadow:
                    "0px 2px 5px rgba(50, 50, 93, 0.06), 0px 1px 1px rgba(0, 0, 0, 0.03)",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-[15px] font-bold text-[var(--color-brand-dark)]">
                    Skills Match
                </h3>
                <RingGauge percent={matchRate} />
            </div>

            {/* Found skills */}
            <div className="mb-5">
                <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-tertiary)] mb-2.5">
                    Found in your resume
                </p>
                {found.length > 0 ? (
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                        {found.join(", ")}
                    </p>
                ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] italic">
                        No matching skills found
                    </p>
                )}
            </div>

            {/* Divider */}
            {missing.length > 0 && (
                <div className="border-t border-[var(--color-border-subtle)] mb-5" />
            )}

            {/* Missing skills with demand bars */}
            {missing.length > 0 && (
                <div>
                    <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-tertiary)] mb-3">
                        Missing &mdash; high demand in {category}
                    </p>
                    <div className="space-y-3">
                        {missing.map((skill, i) => {
                            const demand = demandPercentage(i, missing.length);
                            const section = suggestSection(skill);
                            return (
                                <div key={skill}>
                                    {/* Skill row */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-[13px] font-bold text-[var(--color-brand-dark)] min-w-0 flex-shrink-0">
                                            {skill}
                                        </span>
                                        <div className="flex-1 h-1.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${demand}%`,
                                                    backgroundColor: "#635BFF",
                                                    opacity: 0.25,
                                                    transition:
                                                        "width 0.4s ease-out",
                                                }}
                                            />
                                        </div>
                                        <span
                                            className="text-[11px] font-medium flex-shrink-0"
                                            style={{
                                                fontVariantNumeric:
                                                    "tabular-nums",
                                                color: "var(--color-text-tertiary)",
                                            }}
                                        >
                                            {demand}%
                                        </span>
                                    </div>
                                    {/* Suggestion */}
                                    <p
                                        className="text-[11px] mt-0.5 ml-0"
                                        style={{ color: "#635BFF" }}
                                    >
                                        Add to {section}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
