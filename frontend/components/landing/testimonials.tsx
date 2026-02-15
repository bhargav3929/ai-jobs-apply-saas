"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";
import Marquee from "react-fast-marquee";
import Image from "next/image";

const testimonials = [
    {
        name: "Priya Sharma",
        role: "Frontend Developer",
        company: "Landed role at Razorpay",
        content: "600+ applications went out in my first month. I got 8 interview calls without writing a single email. This is the unfair advantage every job seeker needs.",
        avatar: "PS",
        image: "/testimonials/priya.png",
        color: "from-violet-500 to-purple-600",
        rating: 5,
    },
    {
        name: "Rahul Menon",
        role: "Full Stack Developer",
        company: "Hired at a Series B startup",
        content: "Recruiters have no idea it's automated — because every email comes from my Gmail and reads like I spent 20 minutes writing it. Got 3 offers in 5 weeks.",
        avatar: "RM",
        image: "/testimonials/rahul.png",
        color: "from-cyan-500 to-blue-600",
        rating: 5,
    },
    {
        name: "Ananya Reddy",
        role: "AI/ML Engineer",
        company: "Now at Flipkart",
        content: "I went from mass-applying on job boards with 0 replies to 12 interview invites in one month. The AI personalizes every single email — it's not even close to a template.",
        avatar: "AR",
        image: "/testimonials/ananya.png",
        color: "from-emerald-500 to-teal-600",
        rating: 5,
    },
    {
        name: "Karthik Iyer",
        role: "AI/ML Engineer",
        company: "Joining a YC startup",
        content: "It only targets AI/ML roles — not random dev jobs. Out of 600 applications last month, every single one was relevant. That kind of precision is impossible manually.",
        avatar: "KI",
        image: "/testimonials/karthik.png",
        color: "from-orange-500 to-amber-600",
        rating: 5,
    },
    {
        name: "Sneha Patel",
        role: "Marketing Specialist",
        company: "3 offers in 4 weeks",
        content: "Setup took 3 minutes. By the next morning, 20 personalized emails were already sent. Two weeks later, I had 3 interview calls lined up. Best ₹1,199 I ever spent.",
        avatar: "SP",
        image: "/testimonials/sneha.png",
        color: "from-pink-500 to-rose-600",
        rating: 5,
    },
    {
        name: "Arjun Das",
        role: "Backend Developer",
        company: "4 offers in 6 weeks",
        content: "Manually, I could send maybe 5 applications a day. JobAgent sent 600+ in my first month — all personalized, all from my inbox. The math just makes sense.",
        avatar: "AD",
        image: "/testimonials/arjun.png",
        color: "from-indigo-500 to-violet-600",
        rating: 5,
    },
];

const firstRow = testimonials.slice(0, 3);
const secondRow = testimonials.slice(3, 6);

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
    return (
        <div className="w-[360px] mx-3 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-[var(--color-border-subtle)] p-6 h-full transition-all duration-300 hover:shadow-lift hover:-translate-y-0.5 relative overflow-hidden group">
                {/* Subtle quote mark */}
                <Quote className="absolute top-4 right-4 w-8 h-8 text-[var(--color-brand-primary)]/[0.06] transition-colors group-hover:text-[var(--color-brand-primary)]/[0.12]" />

                {/* Stars */}
                <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-[var(--color-warning)] text-[var(--color-warning)]" />
                    ))}
                </div>

                {/* Content */}
                <p className="text-[0.875rem] text-[var(--color-text-secondary)] leading-[1.7] mb-6">
                    &ldquo;{t.content}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                    <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                        <Image
                            src={t.image}
                            alt={t.name}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-brand-dark)] truncate">{t.name}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{t.role} · {t.company}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function Testimonials() {
    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Background */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_center,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.03] blur-3xl" />

            <div className="relative">
                {/* Section Header */}
                <div className="max-w-7xl mx-auto px-6 mb-14">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-80px" }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="h-px w-8 bg-[var(--color-brand-primary)]" />
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                                    Testimonials
                                </p>
                            </div>
                            <h2 className="text-3xl md:text-[2.5rem] font-bold text-[var(--color-brand-dark)] tracking-[-0.025em] leading-[1.15]">
                                2,000+ interviews{" "}
                                <span className="text-[var(--color-text-secondary)] font-medium">and counting</span>
                            </h2>
                        </div>
                        <p className="text-sm text-[var(--color-text-secondary)] max-w-sm leading-relaxed md:text-right">
                            Real results from real job seekers who switched from manual applications to 600+ automated, personalized emails every month.
                        </p>
                    </motion.div>
                </div>

                {/* Marquee rows */}
                <div className="space-y-4">
                    <Marquee speed={35} pauseOnHover gradient gradientColor="white" gradientWidth={80}>
                        {firstRow.map((t) => (
                            <TestimonialCard key={t.name} t={t} />
                        ))}
                        {/* Duplicate for seamless loop */}
                        {firstRow.map((t) => (
                            <TestimonialCard key={`${t.name}-dup`} t={t} />
                        ))}
                    </Marquee>

                    <Marquee speed={30} pauseOnHover direction="right" gradient gradientColor="white" gradientWidth={80}>
                        {secondRow.map((t) => (
                            <TestimonialCard key={t.name} t={t} />
                        ))}
                        {secondRow.map((t) => (
                            <TestimonialCard key={`${t.name}-dup`} t={t} />
                        ))}
                    </Marquee>
                </div>
            </div>
        </section>
    );
}
