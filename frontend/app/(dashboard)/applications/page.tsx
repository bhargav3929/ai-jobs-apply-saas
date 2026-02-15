"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import {
    Send,
    ExternalLink,
    Search,
    ChevronUp,
    ChevronDown,
    Mail,
    AlertCircle,
    Inbox,
    Filter,
    ChevronRight,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getApplications } from "@/lib/api";

/* ---- Types ---- */
interface AppRow {
    applicationId: string;
    jobId: string;
    emailSubject: string;
    emailBody: string;
    sentAt: string;
    status: "sent" | "failed" | "bounced";
    linkedinUrl?: string | null;
    recruiterEmail?: string | null;
    errorMessage?: string | null;
}

type SortField = "sentAt" | "status";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "sent" | "failed" | "bounced";

/* ---- Status config ---- */
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    sent: { label: "Sent", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    failed: { label: "Failed", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
    bounced: { label: "Bounced", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
};

/* ---- Status badge ---- */
function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.sent;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
        </span>
    );
}

/* ---- Sortable header ---- */
function SortHeader({
    label,
    field,
    currentField,
    currentDir,
    onSort,
}: {
    label: string;
    field: SortField;
    currentField: SortField;
    currentDir: SortDir;
    onSort: (f: SortField) => void;
}) {
    const active = currentField === field;
    return (
        <button
            onClick={() => onSort(field)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-dark)] transition-colors group"
        >
            {label}
            <span className={`transition-opacity ${active ? "opacity-100" : "opacity-0 group-hover:opacity-40"}`}>
                {active && currentDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </span>
        </button>
    );
}

/* ---- Skeleton loader ---- */
function TableSkeleton() {
    return (
        <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-[var(--color-border-subtle)]">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-surface)] animate-pulse" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-[var(--color-surface)] rounded-lg animate-pulse w-3/5" />
                        <div className="h-2.5 bg-[var(--color-surface)] rounded-lg animate-pulse w-2/5" />
                    </div>
                    <div className="h-6 w-16 bg-[var(--color-surface)] rounded-lg animate-pulse" />
                    <div className="h-3 w-24 bg-[var(--color-surface)] rounded-lg animate-pulse" />
                </div>
            ))}
        </div>
    );
}

/* ================================================================
   MAIN PAGE
   ================================================================ */
