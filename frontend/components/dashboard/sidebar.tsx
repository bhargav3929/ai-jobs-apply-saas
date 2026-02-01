"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Settings,
    LogOut,
    Zap,
    BarChart,
    FileText,
} from "lucide-react";
import { useAuth } from "@/contexts";
import { motion } from "framer-motion";

const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/applications", icon: FileText, label: "Applications" },
    { href: "/analytics", icon: BarChart, label: "Analytics" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const { signOut } = useAuth();

    return (
        <div className="flex h-full w-[72px] flex-col items-center bg-[var(--color-brand-dark)] py-5 gap-1">
            {/* Brand */}
            <Link href="/dashboard" className="mb-6 group">
                <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary)] flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.4)] transition-transform group-hover:scale-105">
                    <Zap className="w-5 h-5 text-white" />
                </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col items-center gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative group"
                        >
                            <div
                                className={cn(
                                    "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200",
                                    isActive
                                        ? "bg-white/[0.12] text-white shadow-[0_2px_8px_rgba(255,255,255,0.06)]"
                                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.06]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 rounded-xl bg-white/[0.12]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                                <item.icon className="w-[20px] h-[20px] relative z-10" />
                            </div>

                            {/* Tooltip */}
                            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[var(--color-brand-dark)] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-50">
                                {item.label}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Sign Out */}
            <button
                onClick={() => signOut()}
                className="group relative w-11 h-11 rounded-xl flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
            >
                <LogOut className="w-[20px] h-[20px]" />
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[var(--color-brand-dark)] text-white text-[11px] font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg border border-white/10 z-50">
                    Sign Out
                </div>
            </button>
        </div>
    );
}
