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
import { Zap, Mail, Lock, User, ArrowRight, Loader2, Shield, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts";

const benefits = [
    { text: "600+ personalized applications every month", icon: Send },
    { text: "AI writes unique emails — zero templates", icon: Sparkles },
    { text: "Sent from your own Gmail inbox", icon: Mail },
    { text: "98% land in Primary, not Spam", icon: Shield },
];

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { signUp } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, name);
            router.push("/onboarding");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create account";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left side — Premium visual panel */}
            <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12 bg-[var(--color-brand-dark)]">
                {/* Background decorations */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-[radial-gradient(ellipse,_#00D4FF_0%,_transparent_70%)] opacity-10 blur-3xl" />

                <div className="relative z-10 max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl font-bold text-white tracking-[-0.025em] leading-tight mb-3">
                            600+ applications a month.<br />Zero effort from you.
                        </h2>
                        <p className="text-white/40 text-sm leading-relaxed mb-10">
                            Set up once in 3 minutes. Your AI agent handles the rest — every single morning.
                        </p>

                        <ul className="space-y-4 mb-10">
                            {benefits.map((benefit, i) => (
                                <motion.li
                                    key={benefit.text}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                    className="flex items-center gap-3"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/15 flex items-center justify-center">
                                        <benefit.icon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                    </div>
                                    <span className="text-[0.875rem] text-white/70">{benefit.text}</span>
                                </motion.li>
                            ))}
                        </ul>

                        {/* Testimonial card */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="p-5 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm"
                        >
                            <p className="text-[0.875rem] text-white/70 leading-[1.7] mb-4">
                                &ldquo;600+ applications went out in my first month. I got 8 interview calls without writing a single email.&rdquo;
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                    <span className="text-white text-[10px] font-bold">PS</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white/90">Priya Sharma</p>
                                    <p className="text-[11px] text-white/35">Frontend Developer · Landed role at Razorpay</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Right side — Form */}
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
                        Create your account
                    </h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-8">
                        Start your 7-day free trial. No credit card required.
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
                            <Label htmlFor="name" className="text-sm font-medium text-[var(--color-text-primary)]">
                                Full Name
                            </Label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]"
                                    required
                                />
                            </div>
                        </div>

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
                            <Label htmlFor="password" className="text-sm font-medium text-[var(--color-text-primary)]">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                <PasswordInput
                                    id="password"
                                    placeholder="Minimum 6 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
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
                                    Create Account
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                </>
                            )}
                        </Button>

                        <p className="text-xs text-[var(--color-text-tertiary)] text-center leading-relaxed">
                            By signing up, you agree to our{" "}
                            <Link href="/terms" className="underline hover:text-[var(--color-brand-primary)]">
                                Terms of Service
                            </Link>{" "}
                            and{" "}
                            <Link href="/privacy" className="underline hover:text-[var(--color-brand-primary)]">
                                Privacy Policy
                            </Link>
                        </p>
                    </form>

                    <Separator className="my-8" />

                    <p className="text-center text-sm text-[var(--color-text-secondary)]">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="text-[var(--color-brand-primary)] font-medium hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
