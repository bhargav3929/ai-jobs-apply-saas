"use client";

import { motion } from "framer-motion";
import { BarChart, TrendingUp, Mail, Target, ArrowUpRight } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div className="p-6 md:p-8 max-w-[1200px] mx-auto space-y-6">
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-tight">Analytics</h1>
                <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">
                    Track your outreach performance
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-2xl border border-[var(--color-border-subtle)]"
            >
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary)]/5 flex items-center justify-center mb-4">
                    <BarChart className="w-7 h-7 text-[var(--color-brand-primary)]/40" />
                </div>
                <h4 className="text-[16px] font-semibold text-[var(--color-brand-dark)] mb-1">Coming Soon</h4>
                <p className="text-[13px] text-[var(--color-text-tertiary)] text-center max-w-sm">
                    Detailed analytics with open rates, reply rates, and performance trends will be available here.
                </p>
            </motion.div>
        </div>
    );
}
