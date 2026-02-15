"use client";

import { useState } from "react";
import { Check, X, Plus, Loader2 } from "lucide-react";
import type { ResumeAnalysis } from "@/types/firestore";

interface KeywordChartProps {
    analysis: ResumeAnalysis;
    onAddKeyword?: (keyword: string) => Promise<void>;
    addingKeyword?: string | null;
}

export default function ResumeKeywordChart({
    analysis,
    onAddKeyword,
    addingKeyword,
}: KeywordChartProps) {
    const [showAll, setShowAll] = useState(false);

    const found = analysis.keywordsFound;
    const missing = analysis.keywordsMissing;
    const total = found.length + missing.length;
    const foundPercent = total > 0 ? (found.length / total) * 100 : 0;

    // Only show "Show all" if genuinely many keywords
    const COLLAPSE_THRESHOLD = 15;
    const shouldCollapse = total > COLLAPSE_THRESHOLD;
    const displayFound = showAll || !shouldCollapse ? found : found.slice(0, 10);
    const displayMissing =
        showAll || !shouldCollapse ? missing : missing.slice(0, 5);

    if (total === 0) {
        return (
            <div
                className="bg-white rounded-xl border border-[var(--color-border-subtle)] p-5 lg:p-6"
                style={{
                    boxShadow:
                        "0px 2px 5px rgba(50, 50, 93, 0.06), 0px 1px 1px rgba(0, 0, 0, 0.03)",
                }}
            >
                <h3 className="text-[15px] font-bold text-[var(--color-brand-dark)]">
                    Keywords
                </h3>
                <p className="text-sm text-[var(--color-text-tertiary)] mt-3">
                    No keyword data available
                </p>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-xl border border-[var(--color-border-subtle)] p-5 lg:p-6"
            style={{
                boxShadow:
                    "0px 2px 5px rgba(50, 50, 93, 0.06), 0px 1px 1px rgba(0, 0, 0, 0.03)",
            }}
        >
            {/* Header */}
            <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-[15px] font-bold text-[var(--color-brand-dark)]">
                    Keywords
                </h3>
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {found.length}/{total}
                </span>
            </div>

            {/* Summary bar */}
            <div className="w-full h-1.5 rounded-full overflow-hidden flex mb-5">
                <div
                    className="h-full rounded-l-full"
                    style={{
                        width: `${foundPercent}%`,
                        backgroundColor: "#3ECF8E",
                    }}
                />
                <div
                    className="h-full rounded-r-full"
                    style={{
                        width: `${100 - foundPercent}%`,
                        backgroundColor: "#ED5F74",
                        opacity: 0.35,
                    }}
                />
            </div>

            {/* Found keywords */}
            {displayFound.length > 0 && (
                <div className="mb-4">
                    <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-tertiary)] mb-2.5">
                        Found
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {displayFound.map((kw) => (
                            <span
                                key={kw}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium"
                                style={{
                                    backgroundColor: "rgba(62, 207, 142, 0.08)",
                                    color: "#3ECF8E",
                                }}
                            >
                                <Check className="w-3 h-3 flex-shrink-0" />
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Missing keywords — clickable to add */}
            {displayMissing.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2.5">
                        <p className="text-[11px] uppercase tracking-widest font-bold text-[var(--color-text-tertiary)]">
                            Missing
                        </p>
                        {onAddKeyword && (
                            <span className="text-[10px] text-[var(--color-text-tertiary)] italic">
                                Click to add
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {displayMissing.map((kw) => {
                            const isAdding = addingKeyword === kw;
                            return (
                                <button
                                    key={kw}
                                    onClick={() => onAddKeyword?.(kw)}
                                    disabled={!onAddKeyword || !!addingKeyword}
                                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium border border-dashed transition-all duration-200 group"
                                    style={{
                                        backgroundColor: isAdding
                                            ? "rgba(99, 91, 255, 0.08)"
                                            : "rgba(237, 95, 116, 0.06)",
                                        color: isAdding ? "#635BFF" : "#ED5F74",
                                        borderColor: isAdding
                                            ? "rgba(99, 91, 255, 0.30)"
                                            : "rgba(237, 95, 116, 0.30)",
                                        cursor: onAddKeyword && !addingKeyword ? "pointer" : "default",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (onAddKeyword && !addingKeyword) {
                                            e.currentTarget.style.backgroundColor = "rgba(99, 91, 255, 0.08)";
                                            e.currentTarget.style.color = "#635BFF";
                                            e.currentTarget.style.borderColor = "rgba(99, 91, 255, 0.40)";
                                            e.currentTarget.style.borderStyle = "solid";
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isAdding) {
                                            e.currentTarget.style.backgroundColor = "rgba(237, 95, 116, 0.06)";
                                            e.currentTarget.style.color = "#ED5F74";
                                            e.currentTarget.style.borderColor = "rgba(237, 95, 116, 0.30)";
                                            e.currentTarget.style.borderStyle = "dashed";
                                        }
                                    }}
                                >
                                    {isAdding ? (
                                        <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                                    ) : (
                                        <Plus
                                            className="w-3 h-3 flex-shrink-0 transition-transform group-hover:scale-110"
                                        />
                                    )}
                                    {kw}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Show all toggle */}
            {shouldCollapse && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="mt-4 text-[13px] font-medium transition-colors"
                    style={{ color: "#635BFF" }}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#4B45D1")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "#635BFF")
                    }
                >
                    {showAll ? "Show less" : `Show all ${total} keywords`}
                </button>
            )}
        </div>
    );
}
