"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
    {
        q: "How does JobAgent.ai find jobs?",
        a: "We scan thousands of LinkedIn posts every day using AI to identify hiring posts with direct recruiter email addresses. Each job is classified into categories (Software Developer, AI/ML Engineer, Marketing/Sales, Design) and matched to your profile automatically.",
    },
    {
        q: "Will recruiters know I used an AI tool?",
        a: "No. Emails are sent from your own Gmail address using your app password. The email content is unique, personalized to each job post, and reads like a hand-written application. Your resume is attached directly.",
    },
    {
        q: "Is it safe to share my Gmail app password?",
        a: "Yes. We never store your actual Gmail password. You generate a dedicated App Password from Google that only works for sending emails. It can be revoked anytime from your Google account settings. All credentials are encrypted with AES-256.",
    },
    {
        q: "How many applications are sent per month?",
        a: "Depending on your plan, 300 to 600+ personalized applications go out every month (10-20 per day). They're spaced with human-like timing throughout the morning to ensure 98% delivery to Primary inboxes.",
    },
    {
        q: "Can I choose what kind of jobs to apply to?",
        a: "Absolutely. During onboarding you pick your target category — Software Developer, AI/ML Engineer, Marketing/Sales, or Design. Our AI only sends your profile to jobs that match your selected category.",
    },
    {
        q: "What if I want to stop applications?",
        a: "Toggle automation off from your dashboard with one click. Your account stays active and you can resume anytime. You can also cancel your subscription — no lock-in, no questions asked.",
    },
    {
        q: "Do applications include my portfolio or GitHub?",
        a: "Yes, if you provide them during onboarding. We automatically extract links from your resume, or you can add them manually. The AI weaves them naturally into each application email.",
    },
];

function FaqItem({ faq, index, isOpen, toggle }: { faq: typeof faqs[0]; index: number; isOpen: boolean; toggle: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className={`border border-[var(--color-border-subtle)] rounded-xl overflow-hidden transition-colors duration-200 ${
                isOpen ? "bg-white shadow-card" : "bg-transparent hover:bg-white/60"
            }`}
        >
            <button
                onClick={toggle}
                className="w-full flex items-center justify-between px-6 py-5 text-left group"
            >
                <div className="flex items-center gap-4 pr-4">
                    <span className="text-xs font-mono text-[var(--color-text-tertiary)] tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className={`text-[0.95rem] font-medium transition-colors ${
                        isOpen ? "text-[var(--color-brand-dark)]" : "text-[var(--color-text-secondary)] group-hover:text-[var(--color-brand-dark)]"
                    }`}>
                        {faq.q}
                    </span>
                </div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
                    isOpen
                        ? "bg-[var(--color-brand-primary)] text-white rotate-0"
                        : "bg-[var(--color-surface)] text-[var(--color-text-tertiary)] group-hover:bg-[var(--color-brand-primary)]/10 group-hover:text-[var(--color-brand-primary)]"
                }`}>
                    {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                </div>
            </button>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="px-6 pb-5 pl-[3.75rem]">
                            <p className="text-[0.875rem] text-[var(--color-text-secondary)] leading-[1.7]">
                                {faq.a}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 bg-[var(--color-surface)]">
            <div className="max-w-3xl mx-auto px-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-14"
                >
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                            FAQ
                        </p>
                        <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                    </div>
                    <h2 className="text-3xl md:text-[2.5rem] font-bold text-[var(--color-brand-dark)] tracking-[-0.025em] leading-tight mb-3">
                        Got questions?
                    </h2>
                    <p className="text-base text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
                        Here's everything you need to know before your first 600 applications go out.
                    </p>
                </motion.div>

                {/* FAQ items */}
                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <FaqItem
                            key={i}
                            faq={faq}
                            index={i}
                            isOpen={openIndex === i}
                            toggle={() => setOpenIndex(openIndex === i ? null : i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
