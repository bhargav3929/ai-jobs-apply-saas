"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Clock, Mail, CheckCircle2, Zap, Send } from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";

/* ---------- Animated word rotator ---------- */
const rotatingWords = ["while you sleep", "on autopilot", "every single month", "effortlessly"];

function RotatingText() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex((i) => (i + 1) % rotatingWords.length), 2800);
        return () => clearInterval(id);
    }, []);

    return (
        <span className="relative inline-block min-h-[1.2em] align-bottom">
            {rotatingWords.map((word, i) => (
                <motion.span
                    key={word}
                    className="text-gradient"
                    initial={false}
                    animate={{
                        opacity: i === index ? 1 : 0,
                        y: i === index ? 0 : 20,
                        position: i === index ? "relative" as const : "absolute" as const,
                    }}
                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                    style={{ left: 0 }}
                >
                    {word}
                </motion.span>
            ))}
        </span>
    );
}

/* ---------- Scramble text effect for stats ---------- */
function ScrambleNumber({ target, suffix }: { target: number; suffix: string }) {
    const [display, setDisplay] = useState("0");
    const ref = useRef<HTMLSpanElement>(null);
    const started = useRef(false);

    const animate = useCallback(() => {
        if (started.current) return;
        started.current = true;
        const chars = "0123456789";
        const duration = 1400;
        const startTime = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            if (p < 1) {
                const current = Math.round(eased * target);
                // Mix in some random chars for scramble effect
                const str = current.toLocaleString();
                if (p < 0.7) {
                    const scrambled = str
                        .split("")
                        .map((c) => (c === "," ? "," : Math.random() > 0.5 ? chars[Math.floor(Math.random() * 10)] : c))
                        .join("");
                    setDisplay(scrambled);
                } else {
                    setDisplay(str);
                }
                requestAnimationFrame(tick);
            } else {
                setDisplay(target.toLocaleString());
            }
        };
        requestAnimationFrame(tick);
    }, [target]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) animate(); }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [animate]);

    return (
        <span ref={ref} className="tabular-nums">
            {display}{suffix}
        </span>
    );
}

/* ---------- Floating notification cards ---------- */
const notifications = [
    { icon: CheckCircle2, text: "18 applications sent this morning", color: "text-[var(--color-success)]", delay: 0.8 },
    { icon: Send, text: "98% landed in Primary inbox", color: "text-[var(--color-brand-primary)]", delay: 1.6 },
    { icon: Mail, text: "\"Let's schedule an interview...\"", color: "text-[var(--color-warning)]", delay: 2.4 },
];

