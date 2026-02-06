"use client";

import { motion } from "framer-motion";
import Marquee from "react-fast-marquee";

const metrics = [
    { value: "10,000+", label: "Applications sent" },
    { value: "2,400+", label: "Jobs scanned daily" },
    { value: "500+", label: "Active users" },
    { value: "98%", label: "Delivery rate" },
    { value: "15%", label: "Interview rate" },
    { value: "3 min", label: "Setup time" },
];

export function Logos() {
    return (
        <section className="py-8 border-y border-[var(--color-border-subtle)] bg-white relative overflow-hidden">
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <Marquee speed={40} gradient gradientColor="white" gradientWidth={120} pauseOnHover>
                    {metrics.map((m) => (
                        <div key={m.label} className="flex items-center gap-3 mx-10">
                            <span className="text-lg font-bold text-[var(--color-brand-dark)] tracking-tight tabular-nums">{m.value}</span>
                            <span className="text-sm text-[var(--color-text-tertiary)] font-medium">{m.label}</span>
                            <div className="w-1 h-1 rounded-full bg-[var(--color-border-subtle)] ml-4" />
                        </div>
                    ))}
                </Marquee>
            </motion.div>
        </section>
    );
}
