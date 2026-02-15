"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Check,
    Download,
    Mail,
    RefreshCw,
    Pencil,
    X,
    Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ResumeAnalysis, ContactInfo } from "@/types/firestore";

/**
 * Renders a header line with clickable LinkedIn/GitHub/URL segments.
 * Splits on URL-like patterns and wraps matches in <a> tags.
 */
function renderHeaderLineWithLinks(line: string): React.ReactNode[] {
    const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/[\w-]+\/?|github\.com\/[\w-]+\/?|[\w-]+\.(?:com|io|dev|me|org|net)\/?\S*)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlPattern.exec(line)) !== null) {
        // Text before the URL
        if (match.index > lastIndex) {
            parts.push(line.slice(lastIndex, match.index));
        }
        const url = match[0].replace(/[,;)}\]|]+$/, "");
        const href = url.startsWith("http") ? url : `https://${url}`;
        parts.push(
            <a
                key={`${match.index}-${url}`}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 decoration-1 transition-opacity duration-150 hover:opacity-70"
                style={{ color: "#635BFF" }}
            >
                {url}
            </a>
        );
        // Account for any trailing chars we stripped from the URL
        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last URL
    if (lastIndex < line.length) {
        parts.push(line.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [line];
}

interface ResumeViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    analysis: ResumeAnalysis;
    resumeText: string;
    candidateName?: string;
    candidateEmail?: string;
    contactInfo?: ContactInfo;
    onUpdateResume?: () => Promise<void>;
    onSectionEdited?: (sectionKey: string, newContent: string) => void;
    metadata: {
        filename: string;
        size: number;
        uploadedAt: string;
    };
}

/**
 * Try to extract contact info (phone, location) from the resume text
 * since the analysis sections might not have a dedicated contact section.
 */
function extractContactInfo(resumeText: string): {
    phone: string | null;
    location: string | null;
    links: string[];
} {
    let phone: string | null = null;
    let location: string | null = null;
    const links: string[] = [];

    // Phone: international formats
    const phoneMatch = resumeText.match(
        /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/
    );
    if (phoneMatch) phone = phoneMatch[0].trim();

    // LinkedIn / GitHub / Portfolio URLs
    const urlMatches = resumeText.match(
        /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/\S+|github\.com\/\S+|[\w-]+\.(?:com|io|dev|me)\/?\S*)/gi
    );
    if (urlMatches) {
        urlMatches.slice(0, 3).forEach((url) => {
            const clean = url.replace(/[,;)}\]]+$/, "");
            if (!links.includes(clean)) links.push(clean);
        });
    }

    // Location: common patterns like "City, State" or "City, Country"
    const locationMatch = resumeText.match(
        /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*),\s*([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\s*(?:\||\n|$)/
    );
    if (locationMatch) {
        location = `${locationMatch[1]}, ${locationMatch[2]}`;
    }

    return { phone, location, links };
}

