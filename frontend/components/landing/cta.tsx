"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function CTA() {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-80px" }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="relative bg-[var(--color-brand-dark)] rounded-3xl overflow-hidden">
                        {/* Background decorations */}
                        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-20 blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-[radial-gradient(ellipse,_#00D4FF_0%,_transparent_70%)] opacity-10 blur-3xl" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />

                        <div className="relative z-10 px-8 py-16 md:px-16 md:py-20">
                            <div className="max-w-2xl mx-auto text-center">
                                <h2 className="text-3xl md:text-[2.75rem] font-bold text-white tracking-[-0.025em] leading-tight mb-4">
                                    Your next interview is<br className="hidden md:block" /> 600 applications away
                                </h2>
                                <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
                                    Most users get their first interview invite within 7 days. Set up in 3 minutes, and let your AI agent do the rest.
                                </p>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                                    <Link href="/signup">
                                        <Button
                                            size="lg"
                                            className="bg-white text-[var(--color-brand-dark)] hover:bg-white/90 rounded-xl px-8 py-6 text-[0.95rem] font-semibold shadow-lg transition-all hover:-translate-y-0.5 group"
                                        >
                                            Get Started Free
                                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" />
                                        </Button>
                                    </Link>
                                </div>

                                <p className="text-white/30 text-sm mt-6">
                                    No credit card required · 7-day free trial · Cancel anytime
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
