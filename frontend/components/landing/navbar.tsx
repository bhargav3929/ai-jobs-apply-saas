"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, Menu, X, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
    { label: "Home", href: "#" },
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
];

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeSection, setActiveSection] = useState<string>("#");

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);

            // Track active section
            const sections = ["faq", "pricing", "how-it-works", "features"];
            let found = false;
            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    if (rect.top <= 120) {
                        setActiveSection(`#${id}`);
                        found = true;
                        break;
                    }
                }
            }
            if (!found) setActiveSection("#");
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                    ? "bg-white/85 backdrop-blur-2xl border-b border-[var(--color-border-subtle)]/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
                    : "bg-transparent"
                }`}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-[72px]">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-2.5 group relative">
                            <div className="relative">
                                <div className="absolute inset-0 bg-[var(--color-brand-primary)] rounded-lg blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300" />
                                <div className="relative p-1.5 rounded-lg bg-[var(--color-brand-primary)]">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                            </div>
                            <span className="text-lg font-bold text-[var(--color-brand-dark)] tracking-tight">
                                JobAgent<span className="text-[var(--color-brand-primary)]">.ai</span>
                            </span>
                        </Link>

                        {/* Desktop Nav — pill-style indicator */}
                        <div className="hidden md:flex items-center">
                            <div className="flex items-center gap-0.5 p-1 rounded-full bg-[var(--color-surface)]/80 border border-[var(--color-border-subtle)]/50 backdrop-blur-sm">
                                {navLinks.map((link) => {
                                    const isActive = activeSection === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            className={`relative px-4 py-1.5 text-[13px] font-medium rounded-full transition-all duration-200 ${
                                                isActive
                                                    ? "text-[var(--color-brand-dark)]"
                                                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-brand-dark)]"
                                            }`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="nav-pill"
                                                    className="absolute inset-0 bg-white rounded-full shadow-sm border border-[var(--color-border-subtle)]/40"
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                            <span className="relative z-10">{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Desktop Auth */}
                        <div className="hidden md:flex items-center gap-2">
                            <Link href="/login">
                                <Button
                                    variant="outline"
                                    className="text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-brand-dark)] border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]/30 hover:bg-[var(--color-brand-light)]/50 rounded-full px-5 h-9 transition-all duration-200"
                                >
                                    Log in
                                </Button>
                            </Link>
                            <Link href="/signup">
                                <Button className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-full px-5 h-9 text-[13px] font-semibold shadow-sm hover:shadow-md transition-all duration-200 group">
                                    Get Started
                                    <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                                </Button>
                            </Link>
                        </div>

                        {/* Mobile Hamburger */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                            aria-label="Toggle menu"
                        >
                            <AnimatePresence mode="wait">
                                {mobileOpen ? (
                                    <motion.div
                                        key="close"
                                        initial={{ opacity: 0, rotate: -90 }}
                                        animate={{ opacity: 1, rotate: 0 }}
                                        exit={{ opacity: 0, rotate: 90 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="menu"
                                        initial={{ opacity: 0, rotate: 90 }}
                                        animate={{ opacity: 1, rotate: 0 }}
                                        exit={{ opacity: 0, rotate: -90 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <Menu className="w-5 h-5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="fixed inset-0 z-40 bg-white/95 backdrop-blur-2xl md:hidden"
                    >
                        <div className="pt-24 px-6 flex flex-col gap-1">
                            {navLinks.map((link, i) => (
                                <motion.div
                                    key={link.href}
                                    initial={{ opacity: 0, x: -16 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                >
                                    <Link
                                        href={link.href}
                                        onClick={() => setMobileOpen(false)}
                                        className="flex items-center justify-between px-4 py-4 text-[15px] font-medium text-[var(--color-text-primary)] rounded-xl hover:bg-[var(--color-surface)] transition-colors group"
                                    >
                                        {link.label}
                                        <ArrowRight className="w-4 h-4 text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </Link>
                                </motion.div>
                            ))}
                            <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-border-subtle)] to-transparent my-4" />
                            <Link href="/login" onClick={() => setMobileOpen(false)}>
                                <Button variant="outline" className="w-full rounded-xl py-5 text-[15px] font-medium border-[var(--color-border-subtle)]">
                                    Log in
                                </Button>
                            </Link>
                            <Link href="/signup" onClick={() => setMobileOpen(false)}>
                                <Button className="w-full bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl py-5 text-[15px] font-semibold mt-2">
                                    Get Started Free
                                    <ArrowRight className="w-4 h-4 ml-1.5" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
