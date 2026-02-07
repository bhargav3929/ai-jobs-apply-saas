"use client";

import { useAuth } from "@/contexts";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar, Header } from "@/components/dashboard";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function DashboardLayout({
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
            } else if (userProfile && !userProfile.onboardingCompleted) {
                router.push("/onboarding");
            }
        }
    }, [user, userProfile, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface)]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-brand-primary)]" />
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="flex h-screen bg-[var(--color-surface)]">
            {/* Logo — fixed top-left, desktop only */}
            <Link
                href="/dashboard"
                className="hidden md:flex items-center fixed top-3 left-2.5 z-50 bg-white rounded-xl border border-[var(--color-border-subtle)] shadow-[0_1px_4px_rgba(0,0,0,0.04)] px-3 py-2"
            >
                <span className="text-[14px] font-bold text-[var(--color-brand-dark)] tracking-tight">
                    JobAgent<span className="text-[var(--color-brand-primary)]">.ai</span>
                </span>
            </Link>

            {/* Floating sidebar — below logo, aligned with avatar banner */}
            <div className="hidden md:flex fixed left-0 top-[80px] lg:top-[88px] xl:top-[96px] z-50">
                <Sidebar />
            </div>

            {/* Main Content — offset for sidebar (60px sidebar + 10px margin left + 10px gap) */}
            <div className="relative flex-1 md:pl-[70px] h-full overflow-y-auto pb-20 md:pb-0">
                <Header />
                <main className="md:max-w-[90%] md:mx-auto">
                    {children}
                </main>
            </div>

            {/* Mobile dock (rendered by Sidebar component) */}
            <div className="md:hidden">
                <Sidebar />
            </div>
        </div>
    );
}
