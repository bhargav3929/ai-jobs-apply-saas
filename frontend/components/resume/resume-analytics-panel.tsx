"use client";

import ResumeRadarChart from "./resume-radar-chart";
import ScoreGauge from "./resume-score-gauge";
import type { ResumeAnalysis } from "@/types/firestore";

interface AnalyticsPanelProps {
    analysis: ResumeAnalysis;
}

/**
 * Compact insights sidebar — only strength bars + industry comparison + ATS gauge.
 * Keywords and Skills Gap are rendered separately below the two-column layout.
 */
export default function ResumeAnalyticsPanel({ analysis }: AnalyticsPanelProps) {
    const yourScore = analysis.overallScore;
    const avgScore = analysis.industryBenchmark.averageScore;
    const lead = yourScore - avgScore;
    const percentileRank = 100 - analysis.industryBenchmark.percentile;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="px-1">
                <h2 className="text-[18px] font-semibold text-[var(--color-brand-dark)] tracking-tight">
                    Insights
                </h2>
            </div>

            {/* Strength bars */}
            <div className="bg-white rounded-xl border border-[var(--color-border-subtle)]">
                <ResumeRadarChart analysis={analysis} />
            </div>

            {/* Industry comparison + ATS — compact row */}
            <div className="bg-white rounded-xl border border-[var(--color-border-subtle)] p-4 lg:p-5">
                <div className="flex items-start justify-between gap-4">
                    {/* Industry comparison */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                            vs Industry
                        </p>
                        <p className="text-[14px] text-[var(--color-brand-dark)]">
                            <span className="font-bold">{yourScore}</span>
                            <span className="text-[var(--color-text-tertiary)]"> vs </span>
                            <span className="font-medium text-[var(--color-text-secondary)]">{avgScore} avg</span>
                            <span
                                className="ml-1.5 font-bold text-[13px]"
                                style={{ color: lead >= 0 ? "#3ECF8E" : "#ED5F74" }}
                            >
                                ({lead >= 0 ? "+" : ""}{lead})
                            </span>
                        </p>
                        <p
                            className="text-[13px] font-semibold mt-1"
                            style={{ color: "var(--color-brand-primary)" }}
                        >
                            Top {percentileRank}% in {analysis.industryBenchmark.category}
                        </p>
                    </div>

                    {/* ATS mini gauge */}
                    <div className="flex flex-col items-center flex-shrink-0">
                        <ScoreGauge score={analysis.atsScore} size={64} strokeWidth={5} delay={400} />
                        <p className="text-[11px] font-semibold text-[var(--color-brand-dark)] mt-1.5">ATS</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">
                            {analysis.atsIssues.length === 0 ? "All clear" : `${analysis.atsIssues.length} issue${analysis.atsIssues.length > 1 ? "s" : ""}`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
