"use client";

import { Search, Sparkles, Mail, Upload, Settings, Send, Shield, Clock, Zap, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/* ================================================================
   FEATURES — Bento Grid Layout
   ================================================================ */

export function Features() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });

    return (
        <>
            {/* ===== Features — Bento Grid ===== */}
            <section id="features" className="py-28 bg-white relative overflow-hidden">
                {/* Background accents */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.03] blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_#00D4FF_0%,_transparent_70%)] opacity-[0.03] blur-3xl" />

                <div className="max-w-7xl mx-auto px-6 relative" ref={ref}>
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-16"
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                                Features
                            </p>
                            <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                        </div>
                        <h2 className="text-3xl md:text-[2.75rem] font-bold text-[var(--color-brand-dark)] tracking-[-0.03em] leading-[1.1] mb-4">
                            Your entire job search,<br className="hidden md:block" /> running on autopilot
                        </h2>
                        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto leading-relaxed">
                            Three AI systems that find, personalize, and deliver 600+ applications every month — from your own inbox.
                        </p>
                    </motion.div>

                    {/* ---- Bento Grid ---- */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                        {/* Card 1 — Large: Smart Job Discovery (spans 7 cols) */}
                        <motion.div
                            initial={{ opacity: 0, y: 28 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="md:col-span-7 group"
                        >
                            <div className="relative h-full bg-[var(--color-brand-dark)] rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                                {/* Background grid */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
                                <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-20 blur-3xl" />

                                <div className="relative z-10 p-8 md:p-10 flex flex-col h-full">
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-[var(--color-brand-primary)]/20 flex items-center justify-center">
                                            <Search className="w-6 h-6 text-[var(--color-brand-primary)]" />
                                        </div>
                                        <div className="px-2.5 py-1 rounded-md bg-[var(--color-success)]/15 text-[var(--color-success)] text-[10px] font-bold uppercase tracking-wider">
                                            Live
                                        </div>
                                    </div>

                                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-[-0.02em] mb-3">
                                        Smart Job Discovery
                                    </h3>
                                    <p className="text-sm text-white/50 leading-[1.7] mb-8 max-w-md">
                                        Every day, our AI scans 2,400+ LinkedIn posts and extracts jobs with direct recruiter emails. That's 72,000+ jobs analyzed every month — so you never miss an opportunity.
                                    </p>

                                    {/* Embedded live feed visual */}
                                    <div className="mt-auto space-y-2">
                                        {[
                                            { company: "TechCorp", role: "Senior React Developer", tag: "Software Dev", time: "2m", color: "bg-[var(--color-brand-primary)]" },
                                            { company: "DataFlow AI", role: "ML Engineer", tag: "AI/ML", time: "5m", color: "bg-cyan-500" },
                                            { company: "GrowthLabs", role: "Marketing Manager", tag: "Marketing", time: "8m", color: "bg-[var(--color-warning)]" },
                                        ].map((job, i) => (
                                            <motion.div
                                                key={job.company}
                                                initial={{ opacity: 0, x: -16 }}
                                                animate={inView ? { opacity: 1, x: 0 } : {}}
                                                transition={{ delay: 0.4 + i * 0.12, duration: 0.5 }}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-sm group/row hover:bg-white/[0.1] transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                                                        <span className="text-[10px] font-bold text-white/60">{job.company.slice(0, 2)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-medium text-white/90">{job.role}</p>
                                                        <p className="text-[11px] text-white/35">{job.company} · {job.time} ago</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold text-white ${job.color} uppercase tracking-wider`}>
                                                        {job.tag}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Stat */}
                                    <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/[0.06]">
                                        <div>
                                            <p className="text-2xl font-bold text-white tracking-tight">72,000+</p>
                                            <p className="text-[11px] text-white/35 font-medium">Jobs scanned monthly</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div>
                                            <p className="text-2xl font-bold text-white tracking-tight">7</p>
                                            <p className="text-[11px] text-white/35 font-medium">Job categories</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/10" />
                                        <div>
                                            <p className="text-2xl font-bold text-[var(--color-success)] tracking-tight">Real-time</p>
                                            <p className="text-[11px] text-white/35 font-medium">New jobs every hour</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right column — stacked cards (spans 5 cols) */}
                        <div className="md:col-span-5 flex flex-col gap-4">
                            {/* Card 2 — AI Personalization */}
                            <motion.div
                                initial={{ opacity: 0, y: 28 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                className="group flex-1"
                            >
                                <div className="relative h-full bg-gradient-to-br from-[var(--color-brand-primary)]/[0.04] to-cyan-400/[0.04] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                                    <div className="p-7">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--color-brand-primary)]/10 to-cyan-400/10 flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--color-brand-primary)]/[0.08]">
                                                <Zap className="w-3 h-3 text-[var(--color-brand-primary)]" />
                                                <span className="text-[10px] font-bold text-[var(--color-brand-primary)] uppercase tracking-wider">AI</span>
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-semibold text-[var(--color-brand-dark)] tracking-[-0.01em] mb-2">
                                            AI-Powered Personalization
                                        </h3>
                                        <p className="text-[0.84rem] text-[var(--color-text-secondary)] leading-[1.65] mb-5">
                                            Zero templates. Each of your 600+ monthly emails is written from scratch — matching your skills to the exact job description. 98% unique content rate.
                                        </p>

                                        {/* Mini visual: before/after comparison */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-red-400 mb-2">Generic</p>
                                                <div className="space-y-1.5">
                                                    <div className="h-1 bg-red-200/60 rounded-full w-full" />
                                                    <div className="h-1 bg-red-200/40 rounded-full w-3/4" />
                                                    <div className="h-1 bg-red-200/30 rounded-full w-1/2" />
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-xl bg-[var(--color-brand-primary)]/[0.04] border border-[var(--color-brand-primary)]/10">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-brand-primary)] mb-2">JobAgent</p>
                                                <div className="space-y-1.5">
                                                    <div className="h-1 bg-[var(--color-brand-primary)]/30 rounded-full w-full" />
                                                    <div className="h-1 bg-[var(--color-brand-primary)]/25 rounded-full w-[90%]" />
                                                    <div className="h-1 bg-[var(--color-brand-primary)]/20 rounded-full w-[85%]" />
                                                </div>
                                                <div className="mt-2 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
                                                    <span className="text-[8px] font-bold text-[var(--color-success)]">98% unique</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Card 3 — Sent From Your Email */}
                            <motion.div
                                initial={{ opacity: 0, y: 28 }}
                                animate={inView ? { opacity: 1, y: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                className="group flex-1"
                            >
                                <div className="relative h-full bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                                    <div className="p-7">
                                        <div className="flex items-start justify-between mb-5">
                                            <div className="w-11 h-11 rounded-xl bg-[var(--color-success)]/10 flex items-center justify-center">
                                                <Mail className="w-5 h-5 text-[var(--color-success)]" />
                                            </div>
                                        </div>

                                        <h3 className="text-lg font-semibold text-[var(--color-brand-dark)] tracking-[-0.01em] mb-2">
                                            Sent From Your Email
                                        </h3>
                                        <p className="text-[0.84rem] text-[var(--color-text-secondary)] leading-[1.65] mb-5">
                                            Every email leaves from your Gmail and lands in the recruiter's Primary inbox. No middleman — replies come straight to you.
                                        </p>

                                        {/* Visual: delivery path */}
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                                                <div className="w-6 h-6 rounded-md bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                                                    <Mail className="w-3 h-3 text-[var(--color-brand-primary)]" />
                                                </div>
                                                <span className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate">you@gmail.com</span>
                                            </div>
                                            <div className="flex items-center gap-0.5">
                                                <div className="w-1 h-1 rounded-full bg-[var(--color-success)]" />
                                                <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)]" />
                                                <div className="w-2 h-2 rounded-full bg-[var(--color-success)]" />
                                                <ArrowRight className="w-3 h-3 text-[var(--color-success)]" />
                                            </div>
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--color-success)]/[0.06] border border-[var(--color-success)]/20">
                                                <div className="w-6 h-6 rounded-md bg-[var(--color-success)]/10 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
                                                </div>
                                                <span className="text-[11px] font-medium text-[var(--color-success)] truncate">Primary inbox</span>
                                            </div>
                                        </div>

                                        {/* Trust badges */}
                                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                                            <div className="flex items-center gap-1.5">
                                                <Shield className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                                                <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">AES-256 encrypted</span>
                                            </div>
                                            <div className="w-px h-3 bg-[var(--color-border-subtle)]" />
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                                                <span className="text-[10px] text-[var(--color-text-tertiary)] font-medium">Human-like timing</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== How It Works ===== */}
            <section id="how-it-works" className="py-28 bg-white relative overflow-hidden">
                {/* Background */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.03] blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,_#00D4FF_0%,_transparent_70%)] opacity-[0.03] blur-3xl" />

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    {/* Section Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5 }}
                        className="text-center mb-16"
                    >
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                                How it works
                            </p>
                            <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                        </div>
                        <h2 className="text-3xl md:text-[2.75rem] font-bold text-[var(--color-brand-dark)] tracking-[-0.03em] leading-tight mb-4">
                            3 minutes to set up.<br className="hidden md:block" /> 600+ applications every month.
                        </h2>
                        <p className="text-base md:text-lg text-[var(--color-text-secondary)] max-w-lg mx-auto leading-relaxed">
                            No forms, no job boards, no copy-pasting. Just results.
                        </p>
                    </motion.div>

                    {/* Steps — Vertical timeline on mobile, horizontal on desktop */}
                    <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                        {[
                            {
                                icon: Upload,
                                step: "01",
                                title: "Upload your resume",
                                description: "Drop your PDF. Our AI extracts your skills, experience, and links in seconds — zero forms to fill out.",
                                visual: (
                                    <div className="mt-5 space-y-2">
                                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                                            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                                                <Upload className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] text-[var(--color-text-secondary)] font-medium truncate">resume_2025.pdf</p>
                                                <div className="mt-1.5 h-1 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                                                    <div className="h-full w-full bg-[var(--color-success)] rounded-full" />
                                                </div>
                                            </div>
                                            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 px-1">
                                            {["React", "TypeScript", "Node.js", "3 yrs exp"].map((tag) => (
                                                <span key={tag} className="px-2 py-0.5 rounded-md bg-[var(--color-brand-primary)]/10 text-[9px] font-bold text-[var(--color-brand-primary)] uppercase tracking-wider">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                icon: Settings,
                                step: "02",
                                title: "Pick your role & connect Gmail",
                                description: "Select your target category, add a Gmail app password, and you're done. Under 3 minutes.",
                                visual: (
                                    <div className="mt-5 space-y-2">
                                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-brand-primary)]/[0.06] border border-[var(--color-brand-primary)]/15">
                                            <Zap className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                                            <span className="text-[11px] font-semibold text-[var(--color-brand-primary)]">Software Developer</span>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-brand-primary)] ml-auto" />
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                                            <Mail className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                            <span className="text-[11px] text-[var(--color-text-tertiary)]">you@gmail.com</span>
                                            <span className="ml-auto px-2 py-0.5 rounded-md bg-[var(--color-success)]/10 text-[9px] font-bold text-[var(--color-success)] uppercase">Connected</span>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                icon: Send,
                                step: "03",
                                title: "Wake up to interview invites",
                                description: "Every morning, 20 personalized emails go out. That's 600+ a month reaching recruiters who just posted jobs.",
                                visual: (
                                    <div className="mt-5 space-y-2">
                                        {[
                                            { company: "TechCorp", status: "Replied", statusColor: "text-[var(--color-warning)] bg-[var(--color-warning)]/10" },
                                            { company: "DataFlow", status: "Opened", statusColor: "text-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/10" },
                                            { company: "CloudBase", status: "Delivered", statusColor: "text-[var(--color-success)] bg-[var(--color-success)]/10" },
                                        ].map((item) => (
                                            <div key={item.company} className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-6 h-6 rounded-md bg-[var(--color-brand-primary)]/[0.06] flex items-center justify-center">
                                                        <span className="text-[8px] font-bold text-[var(--color-brand-primary)]">{item.company.slice(0, 2)}</span>
                                                    </div>
                                                    <span className="text-[11px] text-[var(--color-text-secondary)] font-medium">{item.company}</span>
                                                </div>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${item.statusColor}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ),
                            },
                        ].map((step, index) => (
                            <motion.div
                                key={step.title}
                                initial={{ opacity: 0, y: 28 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-60px" }}
                                transition={{ delay: index * 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="group"
                            >
                                <div className="relative h-full bg-white rounded-2xl border border-[var(--color-border-subtle)] p-7 transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                                    {/* Step number + icon row */}
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="w-11 h-11 rounded-xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center group-hover:bg-[var(--color-brand-primary)]/20 transition-colors">
                                            <step.icon className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                        </div>
                                        <span className="text-3xl font-bold text-[var(--color-brand-dark)]/[0.06] tracking-tight font-mono">
                                            {step.step}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-semibold text-[var(--color-brand-dark)] tracking-[-0.01em] mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-[0.84rem] text-[var(--color-text-secondary)] leading-[1.65]">
                                        {step.description}
                                    </p>

                                    {/* Embedded visual */}
                                    {step.visual}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
