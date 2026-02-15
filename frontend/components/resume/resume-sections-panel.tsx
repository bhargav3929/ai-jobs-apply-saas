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
    // Build section list dynamically from whatever the API returned,
    // sorted by standard resume section priority
    const sectionEntries = useMemo(() => {
        const PRIORITY: Record<string, number> = {
            summary: 0, objective: 0, profile: 0, about: 0, overview: 0,
            experience: 1, work: 1, employment: 1, professional: 1,
            project: 2, portfolio: 2,
            skill: 3, competenc: 3, technologies: 3, technical: 3,
            education: 4, academic: 4, degree: 4,
            certification: 5, license: 5, training: 5,
            award: 6, achievement: 6, honor: 6,
            publication: 7, research: 7,
            volunteer: 8, extracurricular: 8, interest: 8, hobby: 8,
        };

        const getPriority = (key: string): number => {
            const kl = key.toLowerCase();
            for (const [keyword, p] of Object.entries(PRIORITY)) {
                if (kl.includes(keyword)) return p;
            }
            return 9;
        };

        return Object.entries(analysis.sections)
            .sort(([a], [b]) => getPriority(a) - getPriority(b))
            .map(([key, section]) => ({
                key,
                displayName: section.displayName || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
                section,
            }));
    }, [analysis.sections]);

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
