"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Send,
    CheckCircle2,
    Clock,
    ArrowUpRight,
    TrendingUp,
    Mail,
    Target,
    Pause,
    Play,
    ArrowRight,
    ExternalLink,
    AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts";
import React from "react";
import { getDashboardStats, getRecentActivity, toggleAutomation } from "@/lib/api";
import { AIAvatar, AICommentaryBubble, useAICommentary } from "@/components/dashboard";

/* ---- Animated counter ---- */
function AnimatedNumber({ value, suffix = "" }: { value: number | string; suffix?: string }) {
    const [display, setDisplay] = React.useState(0);
    const numValue = typeof value === "string" ? parseInt(value) || 0 : value;
    const animated = React.useRef(false);

    React.useEffect(() => {
        if (animated.current || numValue === 0) return;
        animated.current = true;
        const duration = 1200;
        const start = performance.now();
        const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.floor(eased * numValue));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [numValue]);

    return <>{display}{suffix}</>;
}

/* ---- Automation status pill ---- */
function StatusPill({ active, onClick, loading }: { active: boolean; onClick: () => void; loading: boolean }) {
    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`
                relative flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[13px] font-semibold transition-all duration-300
                ${active
                    ? "bg-[var(--color-success)]/10 text-[var(--color-success)] hover:bg-[var(--color-success)]/15"
                    : "bg-[var(--color-text-tertiary)]/10 text-[var(--color-text-tertiary)] hover:bg-[var(--color-text-tertiary)]/15"
                }
            `}
        >
            <span className="relative flex h-2 w-2">
                {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${active ? "bg-[var(--color-success)]" : "bg-[var(--color-text-tertiary)]"}`} />
            </span>
            {active ? "Active" : "Paused"}
            {active ? <Pause className="w-3.5 h-3.5 opacity-60" /> : <Play className="w-3.5 h-3.5 opacity-60" />}
        </button>
    );
}

export default function DashboardPage() {
    const { userProfile, refreshUserProfile } = useAuth();
    const [statsData, setStatsData] = React.useState<any>(null);
    const [activities, setActivities] = React.useState<any[]>([]);
    const [automationActive, setAutomationActive] = React.useState(userProfile?.isActive ?? true);
    const [toggling, setToggling] = React.useState(false);

    // AI Commentary hook — fed with real user data
    const appTotal = statsData?.applications_today ?? statsData?.applicationsTotal ?? 0;
    const commentary = useAICommentary({
        userName: userProfile?.name,
        active: automationActive,
        isFirstLogin: appTotal === 0 && activities.length === 0,
        applicationsToday: statsData?.applications_today ?? statsData?.applicationsToday,
        applicationsTotal: statsData?.total_applications ?? statsData?.applicationsTotal,
        pendingQueue: statsData?.pending_queue ?? statsData?.pendingQueue,
        inboxRate: statsData?.inbox_rate ?? statsData?.inboxRate,
        recentApplications: activities,
    });
    const [avatarSpeaking, setAvatarSpeaking] = React.useState(false);

    // Trigger speaking animation when commentary changes
    React.useEffect(() => {
        if (commentary) {
            setAvatarSpeaking(true);
            const timer = setTimeout(() => setAvatarSpeaking(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [commentary?.id]);

    React.useEffect(() => {
        async function loadData() {
            try {
                const [s, a] = await Promise.all([getDashboardStats(), getRecentActivity()]);
                setStatsData(s);
                setActivities(a);
            } catch (e) {
                console.error(e);
            }
        }
        loadData();
    }, []);

    const handleToggle = async () => {
        const newState = !automationActive;
        setAutomationActive(newState);
        setToggling(true);
        try {
            await toggleAutomation(newState);
            await refreshUserProfile();
        } catch {
            setAutomationActive(!newState);
        } finally {
            setToggling(false);
        }
    };

    // Compute derived stats from real data
    const sentToday = statsData?.applicationsToday ?? 0;
    const totalSent = statsData?.applicationsTotal ?? 0;
    const sentThisWeek = statsData?.applicationsThisWeek ?? 0;
    const avgDaily = statsData?.averageDaily ?? 0;
    // Inbox rate: compute from activities (sent vs failed/bounced)
    const sentCount = activities.filter((a: any) => a.status === "sent").length;
    const inboxRate = activities.length > 0 ? Math.round((sentCount / activities.length) * 100) : 100;

    const stats = [
        {
            label: "Sent Today",
            value: sentToday,
            icon: Send,
            color: "text-[var(--color-brand-primary)]",
            bg: "bg-[var(--color-brand-primary)]",
        },
        {
            label: "Total Sent",
            value: totalSent,
            icon: CheckCircle2,
            color: "text-[var(--color-brand-primary)]",
            bg: "bg-[var(--color-brand-primary)]",
        },
        {
            label: "This Week",
            value: sentThisWeek,
            icon: Clock,
            color: "text-[var(--color-brand-primary)]",
            bg: "bg-[var(--color-brand-primary)]",
        },
        {
            label: "Inbox Rate",
            value: inboxRate,
            suffix: "%",
            icon: Target,
            color: "text-[var(--color-brand-primary)]",
            bg: "bg-[var(--color-brand-primary)]",
        },
    ];

    const hasApplications = activities.length > 0;

    return (
        <div className="p-5 md:p-6 max-w-[1200px] mx-auto space-y-4">

            {/* ===== AI Agent Banner with 3D Avatar ===== */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-xl bg-[var(--color-brand-dark)] px-3.5 py-2.5"
            >
                {/* Subtle background gradient */}
                <div className="absolute top-0 right-0 w-[250px] h-[150px] bg-[radial-gradient(ellipse,_var(--color-brand-primary)_0%,_transparent_70%)] opacity-[0.08] blur-3xl" />

                <div className="relative z-10 flex items-center gap-2.5">
                    {/* 3D AI Avatar */}
                    <div className="flex-shrink-0">
                        <AIAvatar active={automationActive} speaking={avatarSpeaking} size={52} />
                    </div>

                    {/* Speech Bubble — only visible when speaking */}
                    <div className="flex-1 min-w-0">
                        <AICommentaryBubble message={commentary} speaking={avatarSpeaking} />
                    </div>

                    {/* Status Pill */}
                    <div className="flex-shrink-0">
                        <StatusPill active={automationActive} onClick={handleToggle} loading={toggling} />
                    </div>
                </div>
            </motion.div>

            {/* ===== Stats Grid ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="group relative bg-white rounded-xl border border-[var(--color-border-subtle)] px-4 py-3.5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="flex items-center justify-between mb-2.5">
                            <div className={`w-7 h-7 rounded-lg ${stat.bg}/10 flex items-center justify-center`}>
                                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                            </div>
                            <TrendingUp className="w-3 h-3 text-[var(--color-brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-[var(--color-brand-dark)] tracking-tight leading-none">
                            <AnimatedNumber value={stat.value} suffix={"suffix" in stat ? (stat as any).suffix : ""} />
                        </p>
                        <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium mt-1 block">{stat.label}</span>
                    </motion.div>
                ))}
            </div>

            {/* ===== Bottom Grid: Recent + Insights ===== */}
            <div className="grid md:grid-cols-3 gap-3">

                {/* Recent Applications — spans 2 cols */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="md:col-span-2 bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden"
                >
                    <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--color-border-subtle)]">
                        <div>
                            <h3 className="text-[15px] font-semibold text-[var(--color-brand-dark)]">Recent Applications</h3>
                            <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">Latest automated outreach</p>
                        </div>
                        {hasApplications && (
                            <Link href="/applications">
                                <Button variant="ghost" size="sm" className="text-[12px] text-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/5 rounded-xl h-8 px-3 font-medium">
                                    View All <ArrowRight className="w-3 h-3 ml-1" />
                                </Button>
                            </Link>
                        )}
                    </div>

                    <AnimatePresence mode="wait">
                        {!hasApplications ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col items-center justify-center py-16 px-6"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary)]/5 flex items-center justify-center mb-4">
                                    <Send className="w-7 h-7 text-[var(--color-brand-primary)]/40" />
                                </div>
                                <h4 className="text-[15px] font-semibold text-[var(--color-brand-dark)] mb-1">No applications yet</h4>
                                <p className="text-[13px] text-[var(--color-text-tertiary)] text-center max-w-xs mb-5">
                                    {automationActive
                                        ? "Your agent is searching for opportunities. Applications will appear here once sent."
                                        : "Start your agent to begin sending personalized applications automatically."}
                                </p>
                                {!automationActive && (
                                    <Button
                                        onClick={handleToggle}
                                        size="sm"
                                        className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl h-9 px-5 text-[13px] font-medium"
                                    >
                                        Start Agent <Play className="w-3.5 h-3.5 ml-1.5" />
                                    </Button>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="divide-y divide-[var(--color-border-subtle)]"
                            >
                                {activities.slice(0, 5).map((app: any, i: number) => (
                                    <motion.div
                                        key={app.applicationId || i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.6 + i * 0.06 }}
                                        className="flex items-center justify-between px-6 py-4 hover:bg-[var(--color-surface)]/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                app.status === "failed" ? "bg-red-50" : app.status === "bounced" ? "bg-amber-50" : "bg-[var(--color-brand-primary)]/[0.06]"
                                            }`}>
                                                {app.status === "failed"
                                                    ? <AlertCircle className="w-4 h-4 text-red-500" />
                                                    : <Send className={`w-4 h-4 ${app.status === "bounced" ? "text-amber-600" : "text-[var(--color-brand-primary)]"}`} />
                                                }
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[13px] font-medium text-[var(--color-brand-dark)] truncate">
                                                    {app.emailSubject || "Untitled"}
                                                </p>
                                                <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                                    {app.sentAt ? new Date(app.sentAt).toLocaleDateString() : "—"}
                                                    {app.recruiterEmail ? ` · to ${app.recruiterEmail}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge
                                                className={`text-[10px] font-bold uppercase tracking-wider border-0 rounded-lg px-2 py-0.5
                                                    ${app.status === "sent" ? "bg-emerald-50 text-emerald-700" : ""}
                                                    ${app.status === "failed" ? "bg-red-50 text-red-700" : ""}
                                                    ${app.status === "bounced" ? "bg-amber-50 text-amber-700" : ""}
                                                `}
                                            >
                                                {app.status}
                                            </Badge>
                                            {app.linkedinUrl ? (
                                                <a href={app.linkedinUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                    <ExternalLink className="w-3.5 h-3.5 text-[var(--color-brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </a>
                                            ) : (
                                                <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]/20" />
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Insights Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="bg-white rounded-2xl border border-[var(--color-border-subtle)] p-6 flex flex-col"
                >
                    <h3 className="text-[15px] font-semibold text-[var(--color-brand-dark)] mb-1">Quick Insights</h3>
                    <p className="text-[12px] text-[var(--color-text-tertiary)] mb-5">Agent performance</p>

                    <div className="space-y-4 flex-1">
                        {[
                            { label: "Inbox delivery", value: `${inboxRate}%`, icon: Mail },
                            { label: "Avg. daily sends", value: `${avgDaily}`, icon: ArrowUpRight },
                            { label: "This month", value: `${statsData?.applicationsThisMonth ?? 0}`, icon: Target },
                        ].map((insight, i) => (
                            <motion.div
                                key={insight.label}
                                initial={{ opacity: 0, x: 8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.7 + i * 0.1 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]/60"
                            >
                                <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                                    <insight.icon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] text-[var(--color-text-tertiary)] font-medium">{insight.label}</p>
                                    <p className="text-lg font-bold text-[var(--color-brand-primary)] tracking-tight leading-tight">{insight.value}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Category badge */}
                    <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)]">
                        <p className="text-[11px] text-[var(--color-text-tertiary)] font-medium mb-2">Targeting</p>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[var(--color-brand-primary)]/10 flex items-center justify-center">
                                <Target className="w-3 h-3 text-[var(--color-brand-primary)]" />
                            </div>
                            <span className="text-[13px] font-medium text-[var(--color-brand-dark)]">
                                {userProfile?.jobCategory || "Software Developer"}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