export default function ApplicationsPage() {
    const [applications, setApplications] = React.useState<AppRow[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [loadingMore, setLoadingMore] = React.useState(false);
    const [hasMore, setHasMore] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Filters & sort
    const [search, setSearch] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
    const [sortField, setSortField] = React.useState<SortField>("sentAt");
    const [sortDir, setSortDir] = React.useState<SortDir>("desc");

    // Expanded row
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const PAGE_SIZE = 50;

    // Initial load
    React.useEffect(() => {
        (async () => {
            try {
                const data = await getApplications(PAGE_SIZE, 0);
                setApplications(data);
                setHasMore(data.length === PAGE_SIZE);
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to load applications");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Load more
    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const data = await getApplications(PAGE_SIZE, applications.length);
            setApplications((prev) => [...prev, ...data]);
            setHasMore(data.length === PAGE_SIZE);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to load more applications");
        } finally {
            setLoadingMore(false);
        }
    };

    // Sort handler
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    };

    // Filter + sort pipeline
    const filtered = React.useMemo(() => {
        let list = [...applications];

        // Status filter
        if (statusFilter !== "all") {
            list = list.filter((a) => a.status === statusFilter);
        }

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (a) =>
                    a.emailSubject?.toLowerCase().includes(q) ||
                    a.recruiterEmail?.toLowerCase().includes(q)
            );
        }

        // Sort
        list.sort((a, b) => {
            let cmp = 0;
            if (sortField === "sentAt") {
                cmp = new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
            } else if (sortField === "status") {
                cmp = a.status.localeCompare(b.status);
            }
            return sortDir === "asc" ? cmp : -cmp;
        });

        return list;
    }, [applications, statusFilter, search, sortField, sortDir]);

    // Counts
    const counts = React.useMemo(() => {
        const c = { all: applications.length, sent: 0, failed: 0, bounced: 0 };
        for (const a of applications) {
            if (a.status in c) c[a.status as keyof typeof c]++;
        }
        return c;
    }, [applications]);

    const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
        { key: "all", label: "All", count: counts.all },
        { key: "sent", label: "Sent", count: counts.sent },
        { key: "failed", label: "Failed", count: counts.failed },
        { key: "bounced", label: "Bounced", count: counts.bounced },
    ];

    return (
        <div className="p-5 md:p-6 lg:p-8 xl:p-10 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <h1 className="text-2xl font-bold text-[var(--color-brand-dark)] tracking-tight">Applications</h1>
                <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">
                    All emails sent by your AI agent
                </p>
            </motion.div>

            {/* Controls bar */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sm:flex-row sm:items-center gap-3"
            >
                {/* Filter tabs */}
                <div className="flex items-center gap-1 p-1 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border-subtle)]">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setStatusFilter(tab.key)}
                            className={`
                                relative px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-200
                                ${statusFilter === tab.key
                                    ? "bg-white text-[var(--color-brand-dark)] shadow-sm"
                                    : "text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-dark)]"
                                }
                            `}
                        >
                            {tab.label}
                            <span className={`ml-1.5 text-[10px] font-semibold ${statusFilter === tab.key ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-tertiary)]/60"}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-[13px] bg-white border border-[var(--color-border-subtle)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary)]/20 focus:border-[var(--color-brand-primary)]/40 transition-all placeholder:text-[var(--color-text-tertiary)]/50"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                            <X className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-dark)]" />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-[13px] text-red-700 flex-1">{error}</p>
                    <button
                        onClick={() => { setError(null); setLoading(true); getApplications(PAGE_SIZE, 0).then(data => { setApplications(data); setHasMore(data.length === PAGE_SIZE); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
                        className="text-[12px] font-semibold text-red-600 hover:text-red-800 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Table card */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden"
            >
                {/* Table header */}
                <div className="grid grid-cols-[1fr_100px_160px_48px] items-center gap-2 px-6 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                        Application
                    </span>
                    <SortHeader label="Status" field="status" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                    <SortHeader label="Date" field="sentAt" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] text-center">
                        Link
                    </span>
                </div>

                {/* Body */}
                {loading ? (
                    <TableSkeleton />
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-primary)]/5 flex items-center justify-center mb-4">
                            {search || statusFilter !== "all" ? (
                                <Filter className="w-6 h-6 text-[var(--color-brand-primary)]/40" />
                            ) : (
                                <Inbox className="w-6 h-6 text-[var(--color-brand-primary)]/40" />
                            )}
                        </div>
                        <h4 className="text-[15px] font-semibold text-[var(--color-brand-dark)] mb-1">
                            {search || statusFilter !== "all" ? "No matching applications" : "No applications yet"}
                        </h4>
                        <p className="text-[13px] text-[var(--color-text-tertiary)] text-center max-w-xs">
                            {search || statusFilter !== "all"
                                ? "Try adjusting your filters or search terms."
                                : "Once your AI agent starts sending emails, they\u2019ll appear here."}
                        </p>
                    </div>
                ) : (
                    <div>
                        <AnimatePresence initial={false}>
                            {filtered.map((app, i) => {
                                const isExpanded = expandedId === app.applicationId;
                                const sentDate = app.sentAt ? new Date(app.sentAt) : null;
                                return (
                                    <motion.div
                                        key={app.applicationId}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: Math.min(i * 0.02, 0.3), duration: 0.3 }}
                                    >
                                        {/* Row */}
                                        <div
                                            className={`
                                                grid grid-cols-[1fr_100px_160px_48px] items-center gap-2 px-6 py-3.5
                                                border-b border-[var(--color-border-subtle)] cursor-pointer
                                                hover:bg-[var(--color-surface)]/60 transition-colors group
                                                ${isExpanded ? "bg-[var(--color-surface)]/40" : ""}
                                            `}
                                            onClick={() => setExpandedId(isExpanded ? null : app.applicationId)}
                                        >
                                            {/* Application info */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    app.status === "sent"
                                                        ? "bg-emerald-50"
                                                        : app.status === "failed"
                                                        ? "bg-red-50"
                                                        : "bg-amber-50"
                                                }`}>
                                                    {app.status === "failed" ? (
                                                        <AlertCircle className={`w-4 h-4 text-red-500`} />
                                                    ) : (
                                                        <Send className={`w-4 h-4 ${app.status === "sent" ? "text-emerald-600" : "text-amber-600"}`} />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[13px] font-medium text-[var(--color-brand-dark)] truncate leading-snug">
                                                        {app.emailSubject || "Untitled"}
                                                    </p>
                                                    {app.recruiterEmail && (
                                                        <p className="text-[11px] text-[var(--color-text-tertiary)] truncate mt-0.5">
                                                            to {app.recruiterEmail}
                                                        </p>
                                                    )}
                                                </div>
                                                <ChevronRight className={`w-3.5 h-3.5 text-[var(--color-text-tertiary)]/40 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`} />
                                            </div>

                                            {/* Status */}
                                            <div>
                                                <StatusBadge status={app.status} />
                                            </div>

                                            {/* Date */}
                                            <div>
                                                {sentDate && (
                                                    <div>
                                                        <p className="text-[12px] text-[var(--color-brand-dark)] font-medium">
                                                            {format(sentDate, "MMM d, yyyy")}
                                                        </p>
                                                        <p className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">
                                                            {formatDistanceToNow(sentDate, { addSuffix: true })}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Job link */}
                                            <div className="flex justify-center">
                                                {app.linkedinUrl ? (
                                                    <a
                                                        href={app.linkedinUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-brand-primary)]/10 transition-colors"
                                                        title="View job post"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                                                    </a>
                                                ) : (
                                                    <span className="w-8 h-8 rounded-lg flex items-center justify-center">
                                                        <ExternalLink className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]/20" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded detail */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-6 py-4 bg-[var(--color-surface)]/30 border-b border-[var(--color-border-subtle)]">
                                                        <div className="flex items-start gap-3">
                                                            <Mail className="w-4 h-4 text-[var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
                                                                    Email Preview
                                                                </p>
                                                                <div className="text-[12px] text-[var(--color-brand-dark)]/80 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto pr-2">
                                                                    {app.emailBody || "No email body available."}
                                                                </div>
                                                                {app.errorMessage && (
                                                                    <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                                                                        <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                                                        <p className="text-[11px] text-red-700">{app.errorMessage}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Load more */}
                        {hasMore && (
                            <div className="px-6 py-4 flex justify-center">
                                <button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="text-[13px] font-medium text-[var(--color-brand-primary)] hover:text-[var(--color-brand-hover)] transition-colors disabled:opacity-50"
                                >
                                    {loadingMore ? "Loading..." : "Load more applications"}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Footer summary */}
            {!loading && filtered.length > 0 && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-[12px] text-[var(--color-text-tertiary)] text-center"
                >
                    Showing {filtered.length} of {applications.length} application{applications.length !== 1 ? "s" : ""}
                </motion.p>
            )}
        </div>
    );
}
