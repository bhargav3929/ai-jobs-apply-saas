"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { TrendingUp, Users, Target, Mail } from "lucide-react";

const metrics = [
    { value: 180000, suffix: "+", label: "Applications sent", icon: Mail, description: "Personalized emails delivered so far" },
    { value: 2000, suffix: "+", label: "Interviews landed", icon: Target, description: "And counting this month" },
    { value: 600, suffix: "+", label: "Monthly per user", icon: Users, description: "Avg. applications per subscriber" },
    { value: 98, suffix: "%", label: "Inbox delivery", icon: TrendingUp, description: "Land in Primary, not Spam" },
];

function Counter({ target, suffix }: { target: number; suffix: string }) {
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLSpanElement>(null);
    const animated = useRef(false);

    const startAnimation = useCallback(() => {
        if (animated.current) return;
        animated.current = true;
        const duration = 1800;
        const startTime = performance.now();
        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }, [target]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) startAnimation(); },
            { threshold: 0.3 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [startAnimation]);

    return (
        <span ref={ref} className="tabular-nums">
            {count.toLocaleString()}{suffix}
        </span>
    );
}

export function Stats() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section className="py-20 bg-[var(--color-brand-dark)] relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
            <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-10 blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[200px] bg-[radial-gradient(ellipse,_#00D4FF_0%,_transparent_70%)] opacity-[0.06] blur-3xl" />

            <div ref={ref} className="max-w-7xl mx-auto px-6 relative z-10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {metrics.map((metric, i) => (
                        <motion.div
                            key={metric.label}
                            initial={{ opacity: 0, y: 24 }}
                            animate={inView ? { opacity: 1, y: 0 } : {}}
                            transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="relative bg-white/[0.04] rounded-2xl border border-white/[0.06] p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.07]">
                                <metric.icon className="w-5 h-5 text-[var(--color-brand-primary)] mb-4 opacity-60" />
                                <p className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1">
                                    <Counter target={metric.value} suffix={metric.suffix} />
                                </p>
                                <p className="text-sm font-medium text-white/50 mb-1">
                                    {metric.label}
                                </p>
                                <p className="text-[11px] text-white/25">
                                    {metric.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
