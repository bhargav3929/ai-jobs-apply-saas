"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, User, Shield, Key, Lock, Loader2, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { useAuth } from "@/contexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifySmtp } from "@/lib/api";

export default function SettingsPage() {
    const { userProfile, refreshUserProfile } = useAuth();

    const [editingSmtp, setEditingSmtp] = useState(false);
    const [smtpEmail, setSmtpEmail] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");
    const [smtpLoading, setSmtpLoading] = useState(false);
    const [smtpError, setSmtpError] = useState("");
    const [smtpSuccess, setSmtpSuccess] = useState(false);

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

                {/* SMTP Configuration with Edit */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + sections.length * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
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