/* ---------- Mouse-follow parallax container ---------- */
function ParallaxCard({ children, className }: { children: React.ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 20 });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 20 });

    function handleMouse(e: React.MouseEvent) {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
    }

    function handleLeave() {
        x.set(0);
        y.set(0);
    }

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouse}
            onMouseLeave={handleLeave}
            style={{ rotateX, rotateY, transformPerspective: 800 }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

/* ---------- Hero ---------- */
export function Hero() {
    return (
        <section className="relative overflow-hidden min-h-[calc(100vh-72px)]">
            {/* Background layers */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-dot-pattern opacity-30" />
                <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] bg-[radial-gradient(ellipse_at_center,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.06] blur-3xl" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_#00D4FF_0%,_transparent_70%)] opacity-[0.05] blur-3xl" />
                <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_center,_#3ECF8E_0%,_transparent_70%)] opacity-[0.04] blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 py-16 md:py-24 lg:py-28">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    {/* LEFT — Copy */}
                    <div className="lg:col-span-6 xl:col-span-5">
                        {/* Badge */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-[var(--color-border-subtle)] shadow-card mb-8"
                        >
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--color-success)]" />
                            </span>
                            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                                2,000+ interviews landed this month
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <motion.h1
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="text-[2.5rem] md:text-[3.25rem] lg:text-[3.5rem] xl:text-[4rem] font-bold text-[var(--color-brand-dark)] tracking-[-0.035em] leading-[1.1] mb-6"
                        >
                            600 job applications{" "}
                            <RotatingText />
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-md leading-[1.7] mb-8"
                        >
                            Your AI agent sends{" "}
                            <span className="font-semibold text-[var(--color-text-primary)]">personalized emails from your Gmail</span>{" "}
                            to recruiters who just posted jobs — so you wake up to interview invites, not job boards.
                        </motion.p>

                        {/* CTA */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                            className="flex flex-col sm:flex-row gap-3 mb-10"
                        >
                            <Link href="/signup">
                                <Button
                                    size="lg"
                                    className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl px-7 py-6 text-[0.95rem] font-semibold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 group"
                                >
                                    Start Free — 7 Day Trial
                                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                </Button>
                            </Link>
                            <Link href="#how-it-works">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="rounded-xl px-7 py-6 text-[0.95rem] border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]/40 hover:bg-[var(--color-brand-light)] bg-white/60 backdrop-blur-sm font-medium"
                                >
                                    See how it works
                                </Button>
                            </Link>
                        </motion.div>

                        {/* Trust row */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="flex flex-wrap gap-x-6 gap-y-2 text-[0.8rem] text-[var(--color-text-tertiary)]"
                        >
                            {[
                                { icon: Shield, text: "Sent from your Gmail", color: "text-[var(--color-success)]" },
                                { icon: Clock, text: "Setup in 3 minutes", color: "text-[var(--color-brand-primary)]" },
                                { icon: Mail, text: "Lands in Primary inbox", color: "text-[var(--color-warning)]" },
                            ].map((t) => (
                                <div key={t.text} className="flex items-center gap-1.5">
                                    <t.icon className={`w-3.5 h-3.5 ${t.color}`} />
                                    <span>{t.text}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* RIGHT — Visual */}
                    <div className="lg:col-span-6 xl:col-span-7 relative">
                        <motion.div
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Glow */}
                            <div className="absolute -inset-8 bg-gradient-to-tr from-[var(--color-brand-primary)]/8 via-transparent to-cyan-400/8 rounded-[2rem] blur-2xl" />

                            <ParallaxCard className="relative">
                                {/* Dashboard-style card */}
                                <div className="relative bg-white rounded-2xl border border-[var(--color-border-subtle)] shadow-lift overflow-hidden">
                                    {/* Top bar */}
                                    <div className="flex items-center justify-between px-5 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border-subtle)]">
                                        <div className="flex items-center gap-3">
                                            <div className="flex gap-1.5">
                                                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                                                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                                                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                                            </div>
                                            <div className="h-6 w-px bg-[var(--color-border-subtle)]" />
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 rounded bg-[var(--color-brand-primary)] flex items-center justify-center">
                                                    <Zap className="w-2.5 h-2.5 text-white" />
                                                </div>
                                                <span className="text-xs font-semibold text-[var(--color-brand-dark)]">JobAgent.ai</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="px-2.5 py-1 rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)] text-[10px] font-bold uppercase tracking-wider">Live</div>
                                        </div>
                                    </div>

                                    {/* Stats row */}
                                    <div className="grid grid-cols-3 gap-px bg-[var(--color-border-subtle)]">
                                        {[
                                            { label: "Sent this month", value: 547, suffix: "", color: "text-[var(--color-brand-primary)]" },
                                            { label: "Delivered", value: 98, suffix: "%", color: "text-[var(--color-success)]" },
                                            { label: "Interviews", value: 12, suffix: "", color: "text-[var(--color-warning)]" },
                                        ].map((stat) => (
                                            <div key={stat.label} className="bg-white px-5 py-4">
                                                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-1">{stat.label}</p>
                                                <p className={`text-2xl font-bold ${stat.color} tracking-tight`}>
                                                    <ScrambleNumber target={stat.value} suffix={stat.suffix} />
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recent activity */}
                                    <div className="p-5">
                                        <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] font-medium mb-3">Recent Activity</p>
                                        <div className="space-y-2.5">
                                            {[
                                                { company: "TechCorp", role: "Senior React Dev", time: "2m ago", status: "Delivered" },
                                                { company: "DataFlow", role: "Full Stack Eng", time: "8m ago", status: "Opened" },
                                                { company: "CloudBase", role: "Frontend Lead", time: "14m ago", status: "Replied" },
                                            ].map((item, i) => (
                                                <motion.div
                                                    key={item.company}
                                                    initial={{ opacity: 0, x: 12 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.8 + i * 0.15 }}
                                                    className="flex items-center justify-between py-2.5 px-3.5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border-subtle)]"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--color-brand-primary)]/10 to-cyan-400/10 flex items-center justify-center">
                                                            <span className="text-[10px] font-bold text-[var(--color-brand-primary)]">{item.company.slice(0, 2).toUpperCase()}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-medium text-[var(--color-brand-dark)]">{item.role}</p>
                                                            <p className="text-[11px] text-[var(--color-text-tertiary)]">{item.company} · {item.time}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                        item.status === "Replied"
                                                            ? "bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                                                            : item.status === "Opened"
                                                            ? "bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)]"
                                                            : "bg-[var(--color-success)]/10 text-[var(--color-success)]"
                                                    }`}>
                                                        {item.status}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </ParallaxCard>

                            {/* Floating notification cards */}
                            {notifications.map((n, i) => (
                                <motion.div
                                    key={n.text}
                                    initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30, y: 10 }}
                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                    transition={{ delay: n.delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                    className={`absolute ${
                                        i === 0
                                            ? "-left-4 top-[15%] lg:-left-12"
                                            : i === 1
                                            ? "-right-2 top-[45%] lg:-right-8"
                                            : "-left-2 bottom-[10%] lg:-left-8"
                                    } bg-white/95 backdrop-blur-md rounded-xl border border-[var(--color-border-subtle)] shadow-card px-4 py-3 flex items-center gap-2.5 max-w-[220px]`}
                                >
                                    <n.icon className={`w-4 h-4 flex-shrink-0 ${n.color}`} />
                                    <span className="text-[11px] font-medium text-[var(--color-text-secondary)] leading-tight">{n.text}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
