"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResumeSection, SuggestionPriority } from "@/types/firestore";

interface ResumeSectionCardProps {
    name: string;
    displayName: string;
    section: ResumeSection;
    isActive: boolean;
    onActivate: () => void;
    onEdit: () => void;
    onEnhance: () => void;
    enhancing: boolean;
    sectionRef: (el: HTMLDivElement | null) => void;
}

function getScoreColor(score: number): string {
    if (score <= 40) return "#ED5F74";
    if (score <= 70) return "#F5A623";
    return "#3ECF8E";
}

function getPriorityLabel(priority: SuggestionPriority): string {
    return priority.toUpperCase();
}

function getPriorityColor(priority: SuggestionPriority): string {
    if (priority === "high") return "#ED5F74";
    if (priority === "medium") return "#F5A623";
    return "#635BFF";
}

export default function ResumeSectionCard({
    name,
    displayName,
    section,
    isActive,
    onActivate,
    onEdit,
    onEnhance,
    enhancing,
    sectionRef,
}: ResumeSectionCardProps) {
    const contentLines = section.content
        ? section.content.split("\n").filter((l) => l.trim())
        : [];
    const previewLines = contentLines.slice(0, 3);
    const scoreColor = getScoreColor(section.score);

    return (
        <div
            ref={sectionRef}
            data-section={name}
            onClick={onActivate}
            className={`
                relative cursor-pointer transition-colors duration-200
                ${isActive
                    ? "bg-white border-l-2"
                    : "bg-transparent border-l-2 border-l-transparent hover:bg-white/60"
                }
            `}
            style={{
                borderLeftColor: isActive ? scoreColor : undefined,
            }}
        >
            <div className="px-5 py-4 lg:px-6 lg:py-5">
                {/* Header: title + score */}
                <div className="flex items-baseline justify-between mb-2">
                    <h3 className="text-[15px] font-semibold text-[var(--color-brand-dark)] tracking-tight">
                        {displayName}
                    </h3>
                    <span
                        className="text-[14px] font-bold tabular-nums ml-4 flex-shrink-0"
                        style={{ color: scoreColor }}
                    >
                        {section.score}<span className="text-[11px] font-normal text-[var(--color-text-tertiary)]">/100</span>
                    </span>
                </div>

                {/* Separator when active */}
                {isActive && (
                    <div className="w-16 h-px bg-[var(--color-border-subtle)] mb-3" />
                )}

                {/* Content preview (always visible) */}
                {!isActive && contentLines.length > 0 && (
                    <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-3">
                        {previewLines.map((line, i) => (
                            <span key={i}>
                                {line}
                                {i < previewLines.length - 1 && " "}
                            </span>
                        ))}
                        {contentLines.length > 3 && (
                            <span className="text-[var(--color-text-tertiary)]">...</span>
                        )}
                    </div>
                )}

                {!isActive && contentLines.length === 0 && (
                    <p className="text-[13px] text-[var(--color-warning)] italic">
                        Section not found in resume
                    </p>
                )}

                {/* Expanded content */}
                <AnimatePresence>
                    {isActive && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden"
                        >
                            {/* Full content */}
                            {contentLines.length > 0 ? (
                                <div className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-4">
                                    {contentLines.map((line, i) => (
                                        <p key={i} className="mb-1 last:mb-0">{line}</p>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[13px] text-[var(--color-warning)] italic mb-4">
                                    This section was not found in your resume. Adding it could improve your overall score.
                                </p>
                            )}

                            {/* Analysis blockquote */}
                            {section.reasoning && (
                                <div
                                    className="border-l-2 pl-4 py-2 mb-4"
                                    style={{ borderLeftColor: "var(--color-brand-primary)" }}
                                >
                                    <p className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">
                                        Analysis
                                    </p>
                                    <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed italic">
                                        &ldquo;{section.reasoning}&rdquo;
                                    </p>
                                </div>
                            )}

                            {/* Suggestions as simple bullets */}
                            {section.suggestions.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[12px] font-medium text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">
                                        Suggestions
                                    </p>
                                    <ul className="space-y-1.5">
                                        {section.suggestions.map((suggestion, i) => (
                                            <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
                                                <span className="text-[var(--color-text-tertiary)] mt-0.5 select-none flex-shrink-0">&bull;</span>
                                                <span className="flex-1">
                                                    {suggestion.text}
                                                    <span
                                                        className="ml-1.5 text-[10px] font-bold uppercase tracking-wide"
                                                        style={{ color: getPriorityColor(suggestion.priority) }}
                                                    >
                                                        ({getPriorityLabel(suggestion.priority)})
                                                    </span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                                <Button
                                    onClick={(e) => { e.stopPropagation(); onEnhance(); }}
                                    disabled={enhancing}
                                    size="sm"
                                    className="h-8 px-4 text-[12px] font-medium rounded-md text-white bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90"
                                >
                                    <Sparkles className={`w-3.5 h-3.5 mr-1.5 ${enhancing ? "animate-spin" : ""}`} />
                                    {enhancing ? "Enhancing..." : "Enhance with AI"}
                                </Button>
                                <Button
                                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-4 text-[12px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand-dark)] rounded-md"
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                    Edit manually
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
