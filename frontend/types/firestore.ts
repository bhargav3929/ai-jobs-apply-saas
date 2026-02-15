/**
 * JobAgent.ai - Firestore Schema Types
 * Aligned with PRD Section 6 + Time-Shifted Queue Logic
 */

// ============ ENUMS ============

export type JobCategory =
    | "Software Developer"
    | "AI/ML Engineer"
    | "Marketing/Sales"
    | "Design";

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type ApplicationStatus = "sent" | "failed" | "bounced";

export type SystemLogType = "scraping" | "email_sending" | "error" | "distribution";

// ============ USER ============

export interface User {
    uid: string;
    email: string;
    name: string;
    resumeUrl: string | null;
    jobCategory: JobCategory;

    // SMTP Configuration
    smtpEmail: string;
    smtpPassword: string; // AES-256 encrypted
    smtpServer: string; // Default: smtp.gmail.com
    smtpPort: number; // Default: 465

    // Automation State
    isActive: boolean;
    onboardingCompleted?: boolean;

    // Timestamps
    createdAt: string; // ISO 8601
    lastLoginAt: string;

    // Subscription
    subscriptionStatus: SubscriptionStatus;
    subscriptionEndsAt: string;

    // Resume Metadata
    resumeMetadata?: {
        filename: string;
        size: number;
        uploadedAt: string;
    };
}

// ============ JOB ============
// Core entity for the "Search Aggregation Engine"

export interface Job {
    jobId: string;
    linkedinUrn: string; // Unique identifier: urn:li:activity:...
    linkedinUrl: string;
    postText: string;
    recruiterEmail: string;
    jobCategory: JobCategory;

    // Scraping Metadata
    scrapedAt: string; // When Apify fetched this
    createdAt: string; // When stored in Firestore

    // === TIME-SHIFTED QUEUE LOGIC ===
    // A job is an asset that lasts 10 days, not 1 day

    appliedByUsers: string[]; // User IDs who have applied
    application_count: number; // Total applications sent for this job
    last_applied_at: string | null; // Last application timestamp (for staggering)

    // Expiry tracking (10-day asset lifespan)
    expiresAt: string; // createdAt + 10 days
    isExpired: boolean;
}

// ============ APPLICATION ============

export interface Application {
    applicationId: string;
    userId: string;
    jobId: string;

    // Email Content
    emailSubject: string;
    emailBody: string;
    templateId: number; // 1-70 template variants

    // Status
    sentAt: string;
    status: ApplicationStatus;
    smtpResponse: string | null;
    errorMessage: string | null;
}

// ============ EMAIL TEMPLATE ============

export interface EmailTemplate {
    templateId: number;
    subject: string; // With {JOB_TITLE} placeholders
    body: string;
    variables: string[]; // ["JOB_TITLE", "USER_NAME", "SKILLS"]
    createdAt: string;
    isActive: boolean;
}

// ============ SYSTEM LOG ============

export interface SystemLog {
    logId: string;
    type: SystemLogType;
    message: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

// ============ DASHBOARD STATS ============
// Derived types for API responses

export interface DashboardStats {
    applicationsToday: number;
    applicationsThisWeek: number;
    applicationsThisMonth: number;
    applicationsTotal: number;
    nextBatchTime: string;
    automationStatus: "active" | "paused";
}

export interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    applicationsToday: number;
    systemUptime: number; // Percentage
    mrr: number; // Monthly Recurring Revenue in INR
    newUsersThisMonth: number;
    churnRate: number;
}

// ============ RESUME ANALYSIS ============

export type SuggestionPriority = "high" | "medium" | "low";

export interface ResumeSuggestion {
    text: string;
    priority: SuggestionPriority;
}

export interface ResumeSection {
    content: string;
    score: number;
    reasoning: string;
    suggestions: ResumeSuggestion[];
    displayName?: string;
}

// Dynamic — sections are detected from the actual resume, not predefined
export type ResumeSectionName = string;

export interface IndustryBenchmark {
    category: string;
    averageScore: number;
    percentile: number;
    topSkillsInDemand: string[];
}

export interface ContactInfo {
    name?: string;
    email?: string | null;
    phone?: string | null;
    location?: string | null;
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
    otherLinks?: string[];
}

export interface ResumeAnalysis {
    sections: Record<string, ResumeSection>;
    contactInfo?: ContactInfo;
    overallScore: number;
    atsScore: number;
    atsIssues: string[];
    keywordsFound: string[];
    keywordsMissing: string[];
    industryBenchmark: IndustryBenchmark;
    strengthHighlights: string[];
    criticalImprovements: string[];
}

export interface ResumeAnalysisResponse {
    analysis: ResumeAnalysis;
    resumeText: string;
    candidateName?: string;
    contactInfo?: ContactInfo;
    metadata: {
        filename: string;
        size: number;
        uploadedAt: string;
        analyzedAt: string;
        cachedUntil: string;
    };
    extractedLinks: { github?: string; portfolio?: string; linkedin?: string };
    jobCategory: string;
}
