"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, TrendingUp, Zap, Target, Mail, Heart, Coffee, Rocket, Brain, LucideIcon, Clock, BarChart3, CheckCircle2, Star, Flame, Shield, ArrowUpRight, AlertCircle } from "lucide-react";

export interface CommentaryMessage {
    id: string;
    text: string;
    icon: LucideIcon;
    type: "info" | "success" | "activity" | "greeting";
}

/* ---- Data the hook needs to generate real messages ---- */
export interface CommentaryData {
    userName?: string;
    active: boolean;
    isFirstLogin?: boolean;
    applicationsToday?: number;
    applicationsTotal?: number;
    applicationsThisWeek?: number;
    applicationsThisMonth?: number;
    pendingQueue?: number;
    inboxRate?: number;
    averageDaily?: number;
    nextBatchTime?: string;
    recentApplications?: {
        emailSubject?: string;
        role?: string;
        company?: string;
        recruiterEmail?: string;
        status?: string;
        sentAt?: string;
    }[];

    /* ---- Personalization fields ---- */
    jobCategory?: string;
    accountAgeDays?: number;
    failedCount?: number;
    bouncedCount?: number;
    uniqueCompanies?: string[];
    uniqueRoles?: string[];
    recruiterFirstNames?: string[];
    topCompanyThisWeek?: string;
    latestApplication?: {
        company: string;
        role: string;
        recruiterFirstName: string;
        timeAgo: string;
        status: string;
    };
}

/* ---- Message generators ---- */
type MsgDef = { text: string; icon: LucideIcon; type: CommentaryMessage["type"] };

/* Module-level flag: persists across page navigations within the same session */
let sessionGreeted = false;

/* ---- localStorage keys ---- */
const LAST_VISIT_KEY = "chitti_last_visit";
const LAST_SEEN_APP_COUNT_KEY = "chitti_last_seen_app_count";

/* ---- Utility: pick N random items from array ---- */
function pickRandom<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

/* ---- Extract company name from email subject or recruiter email ---- */
function extractCompany(app: NonNullable<CommentaryData["recentApplications"]>[0]): string {
    if (app.company) return app.company;
    if (app.recruiterEmail) {
        const domain = app.recruiterEmail.split("@")[1]?.split(".")[0];
        if (domain && !["gmail", "yahoo", "outlook", "hotmail", "icloud", "protonmail", "aol"].includes(domain.toLowerCase())) {
            return domain.charAt(0).toUpperCase() + domain.slice(1);
        }
    }
    if (app.emailSubject) {
        const short = app.emailSubject.length > 30 ? app.emailSubject.slice(0, 30) + "…" : app.emailSubject;
        return short;
    }
    return "a company";
}

