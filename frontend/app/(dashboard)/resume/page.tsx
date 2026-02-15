"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { FileText, Upload, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeResume, updateResumeSection, regenerateResumeText } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import type { ResumeAnalysisResponse } from "@/types/firestore";
import {
    ResumeHero,
    ResumeScoreCards,
    ResumeSectionsPanel,
    ResumeAnalyticsPanel,
    ResumeSuggestionsPanel,
    ResumeUploadDialog,
    ResumeSectionEditor,
    ResumeKeywordChart,
    ResumeSkillsGap,
    ResumeViewDialog,
} from "@/components/resume";

/* ------------------------------------------------------------------ */
/*  Loading Skeleton — matches the new layout shape                    */
/* ------------------------------------------------------------------ */
function LoadingSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Hero skeleton */}
            <div className="py-12 flex flex-col items-center">
                <div className="h-24 w-32 rounded-lg bg-[var(--color-border-subtle)]" />
                <div className="h-5 w-80 max-w-full rounded bg-[var(--color-border-subtle)] mt-4" />
                <div className="h-3 w-40 rounded bg-[var(--color-border-subtle)] mt-3" />
                <div className="flex gap-3 mt-6">
                    <div className="h-9 w-28 rounded-lg bg-[var(--color-border-subtle)]" />
                    <div className="h-9 w-28 rounded-lg bg-[var(--color-border-subtle)]" />
                </div>
            </div>

            {/* Metric strip skeleton */}
            <div className="h-[100px] rounded-xl bg-white border border-[var(--color-border-subtle)]" />

            {/* Two-column skeleton */}
            <div className="grid md:grid-cols-5 gap-5">
                <div className="md:col-span-3 space-y-0">
                    <div className="h-6 w-32 rounded bg-[var(--color-border-subtle)] mb-3" />
                    <div className="h-[400px] rounded-xl bg-white border border-[var(--color-border-subtle)]" />
                </div>
                <div className="md:col-span-2 space-y-4">
                    <div className="h-6 w-20 rounded bg-[var(--color-border-subtle)]" />
                    <div className="h-[200px] rounded-xl bg-white border border-[var(--color-border-subtle)]" />
                    <div className="h-[140px] rounded-xl bg-white border border-[var(--color-border-subtle)]" />
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Empty State — clear, restrained, typography-driven                 */
/* ------------------------------------------------------------------ */
function EmptyState({ onUpload }: { onUpload: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface)] flex items-center justify-center mb-6">
                <FileText className="w-7 h-7" style={{ color: "var(--color-text-tertiary)" }} />
            </div>

            <h2
                className="text-xl font-bold mb-2"
                style={{ color: "var(--color-brand-dark)" }}
            >
                No Resume Uploaded
            </h2>
            <p
                className="text-sm text-center max-w-md leading-relaxed mb-8"
                style={{ color: "var(--color-text-tertiary)" }}
            >
                Upload your resume to get an AI-powered analysis with scoring,
                keyword optimization, and actionable improvements.
            </p>

            <Button
                onClick={onUpload}
                className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl h-11 px-6 text-sm font-semibold"
            >
                <Upload className="w-4 h-4 mr-2" />
                Upload Resume
            </Button>

            <p
                className="text-[11px] mt-3"
                style={{ color: "var(--color-text-tertiary)" }}
            >
                PDF format, max 5MB
            </p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Score merging helper — prevents unrelated sections from regressing */
