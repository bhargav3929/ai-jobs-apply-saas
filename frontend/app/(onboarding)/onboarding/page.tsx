"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft, ArrowRight, Upload, Mail, Briefcase, CheckCircle2, Loader2,
    Link2, GitBranchPlus, Globe, Shield, Sparkles, Code2,
    Megaphone, Palette, Lock, ExternalLink, FileText,
    Zap, Send, Target, TrendingUp, Rocket, PartyPopper
} from "lucide-react";
import { uploadResume, startJobScrape, verifySmtp, saveUserLinks } from "@/lib/api";
import { useAuth } from "@/contexts";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const steps = [
    { id: 1, title: "Target Role", description: "Choose the role category your AI agent will target", icon: Briefcase },
    { id: 2, title: "Your Resume", description: "Upload your resume so AI can personalize every email", icon: FileText },
    { id: 3, title: "Your Links", description: "Add portfolio or GitHub to boost response rates", icon: Link2 },
    { id: 4, title: "Connect Gmail", description: "Send 600+ applications from your own inbox", icon: Mail },
];

const jobCategories = [
    { value: "Software Developer", label: "Software Developer", icon: Code2, description: "Frontend, Backend, Full Stack", color: "from-violet-500 to-purple-600", jobs: "2,400+" },
    { value: "AI/ML Engineer", label: "AI / ML Engineer", icon: Sparkles, description: "Machine Learning, Data Science, AI", color: "from-cyan-500 to-blue-600", jobs: "1,800+" },
    { value: "Marketing/Sales", label: "Marketing / Sales", icon: Megaphone, description: "Digital Marketing, Growth, BDR, Sales", color: "from-orange-500 to-amber-600", jobs: "2,200+" },
    { value: "Design", label: "UI/UX Designer", icon: Palette, description: "Product Design, Visual, UX", color: "from-indigo-500 to-violet-600", jobs: "800+" },
];

