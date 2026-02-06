"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Home,
    Settings,
    LogOut,
    BarChart3,
    Send,
    ScanText,
    Globe,
} from "lucide-react";
import { useAuth } from "@/contexts";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/applications", icon: Send, label: "Applications" },
    { href: "/resume", icon: ScanText, label: "Resume" },
    { href: "/portfolio", icon: Globe, label: "Portfolio" },
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

/* ---- Desktop Sidebar ---- */
export function Sidebar() {
    const pathname = usePathname();
    const { signOut } = useAuth();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    return (
        <>
            {/* Desktop Floating Sidebar */}
            <div className="hidden md:flex">
                <div className="flex flex-col items-center py-3 px-2 ml-2.5 mr-0 rounded-2xl bg-[var(--color-brand-dark)] w-[60px]"
                    style={{
                        boxShadow: "0 8px 32px rgba(10,37,64,0.3), 0 0 0 1px rgba(255,255,255,0.04) inset",
                    }}
                >
                    {/* Navigation */}
                    <nav className="flex flex-col items-center gap-0.5">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onMouseEnter={() => setHoveredItem(item.href)}
                                    onMouseLeave={() => setHoveredItem(null)}
                                    className="relative flex items-center justify-center w-10 h-10 rounded-xl"
                                >
                                    {/* Active background pill */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute inset-0 rounded-xl bg-white/[0.10]"
                                            style={{
                                                boxShadow: "0 0 12px rgba(255,255,255,0.04), 0 0 0 1px rgba(255,255,255,0.06) inset",
                                            }}
                                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                        />
                                    )}

                                    {/* Active left indicator */}
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-indicator"
                                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-[var(--color-brand-primary)]"
                                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                        />
                                    )}

                                    <motion.div
                                        whileHover={{ x: 1.5 }}
                                        transition={{ duration: 0.15 }}
                                        className="relative z-10"
                                    >
                                        <item.icon
                                            className={cn(
                                                "w-[18px] h-[18px] transition-colors duration-150",
                                                isActive
                                                    ? "text-white"
                                                    : "text-white/35 group-hover:text-white/60"
                                            )}
                                            strokeWidth={isActive ? 2 : 1.5}
                                        />
                                    </motion.div>

                                    {/* Tooltip */}
                                    <AnimatePresence>
                                        {hoveredItem === item.href && (
                                            <motion.div
                                                initial={{ opacity: 0, x: -4, scale: 0.96 }}
                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                exit={{ opacity: 0, x: -4, scale: 0.96 }}
                                                transition={{ duration: 0.12 }}
                                                className="absolute left-full ml-3 px-2.5 py-1.5 rounded-lg bg-[var(--color-brand-dark)] text-white text-[11px] font-medium whitespace-nowrap shadow-xl z-50"
                                                style={{
                                                    boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset",
                                                }}
                                            >
                                                {item.label}
                                                {/* Arrow */}
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--color-brand-dark)]" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Separator */}
                    <div className="w-6 h-px bg-white/[0.08] mb-2 mt-1" />

                    {/* Sign Out */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => signOut()}
                            onMouseEnter={() => setHoveredItem("signout")}
                            onMouseLeave={() => setHoveredItem(null)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors duration-150"
                        >
                            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
                        </motion.button>

                        <AnimatePresence>
                            {hoveredItem === "signout" && (
                                <motion.div
                                    initial={{ opacity: 0, x: -4, scale: 0.96 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -4, scale: 0.96 }}
                                    transition={{ duration: 0.12 }}
                                    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-[var(--color-brand-dark)] text-white text-[11px] font-medium whitespace-nowrap shadow-xl z-50"
                                    style={{
                                        boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.08) inset",
                                    }}
                                >
                                    Sign Out
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--color-brand-dark)]" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Dock */}
            <MobileBottomDock />
        </>
    );
}

/* ---- Mobile Bottom Navigation Dock ---- */
function MobileBottomDock() {
    const pathname = usePathname();

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* Glass background */}
            <div
                className="mx-3 mb-3 px-2 py-1.5 rounded-2xl bg-[var(--color-brand-dark)]/95 backdrop-blur-xl flex items-center justify-around"
                style={{
                    boxShadow: "0 -4px 32px rgba(10,37,64,0.25), 0 0 0 1px rgba(255,255,255,0.06) inset",
                }}
            >
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="mobile-active"
                                    className="absolute inset-0 rounded-xl bg-white/[0.10]"
                                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                />
                            )}
                            <item.icon
                                className={cn(
                                    "w-[18px] h-[18px] relative z-10 transition-colors duration-150",
                                    isActive ? "text-white" : "text-white/35"
                                )}
                                strokeWidth={isActive ? 2 : 1.5}
                            />
                            <span
                                className={cn(
                                    "text-[9px] font-medium relative z-10 transition-colors duration-150",
                                    isActive ? "text-white" : "text-white/30"
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