/*  when only one section was enhanced.                                */
/* ------------------------------------------------------------------ */
function mergeAnalysisScores(
    freshAnalysis: ResumeAnalysisResponse,
    previousScores: Record<string, number>,
    changedSection: string,
): ResumeAnalysisResponse {
    const merged = {
        ...freshAnalysis,
        analysis: {
            ...freshAnalysis.analysis,
            sections: { ...freshAnalysis.analysis.sections },
        },
    };

    // For every section that was NOT the one enhanced, keep its previous score
    // to prevent random AI variance from regressing other sections.
    for (const [key, sec] of Object.entries(merged.analysis.sections)) {
        if (key !== changedSection && previousScores[key] !== undefined) {
            merged.analysis.sections[key] = { ...sec, score: previousScores[key] };
        }
    }

    // Recalculate overallScore using the same weighted-average logic as the backend
    let totalWeight = 0;
    let weightedSum = 0;
    for (const [key, sec] of Object.entries(merged.analysis.sections)) {
        const kl = key.toLowerCase();
        let weight = 0.8;
        if (["experience", "work", "employment", "skill", "technologies"].some((w) => kl.includes(w))) {
            weight = 1.5;
        } else if (["summary", "objective", "profile", "project"].some((w) => kl.includes(w))) {
            weight = 1.2;
        } else if (["education", "certification", "training"].some((w) => kl.includes(w))) {
            weight = 1.0;
        }
        weightedSum += sec.score * weight;
        totalWeight += weight;
    }
    merged.analysis.overallScore =
        totalWeight > 0 ? Math.max(0, Math.min(100, Math.round(weightedSum / totalWeight))) : 50;

    return merged;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function ResumePage() {
    const { userProfile, refreshUserProfile } = useAuth();

    // Data state
    const [analysisData, setAnalysisData] = useState<ResumeAnalysisResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noResume, setNoResume] = useState(false);

    // Interaction state
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [enhancingSection, setEnhancingSection] = useState<string | null>(null);
    const [addingKeyword, setAddingKeyword] = useState<string | null>(null);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [viewResumeOpen, setViewResumeOpen] = useState(false);

    // Refs for section scroll targeting
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Fetch analysis
    const fetchAnalysis = useCallback(async (isReanalyze = false) => {
        try {
            if (isReanalyze) {
                setAnalyzing(true);
            } else {
                setLoading(true);
            }
            setError(null);
            setNoResume(false);

            const data = await analyzeResume(isReanalyze);
            setAnalysisData(data);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("No resume uploaded") || msg.includes("not found")) {
                setNoResume(true);
            } else if (msg.includes("Not authenticated")) {
                setError("Session expired. Please refresh the page.");
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
            setAnalyzing(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    // Section enhancement handler
    const handleEnhanceSection = async (sectionName: string) => {
        if (!analysisData) return;
        const section = analysisData.analysis.sections[sectionName as string];
        if (!section?.content) return;

        // Snapshot previous scores BEFORE re-analysis so we can preserve them
        // for sections that weren't changed (prevents AI variance regression).
        const previousScores: Record<string, number> = {};
        for (const [key, sec] of Object.entries(analysisData.analysis.sections)) {
            previousScores[key] = sec.score;
        }

        setEnhancingSection(sectionName);
        try {
            // Step 1: Get AI-enhanced content
            const enhanceResult = await updateResumeSection(sectionName, section.content, "enhance");
            const enhancedText = enhanceResult.updatedContent;

            // Step 2: Update local state immediately
            setAnalysisData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    analysis: {
                        ...prev.analysis,
                        sections: {
                            ...prev.analysis.sections,
                            [sectionName]: {
                                ...prev.analysis.sections[sectionName as string],
                                content: enhancedText,
                            },
                        },
                    },
                };
            });

            // Step 3: Save to Firestore
            await updateResumeSection(sectionName, enhancedText, "replace");

            // Step 4: Regenerate full resume text
            await regenerateResumeText();

            // Step 5: Re-analyze for updated score (force bypass cache)
            setAnalyzing(true);
            const freshData = await analyzeResume(true);

            // Step 6: Merge — only accept the new score for the enhanced section;
            // keep previous scores for all other sections to prevent regression.
            const merged = mergeAnalysisScores(freshData, previousScores, sectionName);
            setAnalysisData(merged);
            setAnalyzing(false);
        } catch {
            setAnalyzing(false);
        } finally {
            setEnhancingSection(null);
        }
    };

    // Section edit save handler
    const handleSectionSaved = async () => {
        const savedSection = editingSection;
        setEditingSection(null);

        // Snapshot previous scores to preserve them for unchanged sections
        const previousScores: Record<string, number> = {};
        if (analysisData) {
            for (const [key, sec] of Object.entries(analysisData.analysis.sections)) {
                previousScores[key] = sec.score;
            }
        }

        // Regenerate full text with the manual edit, then re-analyze
        try {
            await regenerateResumeText();
        } catch {
            // Non-critical — re-analyze will still work with saved edits
        }

        try {
            setAnalyzing(true);
            const freshData = await analyzeResume(true);
            // Merge: only the edited section gets a new score
            if (savedSection && Object.keys(previousScores).length > 0) {
                const merged = mergeAnalysisScores(freshData, previousScores, savedSection);
                setAnalysisData(merged);
            } else {
                setAnalysisData(freshData);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setError(msg);
        } finally {
            setAnalyzing(false);
        }
    };

    // Add missing keyword to resume
    const handleAddKeyword = async (keyword: string) => {
        if (!analysisData || addingKeyword) return;

        // Find the best skills-related section to add the keyword to
        const sectionKeys = Object.keys(analysisData.analysis.sections);
        const skillsPatterns = ["skill", "expertise", "technologies", "competencies", "technical"];
        let targetSection = sectionKeys.find((k) =>
            skillsPatterns.some((p) => k.toLowerCase().includes(p))
        );
        // Fallback: use the first section if no skills section found
        if (!targetSection) targetSection = sectionKeys[0];
        if (!targetSection) return;

        const section = analysisData.analysis.sections[targetSection];
        if (!section) return;

        // Snapshot scores before re-analysis
        const previousScores: Record<string, number> = {};
        for (const [key, sec] of Object.entries(analysisData.analysis.sections)) {
            previousScores[key] = sec.score;
        }

        setAddingKeyword(keyword);
        try {
            // Append keyword to the section content
            const updatedContent = section.content.trim() + ", " + keyword;

            // Step 1: Optimistically update local state — move keyword from missing to found
            setAnalysisData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    analysis: {
                        ...prev.analysis,
                        keywordsFound: [...prev.analysis.keywordsFound, keyword],
                        keywordsMissing: prev.analysis.keywordsMissing.filter((k) => k !== keyword),
                        sections: {
                            ...prev.analysis.sections,
                            [targetSection]: {
                                ...prev.analysis.sections[targetSection],
                                content: updatedContent,
                            },
                        },
                    },
                };
            });

            // Step 2: Save the updated section to Firestore
            await updateResumeSection(targetSection, updatedContent, "replace");

            // Step 3: Regenerate full resume text
            await regenerateResumeText();

            // Step 4: Re-analyze with force (bypass cache)
            setAnalyzing(true);
            const freshData = await analyzeResume(true);

            // Step 5: Merge scores — only the target section gets new score
            const merged = mergeAnalysisScores(freshData, previousScores, targetSection);
            // Ensure the keyword stays in found list even if AI re-analysis changes it
            if (!merged.analysis.keywordsFound.includes(keyword)) {
                merged.analysis.keywordsFound.push(keyword);
            }
            merged.analysis.keywordsMissing = merged.analysis.keywordsMissing.filter((k) => k !== keyword);
            setAnalysisData(merged);
            setAnalyzing(false);
        } catch {
            setAnalyzing(false);
        } finally {
            setAddingKeyword(null);
        }
    };

    // Scroll to section
    const scrollToSection = (sectionName: string) => {
        setActiveSection(sectionName);
        const el = sectionRefs.current[sectionName];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    };

    // View resume handler — open popup dialog
    const handleViewResume = useCallback(() => {
        setViewResumeOpen(true);
    }, []);

    // Update resume handler — saves optimized content + regenerates PDF
    const handleUpdateResume = useCallback(async () => {
        await regenerateResumeText();
        // Re-analyze in background to refresh scores
        try {
            const freshData = await analyzeResume(true);
            setAnalysisData(freshData);
        } catch {
            // Non-critical — the text override is already saved
        }
    }, []);

    // Upload success handler — clear stale data, refresh profile, then re-analyze
    const handleUploadSuccess = () => {
        setNoResume(false);
        setAnalysisData(null);
        setError(null);
        refreshUserProfile();
        fetchAnalysis(true);
    };

    return (
        <div className="px-5 md:px-8 lg:px-10 xl:px-12 pb-12">
            {/* Error Banner */}
            {error && (
                <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 mt-4"
                    style={{
                        background: "rgba(245,166,35,0.06)",
                        border: "1px solid rgba(245,166,35,0.15)",
                    }}
                >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#F5A623" }} />
                    <p className="text-sm flex-1 font-medium" style={{ color: "var(--color-brand-dark)" }}>
                        {error}
                    </p>
                    <button
                        onClick={() => fetchAnalysis()}
                        className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors"
                        style={{ color: "#F5A623" }}
                    >
                        <RefreshCw className="w-3 h-3" /> Retry
                    </button>
                </div>
            )}

            {/* Loading State — also show skeleton when re-analyzing after a new upload */}
            {(loading || (analyzing && !analysisData)) && <LoadingSkeleton />}

            {/* Empty State */}
            {!loading && noResume && (
                <>
                    <EmptyState onUpload={() => setUploadDialogOpen(true)} />
                    <ResumeUploadDialog
                        open={uploadDialogOpen}
                        onOpenChange={setUploadDialogOpen}
                        onSuccess={handleUploadSuccess}
                    />
                </>
            )}

            {/* Analysis Content */}
            {!loading && !noResume && analysisData && (
                <div className="max-w-6xl mx-auto">
                    {/* Hero — MASSIVE score, provocative narrative */}
                    <ResumeHero
                        data={analysisData}
                        onUpload={() => setUploadDialogOpen(true)}
                        onReanalyze={() => fetchAnalysis(true)}
                        onViewResume={handleViewResume}
                        analyzing={analyzing}
                    />

                    {/* Metric strip + Critical Issues + ATS Issues */}
                    <ResumeScoreCards analysis={analysisData.analysis} onScrollToSection={scrollToSection} />

                    {/* Two-Column Layout: Resume Document + Insights */}
                    <div className="grid md:grid-cols-5 gap-5 mt-6">
                        {/* Left: Resume Sections */}
                        <div className="md:col-span-3 min-w-0">
                            {editingSection ? (
                                <ResumeSectionEditor
                                    sectionName={editingSection}
                                    displayName={
                                        analysisData.analysis.sections[editingSection]?.displayName ||
                                        editingSection.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
                                    }
                                    initialContent={
                                        analysisData.analysis.sections[editingSection]?.content || ""
                                    }
                                    onClose={() => setEditingSection(null)}
                                    onSaved={handleSectionSaved}
                                />
                            ) : (
                                <ResumeSectionsPanel
                                    analysis={analysisData.analysis}
                                    activeSection={activeSection}
                                    onActivateSection={setActiveSection}
                                    onEditSection={setEditingSection}
                                    onEnhanceSection={handleEnhanceSection}
                                    enhancingSection={enhancingSection}
                                    sectionRefs={sectionRefs}
                                />
                            )}
                        </div>

                        {/* Right: Insights — sticky so it stays visible while scrolling sections */}
                        <div className="md:col-span-2">
                            <div className="md:sticky md:top-4 space-y-0">
                                <ResumeAnalyticsPanel analysis={analysisData.analysis} />
                            </div>
                        </div>
                    </div>

                    {/* Keywords + Skills Gap — full width row */}
                    <div className="grid md:grid-cols-2 gap-5 mt-6">
                        <ResumeKeywordChart
                            analysis={analysisData.analysis}
                            onAddKeyword={handleAddKeyword}
                            addingKeyword={addingKeyword}
                        />
                        <ResumeSkillsGap analysis={analysisData.analysis} />
                    </div>

                    {/* Score Journey */}
                    <div className="mt-6">
                        <ResumeSuggestionsPanel
                            analysis={analysisData.analysis}
                            onScrollToSection={scrollToSection}
                        />
                    </div>

                    {/* Upload Dialog */}
                    <ResumeUploadDialog
                        open={uploadDialogOpen}
                        onOpenChange={setUploadDialogOpen}
                        onSuccess={handleUploadSuccess}
                    />

                    {/* View Optimized Resume Dialog */}
                    <ResumeViewDialog
                        open={viewResumeOpen}
                        onOpenChange={setViewResumeOpen}
                        analysis={analysisData.analysis}
                        resumeText={analysisData.resumeText}
                        candidateName={analysisData.candidateName || userProfile?.name}
                        candidateEmail={userProfile?.email}
                        contactInfo={analysisData.contactInfo || analysisData.analysis?.contactInfo}
                        onUpdateResume={handleUpdateResume}
                        metadata={{
                            filename: analysisData.metadata?.filename || userProfile?.resumeMetadata?.filename || "resume.pdf",
                            size: analysisData.metadata?.size || userProfile?.resumeMetadata?.size || 0,
                            uploadedAt: analysisData.metadata?.uploadedAt || userProfile?.resumeMetadata?.uploadedAt || "",
                        }}
                    />
                </div>
            )}
        </div>
    );
}
