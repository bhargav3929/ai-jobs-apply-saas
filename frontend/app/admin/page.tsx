"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const JOB_CATEGORIES = [
    "Software Developer",
    "AI/ML Engineer",
    "Marketing",
    "Customer Support",
    "Design",
    "Data Analyst",
];

interface Stats {
    totalUsers: number;
    activeUsers: number;
    applicationsToday: number;
    jobsScrapedToday: number;
    jobsWithEmail: number;
    recentUsers: {
        uid: string;
        email: string;
        name: string;
        isActive: boolean;
        jobCategory: string;
        applicationsToday: number;
        applicationsTotal: number;
    }[];
}

interface LogEntry {
    type: string;
    level: string;
    message: string;
    timestamp: string;
    errorType?: string;
    metadata?: Record<string, unknown>;
}

interface JobEntry {
    jobId: string;
    title: string;
    company: string;
    recruiterEmail: string;
    jobCategory: string;
    applicationCount: number;
    scrapedAt: string;
    linkedinUrl: string;
    postText: string;
}

interface AppEntry {
    applicationId: string;
    userId: string;
    jobId: string;
    emailSubject: string;
    sentToEmail: string;
    status: string;
    sentAt: string;
}

function getAuthHeader(username: string, password: string) {
    return "Basic " + btoa(`${username}:${password}`);
}

