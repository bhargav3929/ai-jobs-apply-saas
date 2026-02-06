"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Zap, Mail, ArrowRight, Loader2, ArrowLeft, Lock, Shield, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { resetPassword } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await resetPassword(email);
            setSuccess(true);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to send reset email";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side — Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 mb-8">
                        <div className="p-1.5 rounded-lg bg-[var(--color-brand-primary)]">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-[var(--color-brand-dark)] tracking-tight">
                            JobAgent<span className="text-[var(--color-brand-primary)]">.ai</span>
                        </span>
                    </Link>

                    {/* Back to login */}
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] transition-colors mb-6"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to sign in
                    </Link>

                    {/* Header */}
                    <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-[-0.02em] mb-2">
                        Reset your password
                    </h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-8">
                        Enter your email and we&apos;ll send you a link to reset your password.
                    </p>

                    {success ? (
                        /* Success State */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="p-5 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 mb-6">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-brand-dark)] mb-1">
                                            Check your email
                                        </p>
                                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                            We&apos;ve sent a password reset link to{" "}
                                            <span className="font-medium text-[var(--color-brand-dark)]">{email}</span>.
                                            Click the link in the email to set a new password.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <p className="text-xs text-[var(--color-text-tertiary)] mb-6 leading-relaxed">
                                Didn&apos;t receive the email? Check your spam folder, or{" "}
                                <button
                                    onClick={() => {
                                        setSuccess(false);
                                        setEmail("");
                                    }}
                                    className="text-[var(--color-brand-primary)] hover:underline font-medium"
                                >
                                    try again with a different email
                                </button>
                                .
                            </p>

                            <Link href="/login">
                                <Button className="w-full h-12 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl font-semibold text-[0.9rem] shadow-sm hover:shadow-md transition-all group">
                                    Back to Sign In
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                </Button>
                            </Link>
                        </motion.div>
                    ) : (
                        /* Form State */
                        <>
                            {/* Error Message */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mb-6 p-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20"
                                >
                                    <p className="text-sm text-[var(--color-error)]">{error}</p>
                                </motion.div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-sm font-medium text-[var(--color-text-primary)]">
                                        Email
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl font-semibold text-[0.9rem] shadow-sm hover:shadow-md transition-all group"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Send Reset Link
                                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </>
                    )}

                    <Separator className="my-8" />

                    <p className="text-center text-sm text-[var(--color-text-secondary)]">
                        Remember your password?{" "}
                        <Link
                            href="/login"
                            className="text-[var(--color-brand-primary)] font-medium hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>

            {/* Right side — Premium visual panel */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12 bg-[var(--color-brand-dark)]">
                {/* Background decorations */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-20 blur-3xl" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-[radial-gradient(ellipse,_#00D4FF_0%,_transparent_70%)] opacity-10 blur-3xl" />

                <div className="relative z-10 max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold text-white tracking-[-0.025em] leading-tight mb-3">
                            Don&apos;t worry, it happens to the best of us.
                        </h2>
                        <p className="text-white/40 text-sm leading-relaxed mb-10">
                            You&apos;ll be back to your dashboard in no time. Here&apos;s what&apos;s waiting for you.
                        </p>

                        {/* Security info cards */}
                        <div className="space-y-3">
                            {[
                                { icon: Mail, label: "Reset link sent to your inbox", value: "Instant", color: "text-[var(--color-brand-primary)]" },
                                { icon: Shield, label: "Secure & encrypted reset", value: "AES-256", color: "text-[var(--color-success)]" },
                                { icon: Lock, label: "Link expires automatically", value: "1 hour", color: "text-[var(--color-warning)]" },
                            ].map((stat, i) => (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, x: 16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.4 + i * 0.12 }}
                                    className="flex items-center justify-between px-5 py-4 rounded-xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center">
                                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                        </div>
                                        <span className="text-[0.84rem] text-white/50">{stat.label}</span>
                                    </div>
                                    <span className={`text-lg font-bold ${stat.color} tracking-tight`}>{stat.value}</span>
                                </motion.div>
                            ))}
                        </div>

                        <p className="text-white/20 text-xs text-center mt-8">
                            Your account and applications are safe & secure
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
