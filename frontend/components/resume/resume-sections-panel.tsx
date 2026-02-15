"use client";

import { useMemo } from "react";
import ResumeSectionCard from "./resume-section-card";
import type { ResumeAnalysis } from "@/types/firestore";

interface SectionsPanelProps {
    analysis: ResumeAnalysis;
    activeSection: string | null;
    onActivateSection: (name: string | null) => void;
    onEditSection: (name: string) => void;
    onEnhanceSection: (name: string) => void;
    enhancingSection: string | null;
    sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

export default function ResumeSectionsPanel({
    analysis,
    activeSection,
    onActivateSection,
    onEditSection,
    onEnhanceSection,
    enhancingSection,
    sectionRefs,
}: SectionsPanelProps) {
    // Display sections in the original order from the user's resume.
    // The backend preserves this order in analysis.originalSectionOrder.
    const sectionEntries = useMemo(() => {
        const entries = analysis.originalSectionOrder
            ? analysis.originalSectionOrder
                  .filter((key) => key in analysis.sections)
                  .map((key) => [key, analysis.sections[key]] as const)
            : Object.entries(analysis.sections);

        return entries.map(([key, section]) => ({
            key,
            displayName: section.displayName || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
            section,
        }));
    }, [analysis.sections, analysis.originalSectionOrder]);

    return (
        <div>
            {/* Header */}
            <div className="px-5 pb-4 lg:px-6">
                <h2 className="text-[18px] font-semibold text-[var(--color-brand-dark)] tracking-tight">
                    Your Resume
                </h2>
                <p className="text-[13px] text-[var(--color-text-tertiary)] mt-0.5">
                    Click any section to see detailed analysis
                </p>
            </div>

            {/* Continuous document layout */}
            <div className="bg-white rounded-xl border border-[var(--color-border-subtle)] overflow-hidden divide-y divide-[var(--color-border-subtle)]/60">
                {sectionEntries.map(({ key, displayName, section }) => (
                    <ResumeSectionCard
                        key={key}
                        name={key}
                        displayName={displayName}
                        section={section}
                        isActive={activeSection === key}
                        onActivate={() => onActivateSection(activeSection === key ? null : key)}
                        onEdit={() => onEditSection(key)}
                        onEnhance={() => onEnhanceSection(key)}
                        enhancing={enhancingSection === key}
                        sectionRef={(el) => { sectionRefs.current[key] = el; }}
                    />
                ))}
            </div>
        </div>
    );
}