/* ---- Extract recruiter first name from email ---- */
function extractRecruiterName(email: string): string | null {
    if (!email) return null;
    const local = email.split("@")[0];
    const parts = local.split(/[._-]/);
    const first = parts[0];
    if (!first || first.length < 2) return null;
    const generic = ["info", "hr", "careers", "admin", "noreply", "no-reply", "jobs", "hiring", "recruit", "contact", "support", "hello"];
    if (generic.includes(first.toLowerCase())) return null;
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/* ---- Time helpers ---- */
function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function getLastVisitTime(): number | null {
    try {
        const val = localStorage.getItem(LAST_VISIT_KEY);
        return val ? parseInt(val, 10) : null;
    } catch { return null; }
}

function getLastSeenAppCount(): number {
    try {
        const val = localStorage.getItem(LAST_SEEN_APP_COUNT_KEY);
        return val ? parseInt(val, 10) : 0;
    } catch { return 0; }
}

function saveVisitData(totalApps: number) {
    try {
        localStorage.setItem(LAST_VISIT_KEY, Date.now().toString());
        localStorage.setItem(LAST_SEEN_APP_COUNT_KEY, totalApps.toString());
    } catch { /* no-op */ }
}

/* ---- Category-specific motivation messages ---- */
function getCategoryMessages(category: string, name: string, companies: string[], week: number): MsgDef[] {
    const companyExample = companies[0] || "top companies";

    switch (category) {
        case "AI/ML Engineer":
            return [
                { text: `${name}, AI/ML roles are hot — your profile is going out to the right people`, icon: Brain, type: "info" },
                { text: `Targeting ML Engineer and Data Science roles at places like ${companyExample}`, icon: Target, type: "info" },
                { text: `${week > 0 ? week : "Your"} applications are tailored for AI/ML job descriptions`, icon: Sparkles, type: "info" },
                { text: `Highlighting your ML experience in every outreach email`, icon: Brain, type: "info" },
                { text: `${name}, AI hiring is booming — let's make sure you're in every pipeline`, icon: Rocket, type: "greeting" },
            ];
        case "Marketing/Sales":
            return [
                { text: `${name}, pitching your growth & revenue skills to the right teams`, icon: TrendingUp, type: "info" },
                { text: `Targeting marketing and sales roles at ${companyExample} and similar`, icon: Target, type: "info" },
                { text: `Crafting outreach that shows your ROI-driven mindset`, icon: Sparkles, type: "info" },
                { text: `${name}, your sales background makes you stand out — I'm leveraging that`, icon: Star, type: "info" },
                { text: `${week > 0 ? week : "Several"} personalized pitches sent to marketing & sales leads`, icon: Send, type: "activity" },
            ];
        case "Design":
            return [
                { text: `${name}, showcasing your design portfolio in every email`, icon: Sparkles, type: "info" },
                { text: `Targeting UX/UI and product design roles at ${companyExample}`, icon: Target, type: "info" },
                { text: `Design roles are competitive — that's why every email is handcrafted`, icon: Brain, type: "info" },
                { text: `${name}, your creative skills deserve the right stage — I'm finding it`, icon: Heart, type: "greeting" },
                { text: `Emphasizing your design thinking approach in each application`, icon: Star, type: "info" },
            ];
        default: // "Software Developer"
            return [
                { text: `${name}, targeting full-stack and backend roles at ${companyExample}`, icon: Target, type: "info" },
                { text: `Each email highlights your coding skills for the specific tech stack`, icon: Brain, type: "info" },
                { text: `Software engineering roles are in demand — you're in the right space`, icon: TrendingUp, type: "info" },
                { text: `${name}, matching your dev experience with the right engineering teams`, icon: Sparkles, type: "info" },
                { text: `Customizing each pitch based on the company's tech stack`, icon: Brain, type: "info" },
            ];
    }
}

/* ---- Minimal personality (always references real data) ---- */
function getPersonalityMessages(name: string, category: string, total: number, companies: string[]): MsgDef[] {
    const msgs: MsgDef[] = [];
    if (total > 0) {
        msgs.push({ text: `${total} unique emails — not a single copy-paste, ${name}`, icon: Brain, type: "info" });
    }
    if (companies.length > 0) {
        msgs.push({ text: `${name}, one great reply from ${pickRandom(companies, 1)[0]} is all it takes`, icon: Heart, type: "greeting" });
    }
    msgs.push({ text: `Working 24/7 on your ${category} applications while you focus on prep`, icon: Rocket, type: "info" });
    msgs.push({ text: `${name}, every ${category} email I send is crafted from scratch`, icon: Sparkles, type: "info" });
    return msgs;
}

/* ---- FIRST-TIME user intro sequence ---- */
function buildFirstLoginQueue(data: CommentaryData): MsgDef[] {
    const name = data.userName?.split(" ")[0] || "there";
    const category = data.jobCategory || "Software Developer";
    return [
        { text: `Hey ${name}! I'm Chitti, your AI job-hunting companion`, icon: Sparkles, type: "greeting" },
        { text: `I'll apply to ${category} jobs on your behalf while you focus on what matters`, icon: Rocket, type: "info" },
        { text: "I personalize every email so recruiters actually read them", icon: Brain, type: "info" },
        { text: `My goal? Help you land a great ${category} role at a company you love`, icon: Target, type: "success" },
        { text: "Just sit back — I've got the grind covered for you", icon: Zap, type: "greeting" },
    ];
}

/* ---- RETURNING user — fully personalized, data-driven messages ---- */
function buildMessageQueue(data: CommentaryData): MsgDef[] {
    const msgs: MsgDef[] = [];
    const name = data.userName?.split(" ")[0] || "there";
    const today = data.applicationsToday ?? 0;
    const total = data.applicationsTotal ?? 0;
    const week = data.applicationsThisWeek ?? 0;
    const month = data.applicationsThisMonth ?? 0;
    const rate = data.inboxRate ?? 100;
    const avgDaily = data.averageDaily ?? 0;
    const pending = data.pendingQueue ?? 0;
    const recent = data.recentApplications ?? [];
    const category = data.jobCategory ?? "Software Developer";
    const accountDays = data.accountAgeDays ?? 0;
    const failed = data.failedCount ?? 0;
    const companies = data.uniqueCompanies ?? [];
    const recruiters = data.recruiterFirstNames ?? [];
    const topCompany = data.topCompanyThisWeek;
    const latest = data.latestApplication;

    // Calculate "since last visit" stats
    const lastVisit = getLastVisitTime();
    const lastSeenCount = getLastSeenAppCount();
    const newSinceLastVisit = total - lastSeenCount;
    const appsSinceLastVisit = lastVisit
        ? recent.filter(a => a.sentAt && new Date(a.sentAt).getTime() > lastVisit)
        : [];

    // ========= TIER 1: Session greeting (once per session) =========
    if (!sessionGreeted) {
        if (newSinceLastVisit > 0 && lastVisit) {
            msgs.push({
                text: `Welcome back ${name}! I sent ${newSinceLastVisit} ${category.toLowerCase()} email${newSinceLastVisit > 1 ? "s" : ""} while you were away`,
                icon: Send, type: "activity"
            });
        } else if (today > 0) {
            msgs.push({
                text: `${name}, I've been grinding on ${category} roles — ${today} emails sent today`,
                icon: Send, type: "activity"
            });
        } else {
            msgs.push({
                text: `Hey ${name}! Scanning fresh ${category} opportunities right now`,
                icon: Target, type: "greeting"
            });
        }
    }

    // ========= TIER 2: Latest application ("just happened") =========
    if (latest && latest.status === "sent") {
        const recruiterPart = latest.recruiterFirstName ? ` to ${latest.recruiterFirstName}` : "";
        const companyPart = latest.company !== "a company" ? ` at ${latest.company}` : "";
        const timePart = latest.timeAgo ? ` — ${latest.timeAgo}` : "";

        const variations: MsgDef[] = [
            { text: `Just emailed${recruiterPart}${companyPart} for the ${latest.role} role${timePart}`, icon: Mail, type: "activity" },
            { text: `Pitched you${companyPart} for ${latest.role}${timePart}`, icon: Send, type: "activity" },
        ];
        msgs.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    // ========= TIER 3: "Since you were away" specific emails =========
    if (appsSinceLastVisit.length > 0 && !sessionGreeted) {
        const toShow = appsSinceLastVisit.slice(0, 4);
        for (const app of toShow) {
            const company = extractCompany(app);
            const timeAgo = app.sentAt ? getTimeAgo(app.sentAt) : "";
            const recruiter = app.recruiterEmail ? extractRecruiterName(app.recruiterEmail) : null;
            const prefix = recruiter ? `Emailed ${recruiter} at ${company}` : `Sent an email to ${company}`;
            msgs.push({ text: `${prefix}${timeAgo ? ` — ${timeAgo}` : ""}`, icon: Mail, type: "activity" });
        }
        if (appsSinceLastVisit.length > 4) {
            msgs.push({ text: `…and ${appsSinceLastVisit.length - 4} more while you were away`, icon: CheckCircle2, type: "success" });
        }
    }

    // ========= TIER 4: Today's specific application feed =========
    const todayApps = recent.filter(a => {
        if (!a.sentAt) return false;
        return new Date(a.sentAt).toDateString() === new Date().toDateString();
    });
    const appsToShow = todayApps.length > 0 ? todayApps.slice(0, 5) : recent.slice(0, 3);
    for (const app of appsToShow) {
        const company = extractCompany(app);
        const timeAgo = app.sentAt ? getTimeAgo(app.sentAt) : "";
        const recruiter = app.recruiterEmail ? extractRecruiterName(app.recruiterEmail) : null;

        const variations: MsgDef[] = [];
        if (recruiter && company !== "a company") {
            variations.push({ text: `Reached out to ${recruiter} at ${company}${timeAgo ? ` (${timeAgo})` : ""}`, icon: Mail, type: "activity" });
        }
        if (app.emailSubject) {
            const role = app.emailSubject.length > 35 ? app.emailSubject.slice(0, 35) + "…" : app.emailSubject;
            variations.push({ text: `Applied to ${company} for ${role}${timeAgo ? ` — ${timeAgo}` : ""}`, icon: Send, type: "activity" });
        }
        variations.push({ text: `Sent a personalized pitch to ${company}${timeAgo ? ` — ${timeAgo}` : ""}`, icon: CheckCircle2, type: "success" });

        msgs.push(variations[Math.floor(Math.random() * variations.length)]);
    }

    // ========= TIER 5: Stats + milestones (category-aware) =========
    if (today > 10) {
        msgs.push({ text: `${today} personalized ${category} emails crafted today — on fire`, icon: Flame, type: "activity" });
    } else if (today > 5) {
        msgs.push({ text: `${today} tailored ${category} applications today — each one unique`, icon: Brain, type: "activity" });
    } else if (today > 0) {
        msgs.push({ text: `Carefully crafted ${today} ${category} application${today > 1 ? "s" : ""} so far today`, icon: Send, type: "activity" });
    }

    if (week >= 50) {
        msgs.push({ text: `${name}, ${week} ${category} applications this week — you're in the top 1%`, icon: Flame, type: "success" });
    } else if (week >= 20) {
        msgs.push({ text: `${week} emails sent this week targeting ${category} roles`, icon: TrendingUp, type: "success" });
    } else if (week > 0) {
        msgs.push({ text: `${week} ${category} applications this week — building momentum`, icon: TrendingUp, type: "info" });
    }

    if (month >= 100) {
        msgs.push({ text: `${month} applications this month — that's serious hustle, ${name}`, icon: Star, type: "success" });
    } else if (month >= 30) {
        msgs.push({ text: `${month} ${category} emails this month — great consistency`, icon: BarChart3, type: "success" });
    }

    if (total >= 500) {
        msgs.push({ text: `${total} total applications — you're unstoppable, ${name}`, icon: Rocket, type: "success" });
    } else if (total >= 100) {
        msgs.push({ text: `${total} ${category} applications and counting — the numbers game is working`, icon: TrendingUp, type: "success" });
    } else if (total > 0) {
        msgs.push({ text: `${total} total applications sent, building your ${category} pipeline`, icon: TrendingUp, type: "info" });
    }

    // ========= TIER 6: Company & recruiter insights =========
    if (topCompany) {
        msgs.push({ text: `${topCompany} is getting attention — applied there multiple times this week`, icon: Target, type: "info" });
    }

    if (companies.length >= 10) {
        msgs.push({ text: `${name}, you've reached ${companies.length}+ companies including ${companies[0]} and ${companies[1]}`, icon: Star, type: "success" });
    } else if (companies.length >= 3) {
        const sample = pickRandom(companies, 3).join(", ");
        msgs.push({ text: `Your pipeline includes ${sample} and more`, icon: Target, type: "info" });
    }

    if (recruiters.length >= 3) {
        const sample = pickRandom(recruiters, 2);
        msgs.push({ text: `${sample[0]}, ${sample[1]} and ${recruiters.length - 2} other recruiters have your email`, icon: Mail, type: "success" });
    }

    // ========= TIER 7: Category-specific motivation =========
    const categoryMsgs = getCategoryMessages(category, name, companies, week);
    msgs.push(...pickRandom(categoryMsgs, 2));

    // ========= TIER 8: Account lifecycle =========
    if (accountDays <= 1) {
        msgs.push({ text: `Day 1, ${name}! Let's get your ${category} career moving`, icon: Rocket, type: "greeting" });
    } else if (accountDays <= 7) {
        msgs.push({ text: `${accountDays} days in and ${total} applications — great start, ${name}`, icon: TrendingUp, type: "success" });
    } else if (accountDays >= 30 && total >= 100) {
        msgs.push({ text: `${name}, ${accountDays} days of consistent ${category} outreach — that's how jobs are won`, icon: Shield, type: "success" });
    }

    // ========= TIER 9: Health & status alerts =========
    if (rate >= 95) {
        msgs.push({ text: `${rate}% inbox delivery — your emails are landing perfectly`, icon: Shield, type: "success" });
    } else if (rate < 80 && rate > 0) {
        msgs.push({ text: `Inbox rate at ${rate}% — monitoring deliverability closely`, icon: Shield, type: "info" });
    }

    if (failed > 0 && failed <= 3) {
        msgs.push({ text: `${failed} email${failed > 1 ? "s" : ""} bounced — I'll adjust targeting`, icon: AlertCircle, type: "info" });
    } else if (failed > 3) {
        msgs.push({ text: `Heads up: ${failed} delivery issues — I'm working around them`, icon: AlertCircle, type: "info" });
    }

    if (avgDaily >= 20) {
        msgs.push({ text: `Averaging ${avgDaily} ${category} sends per day — consistent and strong`, icon: ArrowUpRight, type: "success" });
    } else if (avgDaily >= 5) {
        msgs.push({ text: `Running at ${avgDaily} ${category} emails per day — steady progress`, icon: ArrowUpRight, type: "info" });
    }

    if (pending > 0) {
        msgs.push({ text: `${pending} more ${category} emails queued up and ready to send`, icon: Clock, type: "info" });
    }

    if (data.nextBatchTime) {
        try {
            const nextBatch = new Date(data.nextBatchTime);
            const diffMins = Math.round((nextBatch.getTime() - Date.now()) / 60000);
            if (diffMins > 0 && diffMins < 120) {
                msgs.push({ text: `Next batch going out in ~${diffMins} minutes`, icon: Clock, type: "info" });
            }
        } catch { /* ignore */ }
    }

    // ========= TIER 10: Personality (MAX 2, always data-aware) =========
    const personality = getPersonalityMessages(name, category, total, companies);
    msgs.push(...pickRandom(personality, Math.min(2, personality.length)));

    return msgs;
}

/* ---- PAUSED messages (personalized) ---- */
function buildPausedQueue(data: CommentaryData): MsgDef[] {
    const name = data.userName?.split(" ")[0] || "there";
    const total = data.applicationsTotal ?? 0;
    const week = data.applicationsThisWeek ?? 0;
    const category = data.jobCategory ?? "Software Developer";
    const companies = data.uniqueCompanies ?? [];

    const msgs: MsgDef[] = [
        { text: `${name}, I'm on standby — hit play and I'll get back to finding ${category} roles`, icon: Zap, type: "info" },
        { text: "Taking a breather, but ready to fire when you are", icon: Coffee, type: "info" },
    ];
    if (total > 0) {
        msgs.push({ text: `${total} emails sent so far${companies.length > 0 ? ` to companies like ${companies[0]}` : ""} — let's keep going`, icon: TrendingUp, type: "info" });
    }
    if (week > 0) {
        msgs.push({ text: `${week} ${category} applications this week — resume me to keep pushing`, icon: BarChart3, type: "info" });
    }
    if (companies.length > 0) {
        msgs.push({ text: `${companies.length} companies in your pipeline — don't let momentum drop, ${name}`, icon: Target, type: "info" });
    }
    return msgs;
}

/* ================================================================
   HOOK — cycles through intelligent, data-driven messages
   Faster rotation: 5-8s active, 8-14s paused
   Rebuilds queue on data changes for live commentary
   ================================================================ */
export function useAICommentary(data: CommentaryData) {
    const [currentMessage, setCurrentMessage] = useState<CommentaryMessage | null>(null);
    const queueRef = useRef<MsgDef[]>([]);
    const indexRef = useRef(0);
    const dataRef = useRef(data);
    dataRef.current = data;

    const dataKey = `${data.active}-${data.isFirstLogin}-${data.applicationsToday}-${data.applicationsTotal}-${data.recentApplications?.length ?? 0}-${data.applicationsThisWeek}-${data.pendingQueue}-${data.jobCategory}-${data.uniqueCompanies?.length ?? 0}-${data.latestApplication?.company}`;
    const dataKeyRef = useRef(dataKey);

    // Rebuild queue when dataKey changes (new data from polling)
    useEffect(() => {
        if (dataKeyRef.current !== dataKey) {
            dataKeyRef.current = dataKey;
            const d = dataRef.current;
            const newQueue = d.active ? buildMessageQueue(d) : buildPausedQueue(d);
            if (queueRef.current.length > 0 && indexRef.current < newQueue.length) {
                queueRef.current = newQueue;
            } else {
                queueRef.current = newQueue;
                indexRef.current = 0;
            }
        }
    }, [dataKey]);

    // Save visit data whenever total changes
    useEffect(() => {
        if (data.applicationsTotal && data.applicationsTotal > 0) {
            saveVisitData(data.applicationsTotal);
        }
    }, [data.applicationsTotal]);

    // Cycle messages on interval
    useEffect(() => {
        const d = dataRef.current;
        const isFirstEver = d.isFirstLogin && !sessionGreeted;
        queueRef.current = isFirstEver
            ? buildFirstLoginQueue(d)
            : d.active ? buildMessageQueue(d) : buildPausedQueue(d);
        indexRef.current = 0;

        const emitNext = () => {
            const queue = queueRef.current;
            if (queue.length === 0) return;
            const msg = queue[indexRef.current % queue.length];
            indexRef.current++;
            // Mark session as greeted after first message
            if (!sessionGreeted) sessionGreeted = true;
            if (indexRef.current >= queue.length) {
                const dd = dataRef.current;
                // Rebuild and shuffle for variety on re-cycle
                const newQueue = dd.active ? buildMessageQueue(dd) : buildPausedQueue(dd);
                if (newQueue.length > 1) {
                    const [first, ...rest] = newQueue;
                    queueRef.current = [first, ...rest.sort(() => Math.random() - 0.5)];
                } else {
                    queueRef.current = newQueue;
                }
                indexRef.current = 0;
            }
            setCurrentMessage({
                id: Math.random().toString(36).substring(2, 11),
                text: msg.text,
                icon: msg.icon,
                type: msg.type,
            });
        };

        emitNext();
        // Faster, human-like pacing: 5-8s active, 8-14s paused
        const scheduleNext = () => {
            const min = data.active ? 5000 : 8000;
            const max = data.active ? 8000 : 14000;
            const delay = min + Math.random() * (max - min);
            return setTimeout(() => {
                emitNext();
                timerRef = scheduleNext();
            }, delay);
        };
        let timerRef = scheduleNext();
        return () => clearTimeout(timerRef);
    }, [data.active]);

    return currentMessage;
}

/* ================================================================
   CHAT BUBBLE — compact chat-style message from the companion
   ================================================================ */
export function AICommentaryBubble({
    message,
    speaking,
}: {
    message: CommentaryMessage | null;
    speaking: boolean;
}) {
    if (!message) return null;

    const Icon = message.icon;

    const isGreeting = message.type === "greeting";
    const bgClass = isGreeting
        ? "bg-amber-500/[0.12] border-amber-500/20"
        : message.type === "activity"
        ? "bg-[var(--color-brand-primary)]/[0.14] border-[var(--color-brand-primary)]/25"
        : message.type === "success"
        ? "bg-emerald-500/[0.14] border-emerald-500/25"
        : "bg-white/[0.12] border-white/[0.18]";

    const iconBg = isGreeting
        ? "bg-amber-500/20"
        : message.type === "activity"
        ? "bg-[var(--color-brand-primary)]/20"
        : message.type === "success"
        ? "bg-emerald-500/20"
        : "bg-white/10";

    const iconColor = isGreeting
        ? "text-amber-400"
        : message.type === "activity"
        ? "text-[var(--color-brand-primary)]"
        : message.type === "success"
        ? "text-emerald-400"
        : "text-white/60";

    const tailFill = isGreeting
        ? "rgba(245,158,11,0.12)"
        : message.type === "activity"
        ? "rgba(99,102,241,0.14)"
        : message.type === "success"
        ? "rgba(16,185,129,0.14)"
        : "rgba(255,255,255,0.12)";

    return (
        <AnimatePresence mode="wait">
            {speaking && (
                <motion.div
                    key={message.id}
                    className="relative flex items-start"
                    initial={{ opacity: 0, scale: 0.85, x: -6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -4 }}
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                >
                    {/* Triangle tail pointing left toward avatar */}
                    <svg
                        width="8" height="14" viewBox="0 0 8 14"
                        className="flex-shrink-0 mt-2 -mr-[1px]"
                    >
                        <path d="M8 0 L0 7 L8 14 Z" fill={tailFill} />
                    </svg>

                    {/* Chat bubble */}
                    <div className={`
                        relative rounded-xl rounded-tl-sm border backdrop-blur-md
                        px-2.5 py-1.5
                        ${bgClass}
                    `}>
                        <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                                <Icon className={`w-3 h-3 ${iconColor}`} />
                            </div>
                            <p className="text-[11px] font-medium text-white/90 leading-snug whitespace-nowrap">
                                {message.text}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
