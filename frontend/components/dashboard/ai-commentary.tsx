"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, TrendingUp, Zap, Target, Mail, Heart, Coffee, Rocket, Brain, LucideIcon } from "lucide-react";

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
    pendingQueue?: number;
    inboxRate?: number;
    recentApplications?: {
        emailSubject?: string;
        role?: string;
        status?: string;
        sentAt?: string;
    }[];
}

/* ---- Message generators ---- */
type MsgDef = { text: string; icon: LucideIcon; type: CommentaryMessage["type"] };

/* Module-level flag: persists across page navigations within the same session */
let sessionGreeted = false;

/* ---- Utility: pick N random items from array ---- */
function pickRandom<T>(arr: T[], n: number): T[] {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
}

/* ---- FIRST-TIME user intro sequence ---- */
function buildFirstLoginQueue(data: CommentaryData): MsgDef[] {
    const name = data.userName?.split(" ")[0] || "there";
    return [
        { text: `Hey ${name}! I'm Chitti, your AI job-hunting companion`, icon: Sparkles, type: "greeting" },
        { text: "I'll apply to jobs on your behalf while you focus on what matters", icon: Rocket, type: "info" },
        { text: "I personalize every email so recruiters actually read them", icon: Brain, type: "info" },
        { text: "My goal? Help you land a great package at a company you love", icon: Target, type: "success" },
        { text: "Just sit back — I've got the grind covered for you", icon: Zap, type: "greeting" },
    ];
}

/* ---- RETURNING user — intelligent, data-driven messages ---- */
function buildMessageQueue(data: CommentaryData): MsgDef[] {
    const msgs: MsgDef[] = [];
    const name = data.userName?.split(" ")[0] || "there";
    const today = data.applicationsToday ?? 0;
    const total = data.applicationsTotal ?? 0;
    const rate = data.inboxRate ?? 100;
    const recent = data.recentApplications ?? [];

    // 1. Smart welcome — only on first visit this session
    if (!sessionGreeted) {
        const welcomeOptions: MsgDef[] = [];
        if (today > 0) {
            welcomeOptions.push(
                { text: `${name}, I've been busy — ${today} emails sent while you were away`, icon: Send, type: "activity" },
                { text: `Welcome back ${name}! Sent ${today} applications for you today`, icon: Sparkles, type: "greeting" },
            );
        } else {
            welcomeOptions.push(
                { text: `Hey ${name}! Warming up the engines, new batch coming soon`, icon: Zap, type: "greeting" },
                { text: `${name}! I'm scanning for fresh opportunities right now`, icon: Target, type: "info" },
            );
        }
        msgs.push(...pickRandom(welcomeOptions, 1));
    }

    // 2. Work update — what Chitti has been doing
    if (today > 5) {
        msgs.push({ text: `${today} personalized emails crafted today — not a single template`, icon: Brain, type: "activity" });
    } else if (today > 0) {
        msgs.push({ text: `Carefully sent ${today} tailored application${today > 1 ? "s" : ""} so far today`, icon: Send, type: "activity" });
    }

    // 3. Show specific recent applications
    const todayApps = recent.filter(a => {
        if (!a.sentAt) return false;
        return new Date(a.sentAt).toDateString() === new Date().toDateString();
    });
    const appsToShow = todayApps.length > 0 ? todayApps.slice(0, 3) : recent.slice(0, 3);
    for (const app of appsToShow) {
        const label = app.emailSubject || "a recruiter";
        const shortLabel = label.length > 40 ? label.slice(0, 40) + "…" : label;
        msgs.push({ text: `Reached out: ${shortLabel}`, icon: Mail, type: "activity" });
    }

    // 4. Stats-driven intelligence
    if (total >= 100) {
        msgs.push({ text: `${total} applications sent — we're playing the numbers game right`, icon: TrendingUp, type: "success" });
    } else if (total > 0) {
        msgs.push({ text: `${total} total applications sent, building momentum for you`, icon: TrendingUp, type: "success" });
    }

    if (rate >= 95) {
        msgs.push({ text: `${rate}% inbox rate — your emails are landing perfectly`, icon: Zap, type: "success" });
    } else if (rate >= 80) {
        msgs.push({ text: `${rate}% inbox delivery — keeping it solid`, icon: Zap, type: "info" });
    }

    // 5. Intelligent conversational messages — Chitti's personality
    const personality: MsgDef[] = [
        { text: `Every email I send is unique — no copy-paste, ${name}`, icon: Brain, type: "info" },
        { text: "Analyzing job descriptions to match your skills perfectly", icon: Target, type: "info" },
        { text: `Your dream offer is closer than you think, ${name}`, icon: Heart, type: "greeting" },
        { text: "I never sleep — working on your applications 24/7", icon: Rocket, type: "info" },
        { text: "Optimizing subject lines for maximum open rates", icon: Sparkles, type: "info" },
        { text: `Hope you're having a great day — I've got the hustle covered`, icon: Coffee, type: "greeting" },
        { text: "Reading recruiter patterns to time your emails right", icon: Brain, type: "info" },
        { text: `${name}, one great reply is all it takes — keep going`, icon: Heart, type: "greeting" },
        { text: "Personalizing each pitch based on the job requirements", icon: Sparkles, type: "activity" },
        { text: "Queueing up the next batch of opportunities for you", icon: Target, type: "info" },
    ];
    msgs.push(...pickRandom(personality, 3));

    return msgs;
}

/* ---- PAUSED messages ---- */
function buildPausedQueue(data: CommentaryData): MsgDef[] {
    const name = data.userName?.split(" ")[0] || "there";
    const total = data.applicationsTotal ?? 0;
    const msgs: MsgDef[] = [
        { text: `${name}, I'm on standby — hit play and I'll get back to work`, icon: Zap, type: "info" },
        { text: "Taking a breather, but ready to fire when you are", icon: Coffee, type: "info" },
        { text: "Paused for now — your pipeline is safe with me", icon: Target, type: "info" },
    ];
    if (total > 0) {
        msgs.push({ text: `${total} emails sent so far — let's keep the streak going`, icon: TrendingUp, type: "info" });
    }
    return msgs;
}

/* ================================================================
   HOOK — cycles through intelligent, data-driven messages
   ================================================================ */
export function useAICommentary(data: CommentaryData) {
    const [currentMessage, setCurrentMessage] = useState<CommentaryMessage | null>(null);
    const queueRef = useRef<MsgDef[]>([]);
    const indexRef = useRef(0);
    const dataRef = useRef(data);
    dataRef.current = data;

    const dataKey = `${data.active}-${data.isFirstLogin}-${data.applicationsToday}-${data.applicationsTotal}-${data.recentApplications?.length ?? 0}`;
    const dataKeyRef = useRef(dataKey);

    // Rebuild queue when dataKey changes
    useEffect(() => {
        if (dataKeyRef.current !== dataKey) {
            dataKeyRef.current = dataKey;
            const d = dataRef.current;
            queueRef.current = d.active ? buildMessageQueue(d) : buildPausedQueue(d);
            indexRef.current = 0;
        }
    }, [dataKey]);

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
                // After first-login intro completes, switch to regular messages
                queueRef.current = dd.active ? buildMessageQueue(dd) : buildPausedQueue(dd);
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
        // Human-like pacing: random interval between messages (12–20s active, 20–30s paused)
        const scheduleNext = () => {
            const min = data.active ? 12000 : 20000;
            const max = data.active ? 20000 : 30000;
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
