"use client";

import { useAuth } from "@/contexts";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Zap, UserCircle2 } from "lucide-react";
import Link from "next/link";

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, userProfile, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login");
            } else if (userProfile?.onboardingCompleted) {
                router.push("/dashboard");
            }
        }
    }, [user, userProfile, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
            {/* Background decorations */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:48px_48px]" />
                <div className="absolute top-0 right-0 w-[600px] h-[500px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.04] blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse,_#00D4FF_0%,_transparent_70%)] opacity-[0.04] blur-3xl" />
            </div>

            {/* Floating Header */}
            <header className="relative z-10 px-6 pt-5">
                <div className="max-w-4xl mx-auto flex items-center justify-between px-5 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-[var(--color-border-subtle)]/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-[var(--color-brand-primary)]">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-[var(--color-brand-dark)] tracking-tight">
                            JobAgent<span className="text-[var(--color-brand-primary)]">.ai</span>
                        </span>
                    </Link>
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                        <UserCircle2 className="w-5 h-5 text-[var(--color-text-tertiary)]" />
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 flex items-center justify-center p-6 md:p-10">
                {children}
            </main>
        </div>
    );
}
