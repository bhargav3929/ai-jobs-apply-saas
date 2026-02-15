"use client";

import { useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001/api";

const JOB_CATEGORIES = [
    "Software Developer",
    "AI/ML Engineer",
    "Marketing/Sales",
    "Design",
];

const DATE_FILTERS = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "week", label: "This Week" },
];

const STATUS_FILTERS = [
    { value: "", label: "All Statuses" },
    { value: "sent", label: "Sent" },
    { value: "failed", label: "Failed" },
    { value: "bounced", label: "Bounced" },
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
        disabledByAdmin?: boolean;
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

interface JobsResponse {
    jobs: JobEntry[];
    total: number;
    categoryBreakdown: Record<string, number>;
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

interface AppsResponse {
    applications: AppEntry[];
    total: number;
    statusBreakdown: Record<string, number>;
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
    const [loading, setLoading] = useState(false);
    const [actionMessage, setActionMessage] = useState("");
    const [showScrapeModal, setShowScrapeModal] = useState(false);
    const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>(
        () => Object.fromEntries(JOB_CATEGORIES.map((c) => [c, 10]))
    );

    // Jobs state
    const [jobsData, setJobsData] = useState<JobsResponse | null>(null);
    const [jobCategoryFilter, setJobCategoryFilter] = useState("");
    const [jobDateFilter, setJobDateFilter] = useState("all");
    const [jobPage, setJobPage] = useState(1);
    const jobPageSize = 20;

    // Applications state
    const [appsData, setAppsData] = useState<AppsResponse | null>(null);
    const [appStatusFilter, setAppStatusFilter] = useState("");
    const [appDateFilter, setAppDateFilter] = useState("all");
    const [appPage, setAppPage] = useState(1);
    const appPageSize = 30;

    // Toggling user status
    const [togglingUser, setTogglingUser] = useState<string | null>(null);

    const handleLogin = async () => {
        setLoginError("");
        const header = getAuthHeader(username, password);
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: "POST",
                headers: { Authorization: header },
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setLoginError("Invalid credentials");
                } else {
                    setLoginError(`Server error (${res.status}). Please try again.`);
                }
                return;
            }
            setAuthHeader(header);
            setIsLoggedIn(true);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("CORS")) {
                setLoginError(`Cannot reach backend server at ${API_URL}. Check that the backend is running and CORS is configured.`);
            } else {
                setLoginError(`Connection error: ${msg}`);
            }
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

    const loadJobs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(jobPageSize),
                date_filter: jobDateFilter,
            });
            if (jobCategoryFilter) params.set("category", jobCategoryFilter);
            const data = await fetchData(`jobs?${params}`);
            setJobsData(data);
            setJobPage(page);
        } catch (e: unknown) {
            setActionMessage(`Error loading jobs: ${e instanceof Error ? e.message : String(e)}`);
        }
        setLoading(false);
    }, [fetchData, jobDateFilter, jobCategoryFilter]);

    const loadApps = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                page_size: String(appPageSize),
                date_filter: appDateFilter,
            });
            if (appStatusFilter) params.set("status", appStatusFilter);
            const data = await fetchData(`applications?${params}`);
            setAppsData(data);
            setAppPage(page);
        } catch (e: unknown) {
            setActionMessage(`Error loading applications: ${e instanceof Error ? e.message : String(e)}`);
        }
        setLoading(false);
    }, [fetchData, appDateFilter, appStatusFilter]);

    const loadTab = useCallback(async (tab: string) => {
        if (tab === "overview") await loadOverview();
        else if (tab === "jobs") await loadJobs(1);
        else if (tab === "applications") await loadApps(1);
        else if (tab === "logs") {
            setLoading(true);
            try { setLogs(await fetchData("logs")); }
            catch (e: unknown) { setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`); }
            setLoading(false);
        }
    }, [loadOverview, loadJobs, loadApps, fetchData]);

    const triggerAction = async (action: string) => {
        setActionMessage("");
        try {
            const res = await fetch(`${API_URL}/admin/trigger/${action}`, {
                method: "POST",
                headers: { Authorization: authHeader },
            });
            const data = await res.json();
            setActionMessage(data.message || "Action triggered");
            setTimeout(() => loadOverview(), 3000);
        } catch (e: unknown) {
            setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    const toggleUserStatus = async (uid: string) => {
        setTogglingUser(uid);
        try {
            const res = await fetch(`${API_URL}/admin/users/${uid}/toggle-status`, {
                method: "POST",
                headers: { Authorization: authHeader },
            });
            const data = await res.json();
            setActionMessage(data.message || "Status toggled");
            await loadOverview();
        } catch (e: unknown) {
            setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
        }
        setTogglingUser(null);
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

    const jobTotalPages = jobsData ? Math.ceil(jobsData.total / jobPageSize) : 0;
    const appTotalPages = appsData ? Math.ceil(appsData.total / appPageSize) : 0;

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
                                    if (!confirm("This will STOP all queued emails immediately. Are you sure?")) return;
                                    try {
                                        const res = await fetch(`${API_URL}/admin/emergency-stop`, {
                                            method: "POST",
                                            headers: { Authorization: authHeader },
                                        });
                                        const data = await res.json();
                                        setActionMessage(`Stopped: ${data.purged} pending + ${data.revoked} active tasks killed`);
                                    } catch (e: unknown) {
                                        setActionMessage(`Error: ${e instanceof Error ? e.message : String(e)}`);
                                    }
                                }}
                                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition border-2 border-red-500"
                            >
                                Emergency Stop
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

                                {/* Users Table */}
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
                                                <th className="text-left px-4 py-2">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentUsers.map((u) => (
                                                <tr
                                                    key={u.uid}
                                                    className={`border-t border-gray-800 ${u.disabledByAdmin ? "opacity-50" : ""}`}
                                                >
                                                    <td className="px-4 py-2 text-white">
                                                        {u.name}
                                                        {u.disabledByAdmin && (
                                                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-900 text-red-300">Disabled</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-300">{u.email}</td>
                                                    <td className="px-4 py-2 text-gray-400">{u.jobCategory}</td>
                                                    <td className="px-4 py-2">
                                                        <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-500"}`}>
                                                            {u.isActive ? "Active" : "Paused"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-gray-300">{u.applicationsToday}</td>
                                                    <td className="px-4 py-2 text-gray-300">{u.applicationsTotal}</td>
                                                    <td className="px-4 py-2">
                                                        <button
                                                            onClick={() => toggleUserStatus(u.uid)}
                                                            disabled={togglingUser === u.uid}
                                                            className={`text-xs px-3 py-1 rounded font-medium transition ${
                                                                u.disabledByAdmin
                                                                    ? "bg-green-700 hover:bg-green-600 text-white"
                                                                    : "bg-red-700 hover:bg-red-600 text-white"
                                                            } disabled:opacity-50`}
                                                        >
                                                            {togglingUser === u.uid ? "..." : u.disabledByAdmin ? "Activate" : "Deactivate"}
                                                        </button>
                                                    </td>
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
                    <div>
                        {/* Category Breakdown */}
                        {jobsData?.categoryBreakdown && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                {Object.entries(jobsData.categoryBreakdown).map(([cat, count]) => (
                                    <div key={cat} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
                                        <p className="text-gray-400 text-xs">{cat}</p>
                                        <p className="text-lg font-bold text-white">{count}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex gap-3 mb-4">
                            <select
                                value={jobDateFilter}
                                onChange={(e) => { setJobDateFilter(e.target.value); }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                            >
                                {DATE_FILTERS.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            <select
                                value={jobCategoryFilter}
                                onChange={(e) => { setJobCategoryFilter(e.target.value); }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                            >
                                <option value="">All Categories</option>
                                {JOB_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => loadJobs(1)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
                            >
                                Apply Filters
                            </button>
                        </div>

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
                                    {(jobsData?.jobs ?? []).map((j) => (
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
                                    {(!jobsData || jobsData.jobs.length === 0) && !loading && (
                                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No jobs found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {jobTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <button
                                    onClick={() => loadJobs(jobPage - 1)}
                                    disabled={jobPage <= 1}
                                    className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-400">
                                    Page {jobPage} of {jobTotalPages} ({jobsData?.total} total)
                                </span>
                                <button
                                    onClick={() => loadJobs(jobPage + 1)}
                                    disabled={jobPage >= jobTotalPages}
                                    className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Applications Tab */}
                {activeTab === "applications" && (
                    <div>
                        {/* Status Breakdown */}
                        {appsData?.statusBreakdown && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                {Object.entries(appsData.statusBreakdown).map(([status, count]) => (
                                    <div key={status} className={`bg-gray-900 border rounded-lg p-3 ${
                                        status === "failed" || status === "bounced" ? "border-red-800" : "border-gray-800"
                                    }`}>
                                        <p className="text-gray-400 text-xs capitalize">{status}</p>
                                        <p className={`text-lg font-bold ${
                                            status === "sent" ? "text-green-400" : status === "failed" ? "text-red-400" : "text-white"
                                        }`}>{count}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Filters */}
                        <div className="flex gap-3 mb-4">
                            <select
                                value={appDateFilter}
                                onChange={(e) => { setAppDateFilter(e.target.value); }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                            >
                                {DATE_FILTERS.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            <select
                                value={appStatusFilter}
                                onChange={(e) => { setAppStatusFilter(e.target.value); }}
                                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                            >
                                {STATUS_FILTERS.map((f) => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => loadApps(1)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
                            >
                                Apply Filters
                            </button>
                        </div>

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
                                    {(appsData?.applications ?? []).map((a) => (
                                        <tr key={a.applicationId} className="border-t border-gray-800">
                                            <td className="px-4 py-2 text-white">{a.emailSubject}</td>
                                            <td className="px-4 py-2 text-gray-300">{a.sentToEmail}</td>
                                            <td className="px-4 py-2">
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                    a.status === "sent" ? "bg-green-900 text-green-300"
                                                    : a.status === "bounced" ? "bg-yellow-900 text-yellow-300"
                                                    : "bg-red-900 text-red-300"
                                                }`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-gray-500">{a.sentAt ? new Date(a.sentAt).toLocaleString() : ""}</td>
                                        </tr>
                                    ))}
                                    {(!appsData || appsData.applications.length === 0) && !loading && (
                                        <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No applications found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {appTotalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <button
                                    onClick={() => loadApps(appPage - 1)}
                                    disabled={appPage <= 1}
                                    className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
                                >
                                    Previous
                                </button>
                                <span className="text-sm text-gray-400">
                                    Page {appPage} of {appTotalPages} ({appsData?.total} total)
                                </span>
                                <button
                                    onClick={() => loadApps(appPage + 1)}
                                    disabled={appPage >= appTotalPages}
                                    className="px-3 py-1 text-sm bg-gray-800 rounded disabled:opacity-40 hover:bg-gray-700"
                                >
                                    Next
                                </button>
                            </div>
                        )}
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