// Engagement messages shown after completing steps
const engagementMessages: Record<number, { icon: typeof Sparkles; title: string; subtitle: string; color: string }> = {
    1: { icon: Target, title: "Locked in!", subtitle: "Your AI agent will now only target relevant roles — zero noise.", color: "text-[var(--color-brand-primary)]" },
    2: { icon: TrendingUp, title: "Profile strength: Strong", subtitle: "Your resume matches 100+ open positions posted this week.", color: "text-[var(--color-success)]" },
    3: { icon: Rocket, title: "Response rate +2x", subtitle: "Applications with links get significantly more recruiter replies.", color: "text-[var(--color-warning)]" },
};

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
    const [showEngagement, setShowEngagement] = useState(false);
    const router = useRouter();

    const [jobCategory, setJobCategory] = useState("");
    const [resumeFile, setResumeFile] = useState<File | null>(null);
    const [parsedSkills, setParsedSkills] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [smtpEmail, setSmtpEmail] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");
    const { user, refreshUserProfile } = useAuth();

    const [extractedLinks, setExtractedLinks] = useState<{ github?: string; portfolio?: string }>({});
    const [wantsToAddLinks, setWantsToAddLinks] = useState<boolean | null>(null);
    const [githubLink, setGithubLink] = useState("");
    const [portfolioLink, setPortfolioLink] = useState("");

    const maxSteps = steps.length;

    // Show engagement message briefly when arriving at a new step
    useEffect(() => {
        if (completedSteps.has(currentStep - 1) && engagementMessages[currentStep - 1]) {
            setShowEngagement(true);
            const timer = setTimeout(() => setShowEngagement(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [currentStep, completedSteps]);

    const handleNext = async () => {
        if (currentStep === 3) {
            const links: { github?: string; portfolio?: string } = {};
            if (githubLink.trim()) links.github = githubLink.trim();
            if (portfolioLink.trim()) links.portfolio = portfolioLink.trim();
            if (Object.keys(links).length > 0) {
                try { await saveUserLinks(links); } catch (e) { console.warn("Failed to save links", e); }
            }
        }

        setCompletedSteps((prev) => new Set(prev).add(currentStep));

        if (currentStep < maxSteps) {
            setCurrentStep((prev) => prev + 1);
        } else {
            await handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep((prev) => prev - 1);
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            if (!user) throw new Error("No user found");
            if (!db) throw new Error("Firestore not initialized");

            if (smtpEmail && smtpPassword) {
                try {
                    await verifySmtp(smtpEmail, smtpPassword);
                } catch (error: any) {
                    alert(`SMTP Connection Failed: ${error.message}\nPlease check your email and app password.`);
                    setLoading(false);
                    return;
                }
            }

            try {
                const timeoutPromise = new Promise((_, reject) => { setTimeout(() => reject(new Error("Timeout")), 5000); });
                await Promise.race([
                    updateDoc(doc(db, "users", user.uid), { jobCategory, skills: parsedSkills, onboardingCompleted: true, isActive: true }),
                    timeoutPromise
                ]);
            } catch (error) { console.warn("Firestore save failed (non-critical)", error); }

            try { await startJobScrape(jobCategory, "Remote"); } catch (error) { console.error("Job scrape failed", error); }

            await refreshUserProfile();
            router.push("/dashboard");
        } catch (error) {
            console.error("Onboarding failed:", error);
            if (user) router.push("/dashboard");
            else alert("Something went wrong. Please try again.");
        } finally { setLoading(false); }
    };

    const [uploadError, setUploadError] = useState("");

    const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadError("");
            if (file.size > 5 * 1024 * 1024) { setUploadError("File too large. Maximum size is 5MB."); return; }
            if (file.type !== "application/pdf") { setUploadError("Only PDF files are accepted."); return; }
            setUploading(true);
            try {
                const result = await uploadResume(file);
                if (result.extracted_skills) setParsedSkills(result.extracted_skills);
                if (result.extracted_links) {
                    setExtractedLinks(result.extracted_links);
                    if (result.extracted_links.github) setGithubLink(result.extracted_links.github);
                    if (result.extracted_links.portfolio) setPortfolioLink(result.extracted_links.portfolio);
                }
                setResumeFile(file);
            } catch (err) { console.error("Resume parse failed:", err); setUploadError("Failed to upload. Please try again."); }
            finally { setUploading(false); }
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1: return !!jobCategory;
            case 2: return !!resumeFile;
            case 3: return true;
            case 4: return !!smtpEmail && !!smtpPassword;
            default: return false;
        }
    };

    const hasExtractedLinks = !!(extractedLinks.github || extractedLinks.portfolio);
    const selectedCategory = jobCategories.find(c => c.value === jobCategory);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* ───── Step Indicators ───── */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between max-w-xl mx-auto">
                    {steps.map((step, i) => (
                        <div key={step.id} className="flex items-center flex-1 last:flex-none">
                            <div className="flex flex-col items-center gap-2">
                                <motion.div
                                    animate={{ scale: currentStep === step.id ? 1.08 : 1 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                        currentStep > step.id
                                            ? "bg-[var(--color-success)] shadow-[0_4px_12px_rgba(34,197,94,0.25)]"
                                            : currentStep === step.id
                                                ? "bg-[var(--color-brand-primary)] shadow-[0_4px_16px_rgba(99,102,241,0.3)]"
                                                : "bg-white border-2 border-[var(--color-border-subtle)]"
                                    }`}
                                >
                                    {currentStep > step.id ? (
                                        <motion.div
                                            initial={{ scale: 0, rotate: -90 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                        >
                                            <CheckCircle2 className="w-5 h-5 text-white" />
                                        </motion.div>
                                    ) : (
                                        <step.icon className={`w-4.5 h-4.5 ${
                                            currentStep === step.id ? "text-white" : "text-[var(--color-text-tertiary)]"
                                        }`} />
                                    )}
                                </motion.div>
                                <p className={`text-[10px] font-semibold tracking-wide transition-colors duration-300 ${
                                    currentStep >= step.id ? "text-[var(--color-brand-dark)]" : "text-[var(--color-text-tertiary)]"
                                }`}>
                                    {step.title}
                                </p>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="flex-1 h-[2px] mx-3 mt-[-1.25rem] rounded-full overflow-hidden bg-[var(--color-border-subtle)]">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: currentStep > step.id ? "100%" : "0%" }}
                                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                        className="h-full bg-[var(--color-success)] rounded-full"
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* ───── Engagement Banner (between steps) ───── */}
            <AnimatePresence>
                {showEngagement && engagementMessages[currentStep - 1] && (() => {
                    const msg = engagementMessages[currentStep - 1];
                    return (
                        <motion.div
                            initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 16 }}
                            exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-[var(--color-border-subtle)] shadow-sm">
                                <div className={`w-8 h-8 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0`}>
                                    <msg.icon className={`w-4 h-4 ${msg.color}`} />
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-xs font-bold ${msg.color}`}>{msg.title}</p>
                                    <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">{msg.subtitle}</p>
                                </div>
                                <div className="ml-auto">
                                    <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                                </div>
                            </div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* ───── Main Content Card ───── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-3xl border border-[var(--color-border-subtle)] shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden"
            >
                {/* Header */}
                <div className="px-8 md:px-10 pt-8 pb-6 border-b border-[var(--color-border-subtle)]">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`header-${currentStep}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="flex items-start justify-between"
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px w-6 bg-[var(--color-brand-primary)]" />
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-brand-primary)]">
                                        Step {currentStep} of {maxSteps}
                                    </p>
                                </div>
                                <h2 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-[-0.025em] mb-1">
                                    {steps[currentStep - 1].title}
                                </h2>
                                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                                    {steps[currentStep - 1].description}
                                </p>
                            </div>
                            {/* Progress ring */}
                            <div className="hidden sm:block flex-shrink-0">
                                <div className="relative w-14 h-14">
                                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                                        <circle cx="28" cy="28" r="24" fill="none" stroke="var(--color-border-subtle)" strokeWidth="3" />
                                        <motion.circle
                                            cx="28" cy="28" r="24" fill="none"
                                            stroke="var(--color-brand-primary)" strokeWidth="3" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 24}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - currentStep / maxSteps) }}
                                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[var(--color-brand-primary)]">
                                        {Math.round((currentStep / maxSteps) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Content */}
                <div className="px-8 md:px-10 py-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -16 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* ═══ Step 1: Job Categories ═══ */}
                            {currentStep === 1 && (
                                <div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                                        {jobCategories.map((cat, i) => (
                                            <motion.button
                                                key={cat.value}
                                                initial={{ opacity: 0, scale: 0.92 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                                                onClick={() => setJobCategory(cat.value)}
                                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 group cursor-pointer ${
                                                    jobCategory === cat.value
                                                        ? "border-[var(--color-brand-primary)] bg-[var(--color-brand-primary)]/[0.04] shadow-[0_4px_20px_rgba(99,102,241,0.12)]"
                                                        : "border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)]/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
                                                }`}
                                            >
                                                {jobCategory === cat.value && (
                                                    <motion.div
                                                        initial={{ scale: 0 }}
                                                        animate={{ scale: 1 }}
                                                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                                        className="absolute top-2.5 right-2.5"
                                                    >
                                                        <div className="w-5 h-5 rounded-full bg-[var(--color-brand-primary)] flex items-center justify-center">
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        </div>
                                                    </motion.div>
                                                )}
                                                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-3 shadow-sm group-hover:shadow-md transition-shadow`}>
                                                    <cat.icon className="w-4 h-4 text-white" />
                                                </div>
                                                <p className="text-[0.8rem] font-semibold text-[var(--color-brand-dark)] mb-0.5 leading-tight">{cat.label}</p>
                                                <p className="text-[10px] text-[var(--color-text-tertiary)] leading-snug">{cat.description}</p>
                                            </motion.button>
                                        ))}
                                        {/* Placeholder */}
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.92 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.35 }}
                                            className="p-4 rounded-2xl bg-[var(--color-surface)]/60 border border-dashed border-[var(--color-border-subtle)] flex flex-col items-center justify-center text-center"
                                        >
                                            <Target className="w-4 h-4 text-[var(--color-text-tertiary)] mb-1.5" />
                                            <p className="text-[10px] text-[var(--color-text-tertiary)] leading-snug">More roles coming soon</p>
                                        </motion.div>
                                    </div>

                                    {/* Dynamic info when category selected */}
                                    <AnimatePresence>
                                        {selectedCategory && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                                className="overflow-hidden"
                                            >
                                                <div className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--color-brand-primary)]/[0.04] border border-[var(--color-brand-primary)]/10">
                                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedCategory.color} flex items-center justify-center shadow-sm flex-shrink-0`}>
                                                        <selectedCategory.icon className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[var(--color-brand-dark)]">{selectedCategory.label}</p>
                                                        <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                                            {selectedCategory.jobs} jobs posted this month · AI will match your skills automatically
                                                        </p>
                                                    </div>
                                                    <div className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[var(--color-success)]/10">
                                                        <p className="text-[10px] font-bold text-[var(--color-success)] uppercase tracking-wider">Active</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* ═══ Step 2: Resume Upload ═══ */}
                            {currentStep === 2 && (
                                <div className="space-y-5">
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={!resumeFile && !uploading ? { scale: 1.005, borderColor: "var(--color-brand-primary)" } : {}}
                                        className={`
                                            relative border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 overflow-hidden
                                            ${resumeFile
                                                ? "border-[var(--color-success)] bg-[var(--color-success)]/[0.03]"
                                                : "border-[var(--color-border-subtle)] hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary)]/[0.02]"
                                            }
                                        `}
                                        onClick={() => document.getElementById("resume-upload")?.click()}
                                    >
                                        {!resumeFile && !uploading && (
                                            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                                        )}
                                        <input id="resume-upload" type="file" accept=".pdf" className="hidden" onChange={handleResumeUpload} />

                                        {uploading ? (
                                            <div className="flex flex-col items-center relative z-10">
                                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mb-4">
                                                    <Loader2 className="w-7 h-7 animate-spin text-[var(--color-brand-primary)]" />
                                                </div>
                                                <p className="text-sm font-semibold text-[var(--color-brand-dark)] mb-1">Analyzing your resume...</p>
                                                <p className="text-xs text-[var(--color-text-tertiary)]">Extracting skills, links & experience</p>
                                                <div className="mt-4 w-48 h-1.5 rounded-full bg-[var(--color-border-subtle)] overflow-hidden">
                                                    <motion.div className="h-full bg-[var(--color-brand-primary)] rounded-full" initial={{ width: "0%" }} animate={{ width: "70%" }} transition={{ duration: 2 }} />
                                                </div>
                                            </div>
                                        ) : resumeFile ? (
                                            <div className="relative z-10">
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 15 }} className="w-14 h-14 rounded-2xl bg-[var(--color-success)]/10 flex items-center justify-center mb-4 mx-auto">
                                                    <CheckCircle2 className="w-7 h-7 text-[var(--color-success)]" />
                                                </motion.div>
                                                <h3 className="text-sm font-semibold text-[var(--color-brand-dark)] mb-1">{resumeFile.name}</h3>
                                                <p className="text-xs text-[var(--color-text-tertiary)]">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB — Successfully parsed</p>
                                                <Button variant="link" className="text-[var(--color-error)] mt-3 text-xs h-auto p-0" onClick={(e) => { e.stopPropagation(); setResumeFile(null); setParsedSkills([]); setExtractedLinks({}); }}>
                                                    Remove & re-upload
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="relative z-10">
                                                <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mb-4 mx-auto">
                                                    <Upload className="w-7 h-7 text-[var(--color-brand-primary)]" />
                                                </div>
                                                <h3 className="text-sm font-semibold text-[var(--color-brand-dark)] mb-1">Drop your resume here or click to browse</h3>
                                                <p className="text-xs text-[var(--color-text-tertiary)]">PDF only · Max 5MB</p>
                                            </div>
                                        )}
                                    </motion.div>

                                    {uploadError && (
                                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
                                            <p className="text-sm text-[var(--color-error)] text-center">{uploadError}</p>
                                        </motion.div>
                                    )}

                                    {parsedSkills.length > 0 && (
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Zap className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)]">Skills extracted</p>
                                                <span className="ml-auto text-[10px] font-medium text-[var(--color-text-tertiary)]">{parsedSkills.length} found</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {parsedSkills.map((skill, i) => (
                                                    <motion.span key={skill} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.03 }}
                                                        className="px-3 py-1.5 rounded-lg bg-white border border-[var(--color-border-subtle)] text-[11px] font-medium text-[var(--color-text-secondary)] shadow-sm">
                                                        {skill}
                                                    </motion.span>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            )}

                            {/* ═══ Step 3: Links ═══ */}
                            {currentStep === 3 && (
                                <div className="space-y-5">
                                    {hasExtractedLinks && (
                                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl bg-[var(--color-success)]/[0.04] border border-[var(--color-success)]/15">
                                            <div className="flex items-center gap-2 mb-3">
                                                <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
                                                <p className="text-sm font-semibold text-[var(--color-success)]">Links found in your resume</p>
                                            </div>
                                            <div className="space-y-2">
                                                {extractedLinks.github && (
                                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[var(--color-border-subtle)]">
                                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                                                            <GitBranchPlus className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                                        </div>
                                                        <span className="text-sm text-[var(--color-text-secondary)] truncate">{extractedLinks.github}</span>
                                                        <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] ml-auto flex-shrink-0" />
                                                    </div>
                                                )}
                                                {extractedLinks.portfolio && (
                                                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-[var(--color-border-subtle)]">
                                                        <div className="w-7 h-7 rounded-lg bg-[var(--color-surface)] flex items-center justify-center flex-shrink-0">
                                                            <Globe className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                                                        </div>
                                                        <span className="text-sm text-[var(--color-text-secondary)] truncate">{extractedLinks.portfolio}</span>
                                                        <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] ml-auto flex-shrink-0" />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {!hasExtractedLinks && wantsToAddLinks === null && (
                                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                                            <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center mx-auto mb-4">
                                                <Link2 className="w-7 h-7 text-[var(--color-brand-primary)]" />
                                            </div>
                                            <p className="text-sm font-medium text-[var(--color-brand-dark)] mb-1">No links found in your resume</p>
                                            <p className="text-xs text-[var(--color-text-tertiary)] mb-6 max-w-sm mx-auto">Applications with a portfolio or GitHub get 2x more recruiter responses.</p>
                                            <div className="flex gap-3 justify-center">
                                                <Button onClick={() => setWantsToAddLinks(true)} className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] rounded-xl px-6 h-11 text-sm font-semibold shadow-sm hover:shadow-md transition-all">
                                                    <ExternalLink className="w-4 h-4 mr-2" /> Add links
                                                </Button>
                                                <Button variant="outline" onClick={() => setWantsToAddLinks(false)} className="rounded-xl px-6 h-11 text-sm border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]">
                                                    Skip for now
                                                </Button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {(hasExtractedLinks || wantsToAddLinks === true) && (
                                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-[var(--color-text-primary)]">GitHub Profile</Label>
                                                <div className="relative">
                                                    <GitBranchPlus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                                    <Input placeholder="https://github.com/yourusername" value={githubLink} onChange={(e) => setGithubLink(e.target.value)}
                                                        className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-[var(--color-text-primary)]">Portfolio Website</Label>
                                                <div className="relative">
                                                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                                    <Input placeholder="https://yourportfolio.com" value={portfolioLink} onChange={(e) => setPortfolioLink(e.target.value)}
                                                        className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]" />
                                                </div>
                                            </div>

                                            {/* Response rate boost indicator */}
                                            <motion.div
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.2 }}
                                                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-[var(--color-warning)]/[0.06] to-transparent border border-[var(--color-warning)]/10"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-[var(--color-warning)]/10 flex items-center justify-center flex-shrink-0">
                                                    <TrendingUp className="w-5 h-5 text-[var(--color-warning)]" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-[var(--color-warning)]">
                                                        {githubLink || portfolioLink ? "Response rate boosted!" : "Add links to boost response rate"}
                                                    </p>
                                                    <p className="text-[11px] text-[var(--color-text-tertiary)]">
                                                        {githubLink || portfolioLink
                                                            ? "Your applications will now include relevant links — recruiters love this."
                                                            : "Recruiters are 2x more likely to respond when they can see your work."}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}

                                    {wantsToAddLinks === false && !hasExtractedLinks && (
                                        <div className="text-center py-4 text-xs text-[var(--color-text-tertiary)]">No worries — you can add links later in Settings.</div>
                                    )}
                                </div>
                            )}

                            {/* ═══ Step 4: Gmail SMTP ═══ */}
                            {currentStep === 4 && (
                                <div className="space-y-5">
                                    {/* Almost there banner */}
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.96 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--color-success)]/[0.06] to-transparent border border-[var(--color-success)]/15"
                                    >
                                        <PartyPopper className="w-5 h-5 text-[var(--color-success)] flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-[var(--color-success)]">Almost there — one last step!</p>
                                            <p className="text-[11px] text-[var(--color-text-tertiary)]">Connect your Gmail and your AI agent starts working tomorrow morning.</p>
                                        </div>
                                    </motion.div>

                                    {/* Security info */}
                                    <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--color-brand-primary)]/[0.04] border border-[var(--color-brand-primary)]/10">
                                        <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-primary)]/10 flex items-center justify-center flex-shrink-0">
                                            <Shield className="w-5 h-5 text-[var(--color-brand-primary)]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-[var(--color-brand-dark)] mb-0.5">Encrypted with AES-256</p>
                                            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                                                We use a Gmail App Password — not your real password. Revoke it from Google anytime.{" "}
                                                <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] font-medium hover:underline">
                                                    How to generate one →
                                                </a>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-[var(--color-text-primary)]">Gmail Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                                <Input placeholder="you@gmail.com" value={smtpEmail} onChange={(e) => setSmtpEmail(e.target.value)}
                                                    className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-[var(--color-text-primary)]">App Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                                                <Input type="password" placeholder="xxxx xxxx xxxx xxxx" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)}
                                                    className="pl-10 h-12 rounded-xl border-[var(--color-border-subtle)] focus:border-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]/20 bg-[var(--color-surface)]" />
                                            </div>
                                            <p className="text-[11px] text-[var(--color-text-tertiary)] flex items-center gap-1.5">
                                                <Lock className="w-3 h-3" /> 16-character App Password from Google — not your regular password
                                            </p>
                                        </div>
                                    </div>

                                    {/* What happens next */}
                                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                                        className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--color-brand-primary)] mb-3">What happens next</p>
                                        <div className="space-y-2.5">
                                            {[
                                                { icon: Send, text: "20 personalized emails sent every morning", color: "text-[var(--color-brand-primary)]" },
                                                { icon: Mail, text: "98% land in recruiter's Primary inbox", color: "text-[var(--color-success)]" },
                                                { icon: Sparkles, text: "Wake up to interview invites in your inbox", color: "text-[var(--color-warning)]" },
                                            ].map((item, i) => (
                                                <motion.div key={item.text} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.1 }} className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded-lg bg-white border border-[var(--color-border-subtle)] flex items-center justify-center flex-shrink-0">
                                                        <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                                                    </div>
                                                    <span className="text-xs text-[var(--color-text-secondary)]">{item.text}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-8 md:px-10 py-5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)]/40 flex items-center justify-between">
                    <Button variant="ghost" onClick={handleBack} disabled={currentStep === 1 || loading} className="text-[var(--color-text-secondary)] rounded-xl h-11 px-5 text-sm hover:bg-[var(--color-surface)]">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button onClick={handleNext} disabled={!isStepValid() || loading}
                        className="bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-hover)] text-white rounded-xl h-11 px-7 text-sm font-semibold shadow-sm hover:shadow-md transition-all group min-w-[150px]">
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : currentStep === maxSteps ? (
                            <><Rocket className="w-4 h-4 mr-2" /> Launch My Agent</>
                        ) : (
                            <>Continue <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" /></>
                        )}
                    </Button>
                </div>
            </motion.div>

            {/* Bottom helper */}
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center text-[11px] text-[var(--color-text-tertiary)] mt-6">
                {currentStep === 1 && "You can change your target role anytime from Settings."}
                {currentStep === 2 && "Your resume is only used to personalize emails — never shared publicly."}
                {currentStep === 3 && "Links are optional but recommended for higher response rates."}
                {currentStep === 4 && "You can revoke the App Password from your Google account at any time."}
            </motion.p>
        </div>
    );
}
