"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Save, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateResumeSection, regenerateResumeText } from "@/lib/api";

interface SectionEditorProps {
    sectionName: string;
    displayName: string;
    initialContent: string;
    onClose: () => void;
    onSaved: () => void;
}

export default function ResumeSectionEditor({
    sectionName,
    displayName,
    initialContent,
    onClose,
    onSaved,
}: SectionEditorProps) {
    const [content, setContent] = useState(initialContent);
    const [enhancedContent, setEnhancedContent] = useState<string | null>(null);
    const [enhancing, setEnhancing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleEnhance = async () => {
        setEnhancing(true);
        setError(null);
        try {
            const result = await updateResumeSection(sectionName, content, "enhance");
            setEnhancedContent(result.updatedContent);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Enhancement failed");
        } finally {
            setEnhancing(false);
        }
    };

    const handleAcceptEnhanced = () => {
        if (enhancedContent) {
            setContent(enhancedContent);
            setEnhancedContent(null);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await updateResumeSection(sectionName, content, "replace");
            await regenerateResumeText();
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="bg-white rounded-xl border border-[var(--color-brand-primary)]/20 shadow-[0_0_40px_rgba(99,91,255,0.08)] p-4 lg:p-5"
        >
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[14px] font-semibold text-[var(--color-brand-dark)]">
                    Editing: {displayName}
                </h3>
                <button onClick={onClose} className="p-1 rounded-md hover:bg-[var(--color-surface)]">
                    <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                </button>
            </div>

            {/* Editor */}
            <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-[13px] leading-relaxed resize-y border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] rounded-lg"
                placeholder={`Enter your ${displayName.toLowerCase()} content...`}
            />

            {/* Enhanced preview */}
            {enhancedContent && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 p-3 rounded-lg bg-[var(--color-brand-primary)]/[0.04] border border-[var(--color-brand-primary)]/20"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-[var(--color-brand-primary)] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> AI Enhanced Version
                        </span>
                        <Button
                            onClick={handleAcceptEnhanced}
                            size="sm"
                            className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-lg h-6 px-2.5 text-[10px] font-medium"
                        >
                            Accept <ArrowRight className="w-2.5 h-2.5 ml-0.5" />
                        </Button>
                    </div>
                    <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {enhancedContent}
                    </p>
                </motion.div>
            )}

            {/* Error */}
            {error && (
                <p className="text-[12px] text-[var(--color-error)] mt-2">{error}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
                <Button
                    onClick={handleEnhance}
                    disabled={enhancing || !content.trim()}
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-8 px-3 text-[12px] font-medium border-[var(--color-brand-primary)]/30 text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/5"
                >
                    <Sparkles className={`w-3 h-3 mr-1.5 ${enhancing ? "animate-spin" : ""}`} />
                    {enhancing ? "Enhancing..." : "Enhance with AI"}
                </Button>
                <div className="flex-1" />
                <Button
                    onClick={onClose}
                    variant="ghost"
                    size="sm"
                    className="rounded-lg h-8 px-3 text-[12px] font-medium text-[var(--color-text-tertiary)]"
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={saving || !content.trim()}
                    size="sm"
                    className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-lg h-8 px-4 text-[12px] font-medium"
                >
                    <Save className={`w-3 h-3 mr-1.5 ${saving ? "animate-spin" : ""}`} />
                    {saving ? "Saving..." : "Save & Re-analyze"}
                </Button>
            </div>

            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">
                Changes will update your resume for all future AI-generated emails.
            </p>
        </motion.div>
    );
}
