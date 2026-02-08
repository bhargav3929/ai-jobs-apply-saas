"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Zap, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { signIn } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await signIn(email, password);
            router.push("/dashboard");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to sign in";
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

                    {/* Header */}
                    <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-[-0.02em] mb-2">
                        Welcome back
                    </h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-8">
                        Sign in to check your applications and interview invites.
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

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium text-[var(--color-text-primary)]">
                                    Password
                                </Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs text-[var(--color-brand-primary)] hover:underline font-medium"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                <PasswordInput
                                    id="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                    Sign In
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                </>
                            )}
                        </Button>
                    </form>

                    <Separator className="my-8" />

                    <p className="text-center text-sm text-[var(--color-text-secondary)]">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/signup"
                            className="text-[var(--color-brand-primary)] font-medium hover:underline"
                        >
                            Sign up for free
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
                            Your AI agent has been busy.
                        </h2>
                        <p className="text-white/40 text-sm leading-relaxed mb-10">
                            Check your dashboard to see how many applications went out and who replied.
                        </p>

                        {/* Fake dashboard preview */}
                        <div className="space-y-3">
                            {[
                                { icon: Send, label: "Applications this month", value: "547", color: "text-[var(--color-brand-primary)]" },
                                { icon: CheckCircle2, label: "Delivered to Primary inbox", value: "98%", color: "text-[var(--color-success)]" },
                                { icon: Sparkles, label: "Interview invites received", value: "12", color: "text-[var(--color-warning)]" },
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
                            180,000+ applications sent by JobAgent users so far
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
