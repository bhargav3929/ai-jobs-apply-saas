"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, Shield, Key, Lock, Loader2, CheckCircle2, AlertCircle, Pencil, FileText, Trash2, UploadCloud } from "lucide-react";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifySmtp, uploadResume, deleteResume } from "@/lib/api";

export default function SettingsPage() {
    const { userProfile, refreshUserProfile } = useAuth();

    // SMTP State
    const [editingSmtp, setEditingSmtp] = useState(false);
    const [smtpEmail, setSmtpEmail] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");
    const [smtpLoading, setSmtpLoading] = useState(false);
    const [smtpError, setSmtpError] = useState("");
    const [smtpSuccess, setSmtpSuccess] = useState(false);

    // Resume State
    const [resumeLoading, setResumeLoading] = useState(false);
    const [resumeError, setResumeError] = useState("");
    const [resumeSuccess, setResumeSuccess] = useState("");

    const handleSmtpEdit = () => {
        setSmtpEmail(userProfile?.smtpEmail || "");
        setSmtpPassword("");
        setSmtpError("");
        setSmtpSuccess(false);
        setEditingSmtp(true);
    };

    const handleSmtpCancel = () => {
        setEditingSmtp(false);
        setSmtpError("");
        setSmtpSuccess(false);
    };

    const handleSmtpSave = async () => {
        if (!smtpEmail || !smtpPassword) {
            setSmtpError("Both email and app password are required.");
            return;
        }

        setSmtpLoading(true);
        setSmtpError("");
        setSmtpSuccess(false);

        try {
            await verifySmtp(smtpEmail, smtpPassword);
            setSmtpSuccess(true);
            await refreshUserProfile();
            setTimeout(() => {
                setEditingSmtp(false);
                setSmtpSuccess(false);
            }, 1500);
        } catch (err: any) {
            setSmtpError(err.message || "SMTP verification failed. Check your credentials.");
        } finally {
            setSmtpLoading(false);
        }
    };

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== "application/pdf") {
            setResumeError("Only PDF files are allowed.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setResumeError("File size must be less than 5MB.");
            return;
        }

        setResumeLoading(true);
        setResumeError("");
        setResumeSuccess("");

        try {
            await uploadResume(file);
            await refreshUserProfile();
            setResumeSuccess("Resume uploaded successfully!");
            setTimeout(() => setResumeSuccess(""), 3000);
        } catch (err: any) {
            setResumeError(err.message || "Failed to upload resume.");
        } finally {
            setResumeLoading(false);
            // Reset input value to allow re-uploading same file if needed
            e.target.value = "";
        }
    };

    const handleResumeDelete = async () => {
        if (!confirm("Are you sure you want to delete your resume? This action cannot be undone.")) return;

        setResumeLoading(true);
        setResumeError("");

        try {
            await deleteResume();
            await refreshUserProfile();
            setResumeSuccess("Resume deleted.");
            setTimeout(() => setResumeSuccess(""), 3000);
        } catch (err: any) {
            setResumeError(err.message || "Failed to delete resume.");
        } finally {
            setResumeLoading(false);
        }
    };

    const sections = [
        {
            icon: User,
            title: "Profile",
            description: "Your account information",
            items: [
                { label: "Name", value: userProfile?.name || "—" },
                { label: "Email", value: userProfile?.email || "—" },
                { label: "Job Category", value: userProfile?.jobCategory || "—" },
            ],
        },
        {
            icon: Shield,
            title: "Subscription",
            description: "Your plan details",
            items: [
                { label: "Status", value: userProfile?.subscriptionStatus || "—" },
                { label: "Ends At", value: userProfile?.subscriptionEndsAt ? new Date(userProfile.subscriptionEndsAt).toLocaleDateString() : "—" },
            ],
        },
    ];

    return (
        <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-tight">Settings</h1>
                <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">
                    Manage your account and preferences
                </p>
            </motion.div>

            <div className="space-y-4">
                {/* Profile & Subscription sections */}
                {sections.map((section, si) => (
                    <motion.div
                        key={section.title}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + si * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden"
                    >
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border-subtle)]">
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/[0.06] flex items-center justify-center">
                                <section.icon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                            </div>
                            <div>
                                <h3 className="text-[14px] font-semibold text-[var(--color-brand-dark)]">{section.title}</h3>
                                <p className="text-[11px] text-[var(--color-text-tertiary)]">{section.description}</p>
                            </div>
                        </div>
                        <div className="divide-y divide-[var(--color-border-subtle)]">
                            {section.items.map((item) => (
                                <div key={item.label} className="flex items-center justify-between px-6 py-3.5">
                                    <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">{item.label}</span>
                                    <span className="text-[13px] text-[var(--color-brand-dark)] font-medium">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                ))}

                {/* Resume Management Section */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + sections.length * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden"
                >
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border-subtle)]">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/[0.06] flex items-center justify-center">
                            <FileText className="w-4 h-4 text-[var(--color-brand-primary)]" />
                        </div>
                        <div>
                            <h3 className="text-[14px] font-semibold text-[var(--color-brand-dark)]">Resume Management</h3>
                            <p className="text-[11px] text-[var(--color-text-tertiary)]">Upload to auto-fill applications</p>
                        </div>
                    </div>

                    <div className="p-6">
                        {userProfile?.resumeUrl ? (
                            <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-medium text-[var(--color-brand-dark)] truncate max-w-[200px] md:max-w-[300px]">
                                            {userProfile.resumeMetadata?.filename || "Resume.pdf"}
                                        </p>
                                        <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                            Uploaded {userProfile.resumeMetadata?.uploadedAt ? new Date(userProfile.resumeMetadata.uploadedAt).toLocaleDateString() : "Recently"} • {(userProfile.resumeMetadata?.size ? (userProfile.resumeMetadata.size / 1024 / 1024).toFixed(2) : "0")} MB
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 relative overflow-hidden"
                                        disabled={resumeLoading}
                                    >
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={handleResumeUpload}
                                            disabled={resumeLoading}
                                        />
                                        Replace
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResumeDelete}
                                        disabled={resumeLoading}
                                        className="h-9 w-9 p-0 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 hover:text-[var(--color-error)]"
                                    >
                                        {resumeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-[var(--color-border-subtle)] rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-[var(--color-surface)] transition-colors group relative cursor-pointer">
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                    onChange={handleResumeUpload}
                                    disabled={resumeLoading}
                                />
                                <div className="w-12 h-12 rounded-full bg-[var(--color-brand-primary)]/[0.06] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                    {resumeLoading ? (
                                        <Loader2 className="w-6 h-6 text-[var(--color-brand-primary)] animate-spin" />
                                    ) : (
                                        <UploadCloud className="w-6 h-6 text-[var(--color-brand-primary)]" />
                                    )}
                                </div>
                                <h3 className="text-[14px] font-medium text-[var(--color-brand-dark)]">Upload Resume</h3>
                                <p className="text-[12px] text-[var(--color-text-tertiary)] mt-1 max-w-xs">
                                    Drag & drop or click to upload (PDF only, max 5MB)
                                </p>
                            </div>
                        )}

                        {/* Status Messages */}
                        <AnimatePresence>
                            {resumeError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] text-[12px]">
                                        <AlertCircle className="w-4 h-4" />
                                        {resumeError}
                                    </div>
                                </motion.div>
                            )}
                            {resumeSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)] text-[12px]">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {resumeSuccess}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* SMTP Configuration with Edit */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + (sections.length + 1) * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden"
                >
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--color-border-subtle)]">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/[0.06] flex items-center justify-center">
                            <Mail className="w-4 h-4 text-[var(--color-brand-primary)]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[14px] font-semibold text-[var(--color-brand-dark)]">SMTP Configuration</h3>
                            <p className="text-[11px] text-[var(--color-text-tertiary)]">Email sending settings</p>
                        </div>
                        {!editingSmtp && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSmtpEdit}
                                className="rounded-lg h-8 px-3 text-[12px] font-medium border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)] hover:border-[var(--color-brand-primary)]/30 transition-all gap-1.5"
                            >
                                <Pencil className="w-3 h-3" />
                                Edit
                            </Button>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        {editingSmtp ? (
                            <motion.div
                                key="editing"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="overflow-hidden"
                            >
                                <div className="px-6 py-5 space-y-4">
                                    {/* Info banner */}
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-brand-primary)]/[0.04] border border-[var(--color-brand-primary)]/10">
                                        <Shield className="w-4 h-4 text-[var(--color-brand-primary)] mt-0.5 flex-shrink-0" />
                                        <p className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                                            Your credentials are encrypted with AES-256. Use a{" "}
                                            <a
                                                href="https://support.google.com/accounts/answer/185833"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[var(--color-brand-primary)] font-medium hover:underline"
                                            >
                                                Gmail App Password
                                            </a>
                                            {" "}&mdash; not your regular password.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[13px] font-medium text-[var(--color-text-primary)]">Gmail Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                            <Input
                                                placeholder="you@gmail.com"
                                                value={smtpEmail}
                                                onChange={(e) => setSmtpEmail(e.target.value)}
                                                disabled={smtpLoading}
                                                className="pl-10 h-11 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[13px] font-medium text-[var(--color-text-primary)]">App Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                            <Input
                                                type="password"
                                                placeholder="xxxx xxxx xxxx xxxx"
                                                value={smtpPassword}
                                                onChange={(e) => setSmtpPassword(e.target.value)}
                                                disabled={smtpLoading}
                                                className="pl-10 h-11 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]"
                                            />
                                        </div>
                                        <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                                            <Lock className="w-3 h-3" /> 16-character App Password from Google
                                        </p>
                                    </div>

                                    {/* Error */}
                                    <AnimatePresence>
                                        {smtpError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20"
                                            >
                                                <AlertCircle className="w-4 h-4 text-[var(--color-error)] flex-shrink-0" />
                                                <p className="text-[12px] text-[var(--color-error)]">{smtpError}</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Success */}
                                    <AnimatePresence>
                                        {smtpSuccess && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="flex items-center gap-2 p-3 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20"
                                            >
                                                <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
                                                <p className="text-[12px] text-[var(--color-success)] font-medium">SMTP credentials verified and saved!</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Buttons */}
                                    <div className="flex items-center justify-end gap-3 pt-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleSmtpCancel}
                                            disabled={smtpLoading}
                                            className="rounded-xl h-10 px-5 text-[13px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSmtpSave}
                                            disabled={smtpLoading || !smtpEmail || !smtpPassword}
                                            className="rounded-xl h-10 px-6 text-[13px] font-semibold bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white shadow-sm hover:shadow-md transition-all"
                                        >
                                            {smtpLoading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying...</>
                                            ) : (
                                                <><Key className="w-3.5 h-3.5 mr-2" /> Verify &amp; Save</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="display"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="divide-y divide-[var(--color-border-subtle)]">
                                    <div className="flex items-center justify-between px-6 py-3.5">
                                        <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">SMTP Email</span>
                                        <span className="text-[13px] text-[var(--color-brand-dark)] font-medium">{userProfile?.smtpEmail || "Not configured"}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-6 py-3.5">
                                        <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">SMTP Server</span>
                                        <span className="text-[13px] text-[var(--color-brand-dark)] font-medium">{userProfile?.smtpServer || "smtp.gmail.com"}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-6 py-3.5">
                                        <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">SMTP Port</span>
                                        <span className="text-[13px] text-[var(--color-brand-dark)] font-medium">{String(userProfile?.smtpPort || 465)}</span>
                                    </div>
                                    <div className="flex items-center justify-between px-6 py-3.5">
                                        <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">Password</span>
                                        <span className="text-[13px] text-[var(--color-text-tertiary)] font-medium">
                                            {userProfile?.smtpEmail ? "••••••••••••••••" : "—"}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </div>
    );
}
