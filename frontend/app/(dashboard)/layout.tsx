"use client";

import { useAuth } from "@/contexts";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar, Header } from "@/components/dashboard";
import { Loader2 } from "lucide-react";

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
            {/* Slim icon sidebar */}
            <div className="hidden md:flex h-full flex-col fixed inset-y-0 z-50">
                <Sidebar />
            </div>

            {/* Main Content */}
            <div className="relative flex-1 md:pl-[72px] h-full overflow-y-auto">
                <Header />
                <main>
                    {children}
                </main>
            </div>
        </div>
    );
}