export default function ResumeViewDialog({
    open,
    onOpenChange,
    analysis,
    resumeText,
    candidateName,
    candidateEmail,
    contactInfo: contactInfoProp,
    onUpdateResume,
    onSectionEdited,
    metadata,
}: ResumeViewDialogProps) {
    const [updating, setUpdating] = useState(false);
    const [updated, setUpdated] = useState(false);
    const [downloading, setDownloading] = useState(false);

    // Inline editing state
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Local section overrides — edits are reflected immediately in the dialog
    const [localOverrides, setLocalOverrides] = useState<Record<string, string>>({});

    // Reset local state when dialog closes
    useEffect(() => {
        if (!open) {
            setEditingKey(null);
            setEditContent("");
            setSaving(false);
            setSaveSuccess(null);
            setLocalOverrides({});
        }
    }, [open]);

    // Auto-resize textarea + focus when entering edit mode
    useEffect(() => {
        if (editingKey && textareaRef.current) {
            const ta = textareaRef.current;
            ta.focus();
            ta.style.height = "auto";
            ta.style.height = `${ta.scrollHeight}px`;
        }
    }, [editingKey]);

    const sectionEntries = useMemo(() => {
        if (analysis.originalSectionOrder) {
            return analysis.originalSectionOrder
                .filter((key) => key in analysis.sections)
                .map((key) => [key, analysis.sections[key]] as [string, typeof analysis.sections[string]]);
        }
        return Object.entries(analysis.sections);
    }, [analysis.sections, analysis.originalSectionOrder]);

    const contactInfo = useMemo(() => {
        // Prefer structured contactInfo from backend over regex extraction
        if (contactInfoProp?.phone || contactInfoProp?.location || contactInfoProp?.linkedin) {
            const links: string[] = [];
            if (contactInfoProp.linkedin) links.push(contactInfoProp.linkedin);
            if (contactInfoProp.github) links.push(contactInfoProp.github);
            if (contactInfoProp.portfolio) links.push(contactInfoProp.portfolio);
            if (contactInfoProp.otherLinks) {
                contactInfoProp.otherLinks.forEach((l) => {
                    if (!links.includes(l)) links.push(l);
                });
            }
            return {
                phone: contactInfoProp.phone || null,
                location: contactInfoProp.location || null,
                links,
            };
        }
        return extractContactInfo(resumeText);
    }, [contactInfoProp, resumeText]);

    // Build the clean plain text version (recruiter-ready)
    const plainText = useMemo(() => {
        const parts: string[] = [];

        // Header — prefer originalHeader from structure extraction
        if (analysis.originalHeader) {
            parts.push(analysis.originalHeader);
            parts.push("");
        } else if (candidateName) {
            parts.push(candidateName.toUpperCase());
            const contactParts: string[] = [];
            if (candidateEmail) contactParts.push(candidateEmail);
            if (contactInfo.phone) contactParts.push(contactInfo.phone);
            if (contactInfo.location) contactParts.push(contactInfo.location);
            if (contactParts.length > 0) parts.push(contactParts.join(" | "));
            if (contactInfo.links.length > 0) parts.push(contactInfo.links.join(" | "));
            parts.push("");
        }

        // Sections
        sectionEntries.forEach(([key, section]) => {
            // Skip contact-related sections from the body (already in header)
            const kl = key.toLowerCase();
            if (kl.includes("contact") && (kl.includes("info") || kl.includes("detail"))) return;

            const heading = section.displayName || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            const content = localOverrides[key] ?? section.content;
            parts.push(heading.toUpperCase());
            parts.push(content);
            parts.push("");
        });

        return parts.join("\n");
    }, [analysis.originalHeader, sectionEntries, candidateName, candidateEmail, contactInfo, localOverrides]);

    const handleUpdate = useCallback(async () => {
        if (!onUpdateResume || updating) return;
        setUpdating(true);
        try {
            await onUpdateResume();
            setUpdated(true);
            setTimeout(() => setUpdated(false), 4000);
        } catch {
            // Error handled by parent
        } finally {
            setUpdating(false);
        }
    }, [onUpdateResume, updating]);

    const handleDownload = useCallback(async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const { downloadResumePdf } = await import("@/lib/api");
            await downloadResumePdf();
        } catch {
            // Silent fail — browser will show download error if needed
        } finally {
            setDownloading(false);
        }
    }, [downloading]);

    // ── Inline editing handlers ──────────────────────────────────────

    const startEdit = useCallback((key: string, currentContent: string) => {
        setEditingKey(key);
        setEditContent(currentContent);
        setSaveSuccess(null);
    }, []);

    const cancelEdit = useCallback(() => {
        setEditingKey(null);
        setEditContent("");
    }, []);

    const handleSaveEdit = useCallback(async () => {
        if (!editingKey || saving) return;
        const trimmed = editContent.trim();
        if (!trimmed) return;

        setSaving(true);
        try {
            const { updateResumeSection, regenerateResumeText } = await import("@/lib/api");
            await updateResumeSection(editingKey, trimmed, "replace");
            await regenerateResumeText();

            // Update local display immediately
            setLocalOverrides((prev) => ({ ...prev, [editingKey]: trimmed }));

            // Notify parent to sync its analysis state
            if (onSectionEdited) {
                onSectionEdited(editingKey, trimmed);
            }

            setSaveSuccess(editingKey);
            setEditingKey(null);
            setEditContent("");
            setTimeout(() => setSaveSuccess(null), 3000);
        } catch {
            // Keep edit mode open so user doesn't lose changes
        } finally {
            setSaving(false);
        }
    }, [editingKey, editContent, saving, onSectionEdited]);

    // Handle Ctrl+Enter / Cmd+Enter to save
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSaveEdit();
            }
            if (e.key === "Escape") {
                e.preventDefault();
                cancelEdit();
            }
        },
        [handleSaveEdit, cancelEdit]
    );

    // Auto-resize textarea on input
    const handleTextareaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setEditContent(e.target.value);
        const ta = e.target;
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
    }, []);

    // Filter out contact info sections from body display
    const bodySections = useMemo(
        () =>
            sectionEntries.filter(([key]) => {
                const kl = key.toLowerCase();
                return !(kl.includes("contact") && (kl.includes("info") || kl.includes("detail")));
            }),
        [sectionEntries]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key="resume-view"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {/* Header bar */}
                        <div className="px-6 pt-5 pb-3 border-b border-[var(--color-border-subtle)]">
                            <DialogHeader>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: "rgba(99, 91, 255, 0.08)" }}
                                        >
                                            <FileText className="w-4 h-4" style={{ color: "#635BFF" }} />
                                        </div>
                                        <div className="min-w-0">
                                            <DialogTitle className="text-[14px] font-semibold text-[var(--color-brand-dark)]">
                                                Your Resume
                                            </DialogTitle>
                                            <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0">
                                                Click the pencil icon on any section to make quick edits
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div
                                            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium"
                                            style={{
                                                backgroundColor: "rgba(62, 207, 142, 0.08)",
                                                color: "#3ECF8E",
                                            }}
                                        >
                                            <Mail className="w-3 h-3" />
                                            Optimized
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>
                        </div>

                        {/* Document body — A4-like white page */}
                        <div className="max-h-[70vh] overflow-y-auto bg-[#f8f8fa]">
                            <div
                                className="mx-4 my-4 bg-white rounded-lg"
                                style={{
                                    boxShadow:
                                        "0px 4px 12px rgba(50, 50, 93, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.04)",
                                    minHeight: 400,
                                }}
                            >
                                {/* Resume header — name + contact */}
                                <div className="pt-8 pb-5 px-8 text-center border-b border-[var(--color-border-subtle)]">
                                    {analysis.originalHeader ? (
                                        /* Preserved header from PDF structure extraction */
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            {analysis.originalHeader.split("\n").map((line, i) => {
                                                const trimmed = line.trim();
                                                if (!trimmed) return null;

                                                // First line is the name — render as heading
                                                if (i === 0) {
                                                    return (
                                                        <h1
                                                            key={i}
                                                            className="text-xl font-bold tracking-wide"
                                                            style={{ color: "var(--color-brand-dark)" }}
                                                        >
                                                            {trimmed}
                                                        </h1>
                                                    );
                                                }

                                                // Subsequent lines — render with clickable URLs
                                                return (
                                                    <p
                                                        key={i}
                                                        className="text-[12px] leading-[1.6] mt-1"
                                                        style={{ color: "var(--color-text-secondary)" }}
                                                    >
                                                        {renderHeaderLineWithLinks(trimmed)}
                                                    </p>
                                                );
                                            })}
                                        </motion.div>
                                    ) : (
                                        /* Fallback: reconstructed header from individual fields */
                                        <>
                                            <motion.h1
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="text-xl font-bold tracking-wide"
                                                style={{ color: "var(--color-brand-dark)" }}
                                            >
                                                {candidateName || "Candidate"}
                                            </motion.h1>

                                            {/* Contact info row */}
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ duration: 0.3, delay: 0.1 }}
                                                className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2"
                                            >
                                                {candidateEmail && (
                                                    <span className="text-[12px] text-[var(--color-text-secondary)]">
                                                        {candidateEmail}
                                                    </span>
                                                )}
                                                {contactInfo.phone && (
                                                    <>
                                                        {candidateEmail && (
                                                            <span className="text-[10px] text-[var(--color-border-subtle)]">|</span>
                                                        )}
                                                        <span className="text-[12px] text-[var(--color-text-secondary)]">
                                                            {contactInfo.phone}
                                                        </span>
                                                    </>
                                                )}
                                                {contactInfo.location && (
                                                    <>
                                                        <span className="text-[10px] text-[var(--color-border-subtle)]">|</span>
                                                        <span className="text-[12px] text-[var(--color-text-secondary)]">
                                                            {contactInfo.location}
                                                        </span>
                                                    </>
                                                )}
                                            </motion.div>

                                            {/* Links */}
                                            {contactInfo.links.length > 0 && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ duration: 0.3, delay: 0.15 }}
                                                    className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1"
                                                >
                                                    {contactInfo.links.map((link) => (
                                                        <span
                                                            key={link}
                                                            className="text-[11px]"
                                                            style={{ color: "#635BFF" }}
                                                        >
                                                            {link}
                                                        </span>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Resume sections */}
                                <div className="px-8 py-5">
                                    {bodySections.map(([key, section], index) => {
                                        const heading =
                                            section.displayName ||
                                            key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
                                        const displayContent = localOverrides[key] ?? section.content;
                                        const isEditing = editingKey === key;
                                        const justSaved = saveSuccess === key;

                                        return (
                                            <motion.div
                                                key={key}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{
                                                    duration: 0.25,
                                                    delay: 0.1 + index * 0.04,
                                                    ease: "easeOut",
                                                }}
                                                className="mb-5 last:mb-0 group/section"
                                            >
                                                {/* Section heading + edit button */}
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <h3
                                                        className="text-[12px] font-bold tracking-widest uppercase"
                                                        style={{ color: "var(--color-brand-dark)" }}
                                                    >
                                                        {heading}
                                                    </h3>
                                                    <div
                                                        className="flex-1 h-px"
                                                        style={{ backgroundColor: "var(--color-border-subtle)" }}
                                                    />

                                                    {/* Save success indicator */}
                                                    {justSaved && (
                                                        <motion.span
                                                            initial={{ opacity: 0, scale: 0.8 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                                            style={{
                                                                color: "#3ECF8E",
                                                                backgroundColor: "rgba(62, 207, 142, 0.08)",
                                                            }}
                                                        >
                                                            <Check className="w-2.5 h-2.5" />
                                                            Saved
                                                        </motion.span>
                                                    )}

                                                    {/* Pencil edit button — visible on hover */}
                                                    {!isEditing && !justSaved && (
                                                        <button
                                                            onClick={() => startEdit(key, displayContent)}
                                                            className="opacity-0 group-hover/section:opacity-100 transition-opacity duration-150 p-1 rounded-md hover:bg-[var(--color-surface)]"
                                                            title={`Edit ${heading}`}
                                                        >
                                                            <Pencil
                                                                className="w-3 h-3"
                                                                style={{ color: "var(--color-text-tertiary)" }}
                                                            />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Section content or inline editor */}
                                                <AnimatePresence mode="wait">
                                                    {isEditing ? (
                                                        <motion.div
                                                            key="editor"
                                                            initial={{ opacity: 0, y: -4 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -4 }}
                                                            transition={{ duration: 0.15 }}
                                                        >
                                                            <textarea
                                                                ref={textareaRef}
                                                                value={editContent}
                                                                onChange={handleTextareaInput}
                                                                onKeyDown={handleKeyDown}
                                                                disabled={saving}
                                                                className="w-full text-[12.5px] leading-[1.7] rounded-lg border px-3 py-2.5 resize-none focus:outline-none focus:ring-1 transition-colors duration-150"
                                                                style={{
                                                                    color: "var(--color-text-secondary)",
                                                                    borderColor: "var(--color-brand-primary)",
                                                                    backgroundColor: "rgba(99, 91, 255, 0.02)",
                                                                    minHeight: 80,
                                                                    ...(saving ? { opacity: 0.6 } : {}),
                                                                    boxShadow: "0 0 0 1px rgba(99, 91, 255, 0.12)",
                                                                }}
                                                            />
                                                            <div className="flex items-center justify-between mt-2">
                                                                <p className="text-[10px] text-[var(--color-text-tertiary)]">
                                                                    {navigator.platform?.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to save
                                                                </p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <button
                                                                        onClick={cancelEdit}
                                                                        disabled={saving}
                                                                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors duration-150 hover:bg-[var(--color-surface)]"
                                                                        style={{ color: "var(--color-text-tertiary)" }}
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={handleSaveEdit}
                                                                        disabled={saving || !editContent.trim()}
                                                                        className="flex items-center gap-1 text-[11px] font-semibold px-3 py-1 rounded-md transition-all duration-150"
                                                                        style={{
                                                                            color: "#fff",
                                                                            backgroundColor: saving
                                                                                ? "var(--color-brand-primary)"
                                                                                : "var(--color-brand-primary)",
                                                                            opacity: saving || !editContent.trim() ? 0.6 : 1,
                                                                        }}
                                                                    >
                                                                        {saving ? (
                                                                            <>
                                                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                                                                Saving...
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Save className="w-3 h-3" />
                                                                                Save
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ) : (
                                                        <motion.p
                                                            key="content"
                                                            initial={false}
                                                            animate={{ opacity: 1 }}
                                                            className="text-[12.5px] leading-[1.7] whitespace-pre-wrap cursor-pointer rounded-md transition-colors duration-150 -mx-2 px-2 py-1 hover:bg-[#f8f8fb]"
                                                            style={{ color: "var(--color-text-secondary)" }}
                                                            onClick={() => startEdit(key, displayContent)}
                                                            title="Click to edit"
                                                        >
                                                            {displayContent}
                                                        </motion.p>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info note */}
                            <p className="text-[10px] text-center text-[var(--color-text-tertiary)] py-3 px-4">
                                Click any section to edit. Changes auto-save to your resume and will be used in future recruiter emails.
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-3.5 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={downloading}
                                className="text-[12px] rounded-lg px-3.5 h-8"
                            >
                                {downloading ? (
                                    <>
                                        <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-3 h-3 mr-1.5" />
                                        Download PDF
                                    </>
                                )}
                            </Button>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onOpenChange(false)}
                                    className="text-[12px] rounded-lg px-3.5 h-8"
                                >
                                    Close
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleUpdate}
                                    disabled={updating || updated}
                                    className="text-[12px] rounded-lg px-3.5 h-8 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/90 text-white"
                                >
                                    {updated ? (
                                        <>
                                            <Check className="w-3 h-3 mr-1.5" />
                                            Updated! Emails will use this
                                        </>
                                    ) : updating ? (
                                        <>
                                            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="w-3 h-3 mr-1.5" />
                                            Update Resume
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </DialogContent>
        </Dialog>
    );
}
