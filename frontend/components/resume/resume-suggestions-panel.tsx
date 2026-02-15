"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ResumeAnalysis, ResumeSuggestion } from "@/types/firestore";

interface SuggestionsPanelProps {
    analysis: ResumeAnalysis;
    onScrollToSection: (section: string) => void;
}

interface GroupedSuggestion extends ResumeSuggestion {
    section: string;
    sectionLabel: string;
}

/** Get display name for a section key */
function getSectionLabel(key: string, sections: ResumeAnalysis["sections"]): string {
    const sec = sections[key];
    if (sec?.displayName) return sec.displayName;
    return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function estimatePointGain(priority: "high" | "medium" | "low", count: number): number {
    const perItem = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
    return Math.min(perItem * count, priority === "high" ? 10 : priority === "medium" ? 7 : 4);
}

function getJourneyMilestones(currentScore: number, averageScore: number) {
    const target = currentScore >= 85 ? 100 : 90;
    const afterCritical = Math.min(target, Math.round(currentScore + (target - currentScore) * 0.55));
    return { average: Math.round(averageScore), current: Math.round(currentScore), afterCritical, target };
}

function buildImpactSteps(
    high: GroupedSuggestion[],
    medium: GroupedSuggestion[],
    analysis: ResumeAnalysis
) {
    const steps: { title: string; description: string; points: number; section: string; sectionLabel: string }[] = [];

    if (high.length > 0) {
        const sectionCounts: Record<string, number> = {};
        for (const s of high) sectionCounts[s.section] = (sectionCounts[s.section] || 0) + 1;
        const topSection = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || Object.keys(analysis.sections)[0] || "resume";

        steps.push({
            title: "Fix critical issues",
            description: high[0].text,
            points: estimatePointGain("high", high.length),
            section: topSection,
            sectionLabel: getSectionLabel(topSection, analysis.sections),
        });
    }

    if (analysis.keywordsMissing.length > 0) {
        // Find a skills-like section or use the first section
        const skillsSection = Object.keys(analysis.sections).find((k) =>
            k.toLowerCase().includes("skill") || k.toLowerCase().includes("technologies")
        ) || Object.keys(analysis.sections)[0] || "skills";

        steps.push({
            title: "Add missing keywords",
            description: `${analysis.keywordsMissing.length} key industry keyword${analysis.keywordsMissing.length !== 1 ? "s" : ""} not found`,
            points: Math.min(5, analysis.keywordsMissing.length),
            section: skillsSection,
            sectionLabel: getSectionLabel(skillsSection, analysis.sections),
        });
    }

    if (medium.length > 0) {
        const weakSections = new Set(medium.map((s) => s.sectionLabel));
        const weakList = Array.from(weakSections).slice(0, 3).join(" and ");
        const topMedSection = medium[0].section;

        steps.push({
            title: "Strengthen weak sections",
            description: `${weakList} need${weakSections.size === 1 ? "s" : ""} work`,
            points: estimatePointGain("medium", medium.length),
            section: topMedSection,
            sectionLabel: getSectionLabel(topMedSection, analysis.sections),
        });
    }

    return steps;
}

export default function ResumeSuggestionsPanel({ analysis, onScrollToSection }: SuggestionsPanelProps) {
    const allSuggestions: GroupedSuggestion[] = [];
    for (const [name, section] of Object.entries(analysis.sections)) {
        for (const suggestion of section.suggestions) {
            allSuggestions.push({
                ...suggestion,
                section: name,
                sectionLabel: getSectionLabel(name, analysis.sections),
            });
        }
    }

    // Also add critical improvements
    const firstSection = Object.keys(analysis.sections)[0] || "resume";
    for (const improvement of analysis.criticalImprovements) {
        allSuggestions.push({
            text: improvement,
            priority: "high",
            section: firstSection,
            sectionLabel: getSectionLabel(firstSection, analysis.sections),
        });
    }

    const high = allSuggestions.filter((s) => s.priority === "high");
    const medium = allSuggestions.filter((s) => s.priority === "medium");
    const low = allSuggestions.filter((s) => s.priority === "low");

    if (allSuggestions.length === 0) return null;

    const milestones = getJourneyMilestones(analysis.overallScore, analysis.industryBenchmark.averageScore);
    const steps = buildImpactSteps(high, medium, analysis);

    const rangeMin = Math.min(milestones.average - 10, milestones.current - 5);
    const rangeMax = milestones.target;
    const range = rangeMax - rangeMin;
    const currentPct = Math.max(5, Math.min(90, ((milestones.current - rangeMin) / range) * 100));
    const averagePct = Math.max(2, Math.min(85, ((milestones.average - rangeMin) / range) * 100));
    const afterCriticalPct = Math.max(10, Math.min(92, ((milestones.afterCritical - rangeMin) / range) * 100));

    return (
        <div
            className="rounded-2xl border border-[var(--color-border-subtle)] bg-white overflow-hidden"
            style={{ boxShadow: "0px 2px 5px rgba(50, 50, 93, 0.08), 0px 1px 1px rgba(0, 0, 0, 0.04)" }}
        >
            {/* Header */}
            <div className="px-6 pt-6 pb-0">
                <h2 className="text-lg font-bold text-[var(--color-brand-dark)] tracking-tight">
                    Your path to a {milestones.target}+ resume
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                    {steps.length} step{steps.length !== 1 ? "s" : ""} to significantly improve your score
                </p>
            </div>

            {/* Score Journey Timeline */}
            <div className="px-6 pt-6 pb-2">
                <div className="relative">
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-border-subtle)]/60" />
                    <motion.div
                        className="absolute top-0 left-0 h-1.5 rounded-full"
                        style={{ background: "#635BFF" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${currentPct}%` }}
                        transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                    />
                    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${averagePct}%` }}>
                        <div className="w-3 h-3 rounded-full bg-[var(--color-border-subtle)] border-2 border-white -ml-1.5" />
                    </div>
                    <motion.div
                        className="absolute top-1/2 -translate-y-1/2"
                        style={{ left: `${currentPct}%` }}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1, duration: 0.3 }}
                    >
                        <div className="w-4 h-4 rounded-full bg-[#635BFF] border-[3px] border-white -ml-2 shadow-sm" />
                    </motion.div>
                    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${afterCriticalPct}%` }}>
                        <div className="w-3 h-3 rounded-full border-2 border-[#635BFF]/40 bg-white -ml-1.5" />
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2" style={{ left: "97%" }}>
                        <div className="w-3 h-3 rounded-full border-2 border-[var(--color-success)] bg-white -ml-1.5" />
                    </div>
                </div>

                <div className="relative mt-3 h-10">
                    <div className="absolute text-center -translate-x-1/2" style={{ left: `${averagePct}%` }}>
                        <p className="text-xs font-bold text-[var(--color-text-tertiary)]">{milestones.average}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">average</p>
                    </div>
                    <div className="absolute text-center -translate-x-1/2" style={{ left: `${currentPct}%` }}>
                        <p className="text-xs font-bold text-[#635BFF]">{milestones.current}</p>
                        <p className="text-[10px] text-[#635BFF] font-medium">you are here</p>
                    </div>
                    <div className="absolute text-center -translate-x-1/2" style={{ left: `${afterCriticalPct}%` }}>
                        <p className="text-xs font-bold text-[var(--color-text-secondary)]">{milestones.afterCritical}</p>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">fix critical</p>
                    </div>
                    <div className="absolute text-center -translate-x-1/2" style={{ left: "97%" }}>
                        <p className="text-xs font-bold text-[var(--color-success)]">{milestones.target}+</p>
                        <p className="text-[10px] text-[var(--color-success)]">target</p>
                    </div>
                </div>
            </div>

            <div className="mx-6 border-t border-[var(--color-border-subtle)]/60" />

            {/* Next Steps */}
            <div className="px-6 pt-5 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
                    Next Steps
                </h3>
                <div className="border border-[var(--color-border-subtle)] rounded-xl overflow-hidden divide-y divide-[var(--color-border-subtle)]">
                    {steps.map((step, i) => (
                        <div key={i} className="px-4 py-4 hover:bg-[var(--color-surface)]/50 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <span className="flex-shrink-0 text-sm font-bold text-[var(--color-brand-dark)] mt-0.5">
                                        {i + 1}.
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--color-brand-dark)]">{step.title}</p>
                                        <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">{step.description}</p>
                                        <button
                                            onClick={() => onScrollToSection(step.section)}
                                            className="inline-flex items-center gap-1 text-[13px] font-medium text-[#635BFF] hover:text-[#4B45D1] mt-1.5 transition-colors"
                                        >
                                            Fix it
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <span className="flex-shrink-0 text-sm font-semibold text-[var(--color-success)] whitespace-nowrap">
                                    ~+{step.points} pts
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nice to have */}
            {low.length > 0 && (
                <div className="px-6 pt-4 pb-6">
                    <p className="text-xs font-medium text-[var(--color-text-tertiary)] mb-2">
                        Nice to have (won&apos;t block you):
                    </p>
                    <ul className="space-y-1">
                        {low.slice(0, 5).map((item, i) => (
                            <li
                                key={i}
                                className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed pl-4 relative before:content-[''] before:absolute before:left-0 before:top-[9px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-border-subtle)]"
                            >
                                {item.text}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {low.length === 0 && <div className="h-4" />}
        </div>
    );
}
