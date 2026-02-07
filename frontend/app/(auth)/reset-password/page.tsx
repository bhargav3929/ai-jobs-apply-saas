"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Zap, Lock, ArrowRight, Loader2, CheckCircle2, Shield, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const oobCode = searchParams.get("oobCode");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(true);
    const [verified, setVerified] = useState(false);
    const [success, setSuccess] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const { verifyResetCode, confirmReset } = useAuth();

    useEffect(() => {
        const verify = async () => {
            if (!oobCode) {
                setError("Invalid or missing reset link. Please request a new one.");
                setVerifying(false);
                return;
            }

            try {
                const email = await verifyResetCode(oobCode);
                setUserEmail(email);
                setVerified(true);
            } catch {
                setError("This reset link has expired or already been used. Please request a new one.");
            } finally {
                setVerifying(false);
            }
        };

        verify();
    }, [oobCode, verifyResetCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            await confirmReset(oobCode!, password);
            setSuccess(true);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
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

                    {verifying ? (
                        /* Verifying State */
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)] mb-4" />
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                Verifying your reset link...
                            </p>
                        </div>
                    ) : success ? (
                        /* Success State */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-[-0.02em] mb-2">
                                Password reset successful
                            </h1>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-8">
                                Your password has been changed. You can now sign in with your new password.
                            </p>

                            <div className="p-5 rounded-xl bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 mb-8">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-[var(--color-brand-dark)] mb-1">
                                            All set!
                                        </p>
                                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                            Your password for{" "}
                                            <span className="font-medium text-[var(--color-brand-dark)]">{userEmail}</span>{" "}
                                            has been updated successfully.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link href="/login">
                                <Button className="w-full h-12 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl font-semibold text-[0.9rem] shadow-sm hover:shadow-md transition-all group">
                                    Sign In with New Password
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                </Button>
                            </Link>
                        </motion.div>
                    ) : !verified ? (
                        /* Error / Invalid Link State */
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-[-0.02em] mb-2">
                                Invalid reset link
                            </h1>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                                {error}
                            </p>

                            <div className="p-4 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 mb-8">
                                <p className="text-sm text-[var(--color-error)]">
                                    Reset links expire after 1 hour for security. Please request a new link.
                                </p>
                            </div>

                            <Link href="/forgot-password">
                                <Button className="w-full h-12 bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl font-semibold text-[0.9rem] shadow-sm hover:shadow-md transition-all group">
                                    Request New Reset Link
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                </Button>
                            </Link>
                        </motion.div>
                    ) : (
                        /* Form State */
                        <>
                            <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-[-0.02em] mb-2">
                                Set your new password
                            </h1>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-8">
                                Enter a new password for{" "}
                                <span className="font-medium text-[var(--color-brand-dark)]">{userEmail}</span>
                            </p>

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

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-medium text-[var(--color-text-primary)]">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Minimum 6 characters"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm font-medium text-[var(--color-text-primary)]">
                                        Confirm New Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Re-enter your password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]"
                                            required
                                            minLength={6}
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
                                            Reset Password
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
                            Almost there. Just pick a new password.
                        </h2>
                        <p className="text-white/40 text-sm leading-relaxed mb-10">
                            Your account is secure. Set a strong password and you&apos;ll be back to your dashboard.
                        </p>

                        {/* Security info cards */}
                        <div className="space-y-3">
                            {[
                                { icon: KeyRound, label: "Minimum 6 characters", value: "Required", color: "text-[var(--color-brand-primary)]" },
                                { icon: Shield, label: "Encrypted & secure", value: "AES-256", color: "text-[var(--color-success)]" },
                                { icon: CheckCircle2, label: "Instant activation", value: "0 sec", color: "text-[var(--color-warning)]" },
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

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    );
}
