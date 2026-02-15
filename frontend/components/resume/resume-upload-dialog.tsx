"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadResume } from "@/lib/api";

interface UploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export default function ResumeUploadDialog({ open, onOpenChange, onSuccess }: UploadDialogProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = useCallback((f: File) => {
        setError(null);
        setSuccess(false);

        if (f.type !== "application/pdf") {
            setError("Only PDF files are accepted");
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            setError("File must be under 5MB");
            return;
        }
        setFile(f);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        try {
            await uploadResume(file);
            setSuccess(true);
            // Brief success flash, then close and trigger re-analysis.
            // onSuccess fires BEFORE dialog close to guarantee it runs
            // even if the component unmounts during animation.
            setTimeout(() => {
                onSuccess();
                onOpenChange(false);
                setFile(null);
                setSuccess(false);
            }, 800);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setError(null);
        setSuccess(false);
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!uploading) { onOpenChange(v); reset(); } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-[var(--color-brand-dark)]">Upload Resume</DialogTitle>
                </DialogHeader>

                <div className="mt-2">
                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center py-8"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-success)]/10 flex items-center justify-center mb-3">
                                    <CheckCircle2 className="w-7 h-7 text-[var(--color-success)]" />
                                </div>
                                <p className="text-[15px] font-semibold text-[var(--color-brand-dark)]">Resume uploaded!</p>
                                <p className="text-[13px] text-[var(--color-text-tertiary)]">Running analysis...</p>
                            </motion.div>
                        ) : (
                            <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {/* Drop zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    className={`
                                        relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                                        ${dragOver
                                            ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/5"
                                            : "border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]/40"
                                        }
                                    `}
                                >
                                    {file ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center">
                                                <FileText className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[13px] font-medium text-[var(--color-brand-dark)]">{file.name}</p>
                                                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                                    {(file.size / 1024).toFixed(0)} KB
                                                </p>
                                            </div>
                                            <button
                                                onClick={reset}
                                                className="ml-2 p-1 rounded-md hover:bg-[var(--color-surface)]"
                                            >
                                                <X className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-primary)]/[0.06] flex items-center justify-center mx-auto mb-3">
                                                <Upload className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                            </div>
                                            <p className="text-[13px] font-medium text-[var(--color-brand-dark)]">
                                                Drop your resume here
                                            </p>
                                            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">
                                                PDF only, max 5MB
                                            </p>
                                            <label className="mt-3 inline-block">
                                                <span className="text-[12px] font-medium text-[var(--color-brand-primary)] hover:underline cursor-pointer">
                                                    or browse files
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="application/pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const f = e.target.files?.[0];
                                                        if (f) handleFile(f);
                                                    }}
                                                />
                                            </label>
                                        </>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-red-50 text-red-700"
                                    >
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="text-[12px]">{error}</span>
                                    </motion.div>
                                )}

                                {/* Upload button */}
                                {file && (
                                    <Button
                                        onClick={handleUpload}
                                        disabled={uploading}
                                        className="w-full mt-4 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl h-10 text-[13px] font-medium"
                                    >
                                        {uploading ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                                Uploading & Parsing...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="w-4 h-4 mr-2" />
                                                Upload & Analyze
                                            </>
                                        )}
                                    </Button>
                                )}

                                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-3 text-center">
                                    This will replace your current resume. AI-generated emails will use the new version.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