export default function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [authHeader, setAuthHeader] = useState("");

    const [activeTab, setActiveTab] = useState<"overview" | "jobs" | "applications" | "logs">("overview");
    const [stats, setStats] = useState<Stats | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [jobs, setJobs] = useState<JobEntry[]>([]);
    const [applications, setApplications] = useState<AppEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState("");
    const [showScrapeModal, setShowScrapeModal] = useState(false);
    const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(
        () => Object.fromEntries(JOB_CATEGORIES.map((c) => [c, 10]))
    );

    const handleLogin = async () => {
        setLoginError("");
        const header = getAuthHeader(username, password);
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: "POST",
                headers: { Authorization: header },
            });
            if (!res.ok) {
                setLoginError("Invalid credentials");
                return;
            }
            setAuthHeader(header);
            setIsLoggedIn(true);
        } catch {
            setLoginError("Cannot reach backend server");
        }
    };

    const fetchData = useCallback(async (endpoint: string) => {
        const res = await fetch(`${API_URL}/admin/${endpoint}`, {
            headers: { Authorization: authHeader },
        });
        if (!res.ok) throw new Error(`Failed to fetch ${endpoint}`);
        return res.json();
    }, [authHeader]);

    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchData("overview");
            setStats(data);
        } catch (e: unknown) {
            setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        setLoading(false);
    }, [fetchData]);

    const loadTab = useCallback(async (tab: string) => {
        setLoading(true);
        try {
            if (tab === "overview") {
                const data = await fetchData("overview");
                setStats(data);
            } else if (tab === "jobs") {
                setJobs(await fetchData("jobs"));
            } else if (tab === "applications") {
                setApplications(await fetchData("applications"));
            } else if (tab === "logs") {
                setLogs(await fetchData("logs"));
            }
        } catch (e: unknown) {
            setActionMessage(`Error loading ${tab}: ${e instanceof Error ? e.message : String(e)}`);
        }
        setLoading(false);
    }, [fetchData]);

    const triggerAction = async (action: string) => {
        setActionMessage("");
        try {
            const res = await fetch(`${API_URL}/admin/trigger/${action}`, {
                method: "POST",
                headers: { Authorization: authHeader },
            });
            const data = await res.json();
            setActionMessage(data.message || "Action triggered");
            // Refresh overview after a delay
            setTimeout(() => loadOverview(), 3000);
        } catch (e: unknown) {
            setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const switchTab = (tab: "overview" | "jobs" | "applications" | "logs") => {
        setActiveTab(tab);
        loadTab(tab);
    };

    // Login screen
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-sm">
                    <h1 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h1>
                    <p className="text-gray-400 text-sm mb-6">JobAgent.ai Control Panel</p>
                    <div className="space-y-4">
                        <div>
                            <label className="text-gray-300 text-sm block mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            />
                        </div>
                        <div>
                            <label className="text-gray-300 text-sm block mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                            />
                        </div>
                        {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
                        <button
                            onClick={handleLogin}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
                        >
                            Login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Dashboard
    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">JobAgent.ai Admin</h1>
                <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm">admin</span>
                    <button
                        onClick={() => { setIsLoggedIn(false); setAuthHeader(""); }}
                        className="text-gray-400 hover:text-white text-sm"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-gray-900 border-b border-gray-800 px-6">
                <div className="flex gap-1">
                    {(["overview", "jobs", "applications", "logs"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => switchTab(tab)}
                            className={`px-4 py-3 text-sm font-medium capitalize transition border-b-2 ${
                                activeTab === tab
                                    ? "border-blue-500 text-blue-400"
                                    : "border-transparent text-gray-400 hover:text-white"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6">
                {/* Action Message */}
                {actionMessage && (
                    <div className="mb-4 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
                        {actionMessage}
                    </div>
                )}

                {loading && <p className="text-gray-400 mb-4">Loading...</p>}

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div>
                        {/* Action Buttons */}
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setShowScrapeModal(true)}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                                Trigger Scrape
                            </button>
                            <button
                                onClick={() => triggerAction("distribute")}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                                Trigger Distribute
                            </button>
                            <button
                                onClick={() => loadOverview()}
                                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                                Refresh Stats
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm("Are you sure? This will delete ALL scraped jobs from the database.")) return;
                                    try {
                                        const res = await fetch(`${API_URL}/admin/erase-jobs`, {
                                            method: "DELETE",
                                            headers: { Authorization: authHeader },
                                        });
                                        const data = await res.json();
                                        setActionMessage(data.message || "Done");
                                        setTimeout(() => loadOverview(), 1000);
                                    } catch (e: unknown) {
                                        setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                            >
                                Erase Jobs DB
                            </button>
                        </div>

                        {/* Stats Cards */}
                        {stats && (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                                    <StatCard label="Total Users" value={stats.totalUsers} />
                                    <StatCard label="Active Users" value={stats.activeUsers} />
                                    <StatCard label="Apps Today" value={stats.applicationsToday} />
                                    <StatCard label="Jobs Scraped" value={stats.jobsScrapedToday} />
                                    <StatCard label="Jobs w/ Email" value={stats.jobsWithEmail} />
                                </div>

                                {/* Recent Users Table */}
                                <h2 className="text-lg font-semibold mb-3">Users</h2>
                                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-gray-800 text-gray-400">
                                                <th className="text-left px-4 py-2">Name</th>
                                                <th className="text-left px-4 py-2">Email</th>
                                                <th className="text-left px-4 py-2">Category</th>
                                                <th className="text-left px-4 py-2">Active</th>
                                                <th className="text-left px-4 py-2">Today</th>
                                                <th className="text-left px-4 py-2">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentUsers.map((u) => (
                                                <tr key={u.uid} className="border-t border-gray-800">
                                                    <td className="px-4 py-2 text-white">{u.name}</td>
                                                    <td className="px-4 py-2 text-gray-300">{u.email}</td>
                                                    <td className="px-4 py-2 text-gray-400">{u.jobCategory}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                                                            {u.isActive ? "Active" : "Paused"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-300">{u.applicationsToday}</td>
                                                    <td className="px-4 py-2 text-gray-300">{u.applicationsTotal}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {!stats && !loading && (
                            <p className="text-gray-500">Click &quot;Refresh Stats&quot; to load data.</p>
                        )}
                    </div>
                )}

                {/* Jobs Tab */}
                {activeTab === "jobs" && (
                    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-800 text-gray-400">
                                    <th className="text-left px-4 py-2">Title</th>
                                    <th className="text-left px-4 py-2">Company</th>
                                    <th className="text-left px-4 py-2">Email</th>
                                    <th className="text-left px-4 py-2">Category</th>
                                    <th className="text-left px-4 py-2">Apps</th>
                                    <th className="text-left px-4 py-2">Scraped</th>
                                    <th className="text-left px-4 py-2">Link</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs.map((j) => (
                                    <tr key={j.jobId} className="border-t border-gray-800">
                                        <td className="px-4 py-2 text-white">{j.title}</td>
                                        <td className="px-4 py-2 text-gray-300">{j.company}</td>
                                        <td className="px-4 py-2 text-gray-400">{j.recruiterEmail}</td>
                                        <td className="px-4 py-2 text-gray-400">{j.jobCategory}</td>
                                        <td className="px-4 py-2 text-gray-300">{j.applicationCount}</td>
                                        <td className="px-4 py-2 text-gray-500">{j.scrapedAt ? new Date(j.scrapedAt).toLocaleString() : ""}</td>
                                        <td className="px-4 py-2">
                                            {j.linkedinUrl ? (
                                                <a href={j.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                                                    View
                                                </a>
                                            ) : "-"}
                                        </td>
                                    </tr>
                                ))}
                                {jobs.length === 0 && !loading && (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No jobs found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Applications Tab */}
                {activeTab === "applications" && (
                    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-800 text-gray-400">
                                    <th className="text-left px-4 py-2">Subject</th>
                                    <th className="text-left px-4 py-2">Sent To</th>
                                    <th className="text-left px-4 py-2">Status</th>
                                    <th className="text-left px-4 py-2">Sent At</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map((a) => (
                                    <tr key={a.applicationId} className="border-t border-gray-800">
                                        <td className="px-4 py-2 text-white">{a.emailSubject}</td>
                                        <td className="px-4 py-2 text-gray-300">{a.sentToEmail}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                                a.status === "sent" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                                            }`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500">{a.sentAt ? new Date(a.sentAt).toLocaleString() : ""}</td>
                                    </tr>
                                ))}
                                {applications.length === 0 && !loading && (
                                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No applications found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === "logs" && (
                    <div className="space-y-2">
                        {logs.map((log, i) => (
                            <div key={i} className={`bg-gray-900 border rounded-lg p-3 text-sm ${
                                log.level === "error" ? "border-red-800" : "border-gray-800"
                            }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                        log.level === "error" ? "bg-red-900 text-red-300" : "bg-blue-900 text-blue-300"
                                    }`}>
                                        {log.type}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                                    </span>
                                </div>
                                <p className="text-gray-300">{log.message}</p>
                                {log.errorType && <p className="text-red-400 text-xs mt-1">Error: {log.errorType}</p>}
                                {log.metadata && (
                                    <pre className="text-gray-500 text-xs mt-1">{JSON.stringify(log.metadata, null, 2)}</pre>
                                )}
                            </div>
                        ))}
                        {logs.length === 0 && !loading && (
                            <p className="text-gray-500">No logs found</p>
                        )}
                    </div>
                )}
            </div>

            <ScrapeModal
                open={showScrapeModal}
                onClose={() => setShowScrapeModal(false)}
                categoryLimits={categoryLimits}
                setCategoryLimits={setCategoryLimits}
                authHeader={authHeader}
                onSuccess={(msg) => {
                    setActionMessage(msg);
                    setTimeout(() => loadOverview(), 3000);
                }}
            />
        </div>
    );
}

function ScrapeModal({
    open,
    onClose,
    categoryLimits,
    setCategoryLimits,
    authHeader,
    onSuccess,
}: {
    open: boolean;
    onClose: () => void;
    categoryLimits: Record<string, number>;
    setCategoryLimits: (v: Record<string, number>) => void;
    authHeader: string;
    onSuccess: (msg: string) => void;
}) {
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const handleStart = async () => {
        setSubmitting(true);
        try {
            const res = await fetch(`${API_URL}/admin/trigger/scrape`, {
                method: "POST",
                headers: {
                    Authorization: authHeader,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ categoryLimits }),
            });
            const data = await res.json();
            onSuccess(data.message || "Scraping triggered");
            onClose();
        } catch (e: unknown) {
            onSuccess(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md">
                <h2 className="text-lg font-bold text-white mb-1">Configure Scraping</h2>
                <p className="text-gray-400 text-sm mb-5">Set number of posts to extract per category</p>

                <div className="space-y-3 mb-6">
                    {JOB_CATEGORIES.map((cat) => (
                        <div key={cat} className="flex items-center justify-between">
                            <label className="text-gray-300 text-sm">{cat}</label>
                            <input
                                type="number"
                                min={0}
                                max={50}
                                value={categoryLimits[cat] ?? 10}
                                onChange={(e) =>
                                    setCategoryLimits({
                                        ...categoryLimits,
                                        [cat]: parseInt(e.target.value) || 0,
                                    })
                                }
                                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm text-center focus:outline-none focus:border-blue-500"
                            />
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleStart}
                        disabled={submitting}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium transition"
                    >
                        {submitting ? "Starting..." : "Start Scraping"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
    );
}
