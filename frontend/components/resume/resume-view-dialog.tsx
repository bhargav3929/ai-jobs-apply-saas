"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Check, Download, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { ResumeAnalysis, ContactInfo } from "@/types/firestore";

interface ResumeViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    analysis: ResumeAnalysis;
    resumeText: string;
    candidateName?: string;
    candidateEmail?: string;
    contactInfo?: ContactInfo;
    onUpdateResume?: () => Promise<void>;
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
    metadata,
}: ResumeViewDialogProps) {
    const [updating, setUpdating] = useState(false);
    const [updated, setUpdated] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const sectionEntries = useMemo(
        () => Object.entries(analysis.sections),
        [analysis.sections]
    );

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

        // Header with name
        if (candidateName) {
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
            parts.push(heading.toUpperCase());
            parts.push(section.content);
            parts.push("");
        });

        return parts.join("\n");
    }, [sectionEntries, candidateName, candidateEmail, contactInfo]);

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
                                                As used for recruiter emails
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
                                </div>

                                {/* Resume sections */}
                                <div className="px-8 py-5">
                                    {bodySections.map(([key, section], index) => {
                                        const heading =
                                            section.displayName ||
                                            key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
                                                className="mb-5 last:mb-0"
                                            >
                                                {/* Section heading */}
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
                                                </div>

                                                {/* Section content */}
                                                <p
                                                    className="text-[12.5px] leading-[1.7] whitespace-pre-wrap"
                                                    style={{ color: "var(--color-text-secondary)" }}
                                                >
                                                    {section.content}
                                                </p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Info note */}
                            <p className="text-[10px] text-center text-[var(--color-text-tertiary)] py-3 px-4">
                                Click &ldquo;Update Resume&rdquo; to save this version. All future recruiter emails will include this optimized resume.
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
