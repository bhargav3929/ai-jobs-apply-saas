"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, Sparkles, Shield } from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const plans = [
    {
        name: "Starter",
        price: "799",
        period: "/mo",
        description: "300 applications every month",
        features: [
            "300 applications/month (10/day)",
            "1 job category",
            "AI-personalized emails",
            "Email support",
        ],
        popular: false,
        cta: "Start Free Trial",
    },
    {
        name: "Pro",
        price: "1,199",
        period: "/mo",
        description: "600+ applications every month",
        features: [
            "600+ applications/month (20/day)",
            "3 job categories",
            "Advanced AI personalization",
            "Priority support",
            "Application analytics",
            "Portfolio & GitHub links",
        ],
        popular: true,
        cta: "Start Pro Trial",
    },
    {
        name: "Enterprise",
        price: "2,499",
        period: "/mo",
        description: "Unlimited applications, zero limits",
        features: [
            "Unlimited applications/month",
            "All job categories",
            "Custom email templates",
            "Dedicated account manager",
            "API access",
            "White-label options",
        ],
        popular: false,
        cta: "Contact Sales",
    },
];

export function Pricing() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });

    return (
        <section id="pricing" className="py-24 bg-[var(--color-surface)] relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.03] blur-3xl" />

            <div className="max-w-7xl mx-auto px-6 relative">
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
                            Pricing
                        </p>
                        <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                    </div>
                    <h2 className="text-3xl md:text-[2.5rem] font-bold text-[var(--color-brand-dark)] tracking-[-0.025em] leading-tight mb-4">
                        Less than ₹2 per application
                    </h2>
                    <p className="text-base text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
                        One subscription. Hundreds of personalized applications. No hidden fees, cancel anytime.
                    </p>
                </motion.div>

                {/* Cards */}
                <div ref={ref} className="grid md:grid-cols-3 gap-5 lg:gap-6 max-w-5xl mx-auto items-start">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 28 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: index * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className={`relative ${plan.popular ? "md:-mt-4" : ""}`}
                        >
                            <div
                                className={`relative rounded-2xl overflow-hidden h-full flex flex-col ${plan.popular
                                    ? "bg-[var(--color-brand-dark)] text-white ring-1 ring-[var(--color-brand-primary)]/50"
                                    : "bg-white border border-[var(--color-border-subtle)]"
                                } transition-all duration-300 hover:-translate-y-1 hover:shadow-lift`}
                            >
                                {/* Top accent for popular */}
                                {plan.popular && (
                                    <div className="h-[3px] w-full bg-gradient-to-r from-[var(--color-brand-primary)] to-cyan-400" />
                                )}

                                {/* Badge */}
                                {plan.popular && (
                                    <div className="absolute top-5 right-5">
                                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--color-brand-primary)]/20 text-[var(--color-brand-primary)] text-[10px] font-bold uppercase tracking-wider">
                                            <Sparkles className="w-3 h-3" />
                                            Popular
                                        </div>
                                    </div>
                                )}

                                <div className="p-7 flex flex-col h-full">
                                    {/* Plan info */}
                                    <div className="mb-6">
                                        <h3 className={`text-base font-semibold mb-1 ${plan.popular ? "text-white" : "text-[var(--color-brand-dark)]"}`}>
                                            {plan.name}
                                        </h3>
                                        <p className={`text-[13px] ${plan.popular ? "text-white/50" : "text-[var(--color-text-tertiary)]"}`}>
                                            {plan.description}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-baseline gap-1 mb-6">
                                        <span className={`text-sm ${plan.popular ? "text-white/50" : "text-[var(--color-text-tertiary)]"}`}>
                                            &#8377;
                                        </span>
                                        <span className={`text-4xl font-bold tracking-tight ${plan.popular ? "text-white" : "text-[var(--color-brand-dark)]"}`}>
                                            {plan.price}
                                        </span>
                                        <span className={`text-sm ${plan.popular ? "text-white/40" : "text-[var(--color-text-tertiary)]"}`}>
                                            {plan.period}
                                        </span>
                                    </div>

                                    {/* Divider */}
                                    <div className={`h-px mb-6 ${plan.popular ? "bg-white/10" : "bg-[var(--color-border-subtle)]"}`} />

                                    {/* Features */}
                                    <ul className="space-y-3 mb-8 flex-1">
                                        {plan.features.map((feature) => (
                                            <li key={feature} className="flex items-start gap-2.5">
                                                <div className={`flex-shrink-0 w-4.5 h-4.5 rounded-full flex items-center justify-center mt-0.5 ${plan.popular
                                                    ? "text-[var(--color-brand-primary)]"
                                                    : "text-[var(--color-success)]"
                                                }`}>
                                                    <Check className="w-3.5 h-3.5" />
                                                </div>
                                                <span className={`text-[13px] leading-snug ${plan.popular ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA */}
                                    <Link href="/signup" className="block">
                                        <Button
                                            className={`w-full rounded-xl py-5 text-sm font-semibold transition-all duration-200 group ${plan.popular
                                                ? "bg-white text-[var(--color-brand-dark)] hover:bg-white/90"
                                                : "bg-[var(--color-brand-dark)] text-white hover:bg-[var(--color-brand-dark)]/90"
                                            }`}
                                        >
                                            {plan.cta}
                                            <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Guarantee */}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center justify-center gap-2 mt-10 text-sm text-[var(--color-text-tertiary)]"
                >
                    <Shield className="w-4 h-4" />
                    <span>7-day money-back guarantee · No questions asked</span>
                </motion.div>
            </div>
        </section>
    );
}
