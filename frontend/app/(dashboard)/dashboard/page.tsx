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
import type { CommentaryData } from "@/components/dashboard/ai-commentary";

/* ---- Data extraction helpers for personalized companion ---- */

function extractCompanyFromEmail(email: string): string | null {
    if (!email) return null;
    const domain = email.split("@")[1]?.split(".")[0];
    if (!domain) return null;
    const generic = ["gmail", "yahoo", "outlook", "hotmail", "icloud", "protonmail", "aol"];
    if (generic.includes(domain.toLowerCase())) return null;
    return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function extractRecruiterFirstName(email: string): string | null {
    if (!email) return null;
    const local = email.split("@")[0];
    const parts = local.split(/[._-]/);
    const first = parts[0];
    if (!first || first.length < 2) return null;
    const generic = ["info", "hr", "careers", "admin", "noreply", "no-reply", "jobs", "hiring", "recruit", "contact", "support", "hello"];
    if (generic.includes(first.toLowerCase())) return null;
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function extractRoleFromSubject(subject: string): string | null {
    if (!subject) return null;
    const patterns = [
        /application\s+for\s+(.+)/i,
        /interest\s+in\s+(?:the\s+)?(.+?)(?:\s+position|\s+role|\s+opening)?$/i,
    ];
    for (const pat of patterns) {
        const match = subject.match(pat);
        if (match) return match[1].trim().slice(0, 40);
    }
    return subject.length > 40 ? subject.slice(0, 40) + "…" : subject;
}

function getTimeAgoString(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function computeDerivedCommentaryData(
    activities: any[],
    userProfile: any
): Partial<CommentaryData> {
    const companies: string[] = [];
    const roles: string[] = [];
    const recruiterNames: string[] = [];
    let failedCount = 0;
    let bouncedCount = 0;

    for (const app of activities) {
        const company = extractCompanyFromEmail(app.recruiterEmail);
        if (company && !companies.includes(company)) companies.push(company);

        const role = extractRoleFromSubject(app.emailSubject);
        if (role && !roles.includes(role)) roles.push(role);

        const name = extractRecruiterFirstName(app.recruiterEmail);
        if (name && !recruiterNames.includes(name)) recruiterNames.push(name);

        if (app.status === "failed") failedCount++;
        if (app.status === "bounced") bouncedCount++;
    }

    // Latest application for "just happened" messages
    const latest = activities[0]; // already sorted DESC from backend
    let latestApplication: CommentaryData["latestApplication"] = undefined;
    if (latest) {
        latestApplication = {
            company: extractCompanyFromEmail(latest.recruiterEmail) || "a company",
            role: extractRoleFromSubject(latest.emailSubject) || "a role",
            recruiterFirstName: extractRecruiterFirstName(latest.recruiterEmail) || "",
            timeAgo: latest.sentAt ? getTimeAgoString(latest.sentAt) : "",
            status: latest.status || "sent",
        };
    }

    // Top company this week
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weekCompanies: Record<string, number> = {};
    for (const app of activities) {
        if (app.sentAt && new Date(app.sentAt).getTime() > weekAgo) {
            const c = extractCompanyFromEmail(app.recruiterEmail);
            if (c) weekCompanies[c] = (weekCompanies[c] || 0) + 1;
        }
    }
    const topCompanyThisWeek = Object.entries(weekCompanies)
        .sort(([, a], [, b]) => b - a)[0]?.[0];

    // Account age
    let accountAgeDays = 0;
    if (userProfile?.createdAt) {
        accountAgeDays = Math.floor((Date.now() - new Date(userProfile.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
        jobCategory: userProfile?.jobCategory,
        accountAgeDays,
        failedCount,
        bouncedCount,
        uniqueCompanies: companies.slice(0, 10),
        uniqueRoles: roles.slice(0, 10),
        recruiterFirstNames: recruiterNames.slice(0, 10),
        topCompanyThisWeek,
        latestApplication,
    };
}

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

    // Compute derived personalization data for AI commentary
    const derived = React.useMemo(
        () => computeDerivedCommentaryData(activities, userProfile),
        [activities, userProfile]
    );
    const sentCount = activities.filter((a: any) => a.status === "sent").length;
    const computedInboxRate = activities.length > 0 ? Math.round((sentCount / activities.length) * 100) : 100;
    const appTotal = statsData?.applicationsTotal ?? 0;

    // AI Commentary hook — fed with ALL available user data + derived personalization
    const commentary = useAICommentary({
        userName: userProfile?.name,
        active: automationActive,
        isFirstLogin: appTotal === 0 && activities.length === 0,
        applicationsToday: statsData?.applicationsToday ?? 0,
        applicationsTotal: statsData?.applicationsTotal ?? 0,
        applicationsThisWeek: statsData?.applicationsThisWeek ?? 0,
        applicationsThisMonth: statsData?.applicationsThisMonth ?? 0,
        pendingQueue: statsData?.pendingQueue ?? 0,
        inboxRate: computedInboxRate,
        averageDaily: statsData?.averageDaily ?? 0,
        nextBatchTime: statsData?.nextBatchTime,
        recentApplications: activities,
        ...derived,
    });

    // Avatar speaking state — start speaking immediately on mount for the rotation effect
    const [avatarSpeaking, setAvatarSpeaking] = React.useState(true);

    // Trigger speaking animation when commentary changes
    React.useEffect(() => {
        if (commentary) {
            setAvatarSpeaking(true);
            const timer = setTimeout(() => setAvatarSpeaking(false), 4500);
            return () => clearTimeout(timer);
        }
    }, [commentary?.id]);

    // Initial data load + periodic polling every 30s for live updates
    const loadData = React.useCallback(async () => {
        try {
            const [s, a] = await Promise.all([getDashboardStats(), getRecentActivity()]);
            setStatsData(s);
            setActivities(a);
        } catch (e) {
            console.error(e);
        }
    }, []);

    React.useEffect(() => {
        loadData();
        // Poll every 30 seconds so companion always has fresh data
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

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
    const sentYesterday = statsData?.applicationsYesterday ?? 0;
    const totalSent = statsData?.applicationsTotal ?? 0;
    const sentThisWeek = statsData?.applicationsThisWeek ?? 0;
    const avgDaily = statsData?.averageDaily ?? 0;
    const inboxRate = computedInboxRate;

    // If nothing sent today yet, show yesterday's count with a note
    const showYesterdayFallback = sentToday === 0 && sentYesterday > 0;

    const stats = [
        {
            label: showYesterdayFallback ? "Sent Yesterday" : "Sent Today",
            value: showYesterdayFallback ? sentYesterday : sentToday,
            note: showYesterdayFallback ? "Today\u2019s sending starts at 10 AM" : undefined,
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
        <div className="p-5 md:p-6 lg:p-8 xl:p-10 space-y-4 lg:space-y-5">

            {/* ===== AI Agent Banner with 3D Avatar ===== */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-xl bg-[var(--color-brand-dark)] px-3.5 py-2.5 lg:px-5 lg:py-3.5"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="group relative bg-white rounded-xl border border-[var(--color-border-subtle)] px-4 py-3.5 lg:px-5 lg:py-4 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <div className="flex items-center justify-between mb-2.5 lg:mb-3">
                            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg ${stat.bg}/10 flex items-center justify-center`}>
                                <stat.icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${stat.color}`} />
                            </div>
                            <TrendingUp className="w-3 h-3 text-[var(--color-brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xl md:text-2xl lg:text-3xl font-bold text-[var(--color-brand-dark)] tracking-tight leading-none">
                            <AnimatedNumber value={stat.value} suffix={"suffix" in stat ? (stat as any).suffix : ""} />
                        </p>
                        <span className="text-[11px] lg:text-xs text-[var(--color-text-tertiary)] font-medium mt-1 lg:mt-1.5 block">{stat.label}</span>
                        {"note" in stat && stat.note && (
                            <span className="text-[9px] text-[var(--color-brand-primary)] font-medium mt-0.5 block leading-tight">{stat.note}</span>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* ===== Bottom Grid: Recent + Insights ===== */}
            <div className="grid md:grid-cols-3 gap-3 lg:gap-4">

                {/* Recent Applications — spans 2 cols */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="md:col-span-2 bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden"
                >
                    <div className="flex items-center justify-between px-6 py-5 lg:px-7 lg:py-6 border-b border-[var(--color-border-subtle)]">
                        <div>
                            <h3 className="text-[15px] lg:text-base font-semibold text-[var(--color-brand-dark)]">Recent Applications</h3>
                            <p className="text-[12px] lg:text-[13px] text-[var(--color-text-tertiary)] mt-0.5">Latest automated outreach</p>
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
                                        className="flex items-center justify-between px-6 py-4 lg:px-7 lg:py-5 hover:bg-[var(--color-surface)]/50 transition-colors group"
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
                                                <p className="text-[13px] lg:text-sm font-medium text-[var(--color-brand-dark)] truncate">
                                                    {app.emailSubject || "Untitled"}
                                                </p>
                                                <p className="text-[11px] lg:text-xs text-[var(--color-text-tertiary)]">
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
                    className="bg-white rounded-2xl border border-[var(--color-border-subtle)] p-6 lg:p-7 flex flex-col"
                >
                    <h3 className="text-[15px] lg:text-base font-semibold text-[var(--color-brand-dark)] mb-1">Quick Insights</h3>
                    <p className="text-[12px] lg:text-[13px] text-[var(--color-text-tertiary)] mb-5">Agent performance</p>

                    <div className="space-y-4 lg:space-y-5 flex-1">
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
                                className="flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]/60"
                            >
                                <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                                    <insight.icon className="w-4 h-4 text-[var(--color-brand-primary)]" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[11px] lg:text-xs text-[var(--color-text-tertiary)] font-medium">{insight.label}</p>
                                    <p className="text-lg lg:text-xl font-bold text-[var(--color-brand-primary)] tracking-tight leading-tight">{insight.value}</p>
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
