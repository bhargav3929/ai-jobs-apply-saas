# LinkedIn Auto-Apply SaaS Platform
## Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** January 26, 2026  
**Document Owner:** Product Team

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Product Vision & Goals](#product-vision--goals)
3. [User Personas](#user-personas)
4. [Core Features](#core-features)
5. [Technical Architecture](#technical-architecture)
6. [Database Schema](#database-schema)
7. [Smart Job Distribution Algorithm](#smart-job-distribution-algorithm)
8. [API Specifications](#api-specifications)
9. [Design System](#design-system)
10. [Tech Stack & Dependencies](#tech-stack--dependencies)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Cost Estimation](#cost-estimation)
13. [Risks & Mitigation](#risks--mitigation)

---

## 1. Executive Summary

### Product Overview
A fully automated LinkedIn job application platform that scrapes job postings, generates personalized application emails, and sends up to 20 applications daily per user. The platform centralizes job scraping (once daily) and distributes opportunities intelligently across multiple users to optimize cost and prevent spam detection.

### Key Differentiators
- **Centralized Scraping:** Scrape once at 8 AM, serve hundreds of users from cached data
- **Smart Distribution:** Intelligent algorithm prevents multiple users from spamming the same recruiter
- **Template Diversity:** 50-60 unique email templates randomly assigned to prevent spam detection
- **Human-Like Timing:** Random delays between emails (up to 1 hour) to mimic human behavior
- **Cost Optimized:** Single daily scrape reduces Apify costs by 95%+ vs per-user scraping

### Target Metrics (6 Months)
- 500+ active users
- 10,000+ applications sent daily
- <2% email bounce rate
- >15% interview callback rate
- ₹6,00,000 MRR

---

## 2. Product Vision & Goals

### Vision Statement
*"Democratize job hunting by automating the tedious application process, allowing job seekers to focus on interview preparation while our AI handles outreach at scale."*

### Primary Goals
1. **For Users:** Send 20 quality applications daily without manual effort
2. **For Business:** Build a scalable SaaS with 500+ users by Q4 2026
3. **For Recruiters:** Maintain email quality to avoid spam reputation damage

### Success Metrics
- **User Activation:** 80% of signups complete profile setup within 24 hours
- **Daily Active Users:** 70% of paid users have active automation running
- **Application Success:** 20 emails sent per user per day (target 18+ average)
- **Retention:** 65% month-over-month retention
- **Revenue:** ₹1200/user/month subscription

---

## 3. User Personas

### Primary Persona: "Desperate Devika"
- **Role:** 2-3 years experience software developer
- **Pain:** Applies to 50+ jobs manually, gets 2-3 responses
- **Goal:** Automate applications to increase interview opportunities
- **Tech Savvy:** Medium (can set up SMTP with guidance)

### Secondary Persona: "Career-Switch Sahil"
- **Role:** Marketing professional transitioning to tech
- **Pain:** Doesn't know where to apply, wastes hours on job boards
- **Goal:** Cast wide net with automated applications
- **Tech Savvy:** Low (needs hand-holding for SMTP setup)

### Admin Persona: "Founder Farhan"
- **Role:** Platform owner/admin
- **Goal:** Monitor system health, revenue, user engagement
- **Needs:** Real-time dashboards, user management, revenue analytics

---

## 4. Core Features

### 4.1 User Features (MVP)

#### **Onboarding Flow**
1. **Sign Up** (Email + Password via Firebase Auth)
2. **Upload Resume** (PDF, max 5MB)
   - Auto-extract name from resume (using AI)
   - Store in Firebase Storage
3. **Select Job Category**
   - Software Developer
   - Marketing
   - AI/ML Engineer
   - Customer Support
   - Sales
   - Design
   - Data Analyst
4. **SMTP Setup**
   - Enter email address
   - Enter app-specific password
   - Auto-detect SMTP settings (smtp.gmail.com:465)
   - Test connection (send test email)
5. **Activation**
   - Toggle "Start Automation" switch
   - First applications sent next morning at 9 AM

#### **Dashboard**
- **Today's Stats:**
  - Applications sent today: `14/20`
  - Applications sent this week: `68`
  - Applications sent this month: `420`
  - Total applications sent: `2,140`
  
- **Recent Applications:**
  - List of LinkedIn post URLs (last 20)
  - Click to view original post on LinkedIn
  
- **Account Status:**
  - Automation: `Active` / `Paused`
  - Next application batch: `Tomorrow at 9:00 AM`
  - SMTP Status: `Connected` / `Error`

#### **Settings**
- Update resume
- Change job category
- Update SMTP credentials
- Pause/Resume automation
- Delete account

### 4.2 Admin Features (MVP)

#### **Admin Dashboard**
- **System Overview:**
  - Total users: `487`
  - Active users: `412`
  - Applications sent today: `8,240`
  - System uptime: `99.8%`
  
- **Revenue Metrics:**
  - MRR: `₹4,94,400`
  - New users this month: `87`
  - Churn rate: `4.2%`
  - Projected revenue: `₹6,20,000`

- **User Management:**
  - Search users by email
  - View individual user stats
  - Pause/Resume user automation
  - View user logs (applications sent, errors)

- **System Health:**
  - Scraping status (last run, next run, success/failure)
  - Email queue status
  - Database size
  - API usage (Apify, OpenAI, etc.)

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  Next.js 15 (App Router) + React 19 + TypeScript + Tailwind │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION                           │
│              Firebase Auth (Email/Password)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   NEXT.JS API ROUTES      │   │   PYTHON FASTAPI SERVICE  │
│   (User Management)       │   │   (Job Processing)        │
│                           │   │                           │
│ • User CRUD               │   │ • LinkedIn Scraping       │
│ • Dashboard Data          │   │ • Email Classification    │
│ • Settings Update         │   │ • Email Generation        │
│ • Resume Upload           │   │ • Email Sending           │
└───────────────────────────┘   │ • Job Distribution        │
                                └───────────────────────────┘
                │                           │
                └─────────────┬─────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     FIREBASE LAYER                           │
│                                                              │
│  • Firestore (Database)                                      │
│  • Storage (Resume PDFs)                                     │
│  • Auth (User Sessions)                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                           │
│                                                              │
│  • Apify (LinkedIn Scraping)                                 │
│  • OpenAI/Groq (AI Email Generation)                         │
│  • Gmail SMTP (User's own email accounts)                    │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Job Processing Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: SCRAPING (8:00 AM Daily - Python Cron)             │
│                                                              │
│  1. Apify scrapes LinkedIn (last 24 hours)                  │
│  2. Returns ~1000-5000 raw posts                            │
│  3. Extract email addresses (AI-powered)                    │
│  4. Filter: Only keep posts WITH emails                     │
│  5. Remove duplicates (by LinkedIn URN)                     │
│  6. Classify into job categories (AI)                       │
│  7. Store in Firestore: `jobs` collection                   │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: DISTRIBUTION (9:00 AM - 11:59 PM)                  │
│                                                              │
│  For each active user:                                       │
│    1. Fetch user's job category preference                  │
│    2. Get available jobs from database (not yet applied)    │
│    3. Smart shuffle algorithm (see Section 7)               │
│    4. Generate personalized email (random template)         │
│    5. Send email via user's SMTP                            │
│    6. Random delay (30 min - 90 min)                        │
│    7. Repeat until 20 sent or jobs exhausted                │
│    8. Log application in `applications` collection          │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Technology Decisions

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Frontend** | Next.js 15 (App Router) | Latest version, RSC support, best React framework |
| **Styling** | Tailwind CSS 4.0 | Fastest styling, Stripe-like aesthetics possible |
| **UI Components** | shadcn/ui + Radix UI | Accessible, customizable, premium look |
| **Animations** | Framer Motion 11 | Industry standard, smooth animations |
| **Icons** | Lucide React | Modern, consistent, 1000+ icons |
| **Backend** | Python 3.12 + FastAPI | Best for AI/scraping, async support |
| **Job Queue** | Celery + Redis | Battle-tested task queue |
| **Database** | Firebase Firestore | Real-time, scalable, easy queries |
| **Storage** | Firebase Storage | Integrated, CDN-backed |
| **Auth** | Firebase Auth | Secure, easy integration |
| **AI** | OpenAI GPT-4 Turbo / Groq | Fast, cost-effective |
| **Scraping** | Apify | Pre-built LinkedIn actor, no cookies needed |
| **Email** | SMTP (user's Gmail) | Zero email cost, users own sender reputation |
| **Deployment** | Vercel (Next.js) + Railway (Python) | Auto-scaling, easy CI/CD |
| **Monitoring** | Sentry + PostHog | Error tracking + analytics |

---

## 6. Database Schema

### 6.1 Firestore Collections

#### **`users`**
```javascript
{
  uid: "firebase_user_id",
  email: "user@example.com",
  name: "John Doe",
  resumeUrl: "gs://bucket/resumes/user_id.pdf",
  jobCategory: "Software Developer", // enum
  smtpEmail: "user@gmail.com",
  smtpPassword: "encrypted_app_password", // AES-256 encrypted
  smtpServer: "smtp.gmail.com",
  smtpPort: 465,
  isActive: true, // automation on/off
  createdAt: "2026-01-15T10:30:00Z",
  lastLoginAt: "2026-01-26T09:15:00Z",
  subscriptionStatus: "active", // active | paused | cancelled
  subscriptionEndsAt: "2026-02-15T10:30:00Z"
}
```

#### **`jobs`**
```javascript
{
  jobId: "auto_generated_uuid",
  linkedinUrn: "urn:li:activity:1234567890", // unique identifier
  linkedinUrl: "https://www.linkedin.com/feed/update/...",
  postText: "We're hiring a React Developer...",
  recruiterEmail: "hr@company.com",
  jobCategory: "Software Developer", // AI-classified
  scrapedAt: "2026-01-26T08:05:00Z",
  createdAt: "2026-01-26T08:10:00Z",
  appliedByUsers: ["user_id_1", "user_id_2"], // prevent duplicate applications
  lastAppliedAt: "2026-01-26T09:30:00Z" // for staggering
}
```

#### **`applications`**
```javascript
{
  applicationId: "auto_generated_uuid",
  userId: "firebase_user_id",
  jobId: "job_uuid",
  emailSubject: "Application for React Developer Position",
  emailBody: "Hi,\n\nI came across your post...",
  templateId: 23, // which template was used (1-60)
  sentAt: "2026-01-26T09:45:00Z",
  status: "sent", // sent | failed | bounced
  smtpResponse: "250 OK", // SMTP server response
  errorMessage: null // if failed
}
```

#### **`email_templates`**
```javascript
{
  templateId: 1,
  subject: "Application for {JOB_TITLE}",
  body: "Hi,\n\nI noticed your post on LinkedIn...",
  variables: ["JOB_TITLE", "USER_NAME", "SKILLS"],
  createdAt: "2026-01-10T00:00:00Z",
  isActive: true
}
```

#### **`system_logs`**
```javascript
{
  logId: "auto_generated_uuid",
  type: "scraping" | "email_sending" | "error",
  message: "Scraped 1,234 jobs from LinkedIn",
  metadata: {
    jobsScraped: 1234,
    jobsWithEmail: 856,
    duration: "45s"
  },
  createdAt: "2026-01-26T08:05:00Z"
}
```

---

## 7. Smart Job Distribution Algorithm

### Problem Statement
If we scrape 100 software developer jobs but have 30 users targeting software developers, we need to:
1. Prevent all 30 users from applying to the same job simultaneously
2. Distribute jobs fairly so everyone gets applications
3. Avoid spamming the same recruiter with 10+ identical emails in one day

### Solution: Weighted Round-Robin with Time Staggering

```python
def distribute_jobs_to_users(job_category: str):
    # Get all active users for this category
    users = db.collection('users').where('jobCategory', '==', job_category).where('isActive', '==', True).get()
    
    # Get available jobs (not applied by this user yet)
    jobs = db.collection('jobs').where('jobCategory', '==', job_category).where('scrapedAt', '>=', today).get()
    
    # Shuffle jobs to randomize distribution
    random.shuffle(jobs)
    
    # Calculate applications per user
    total_jobs = len(jobs)
    total_users = len(users)
    
    if total_jobs >= total_users * 20:
        # Plenty of jobs: everyone gets 20
        apps_per_user = 20
    else:
        # Limited jobs: distribute evenly
        apps_per_user = min(20, total_jobs // total_users)
    
    # Round-robin distribution
    user_job_assignments = {user.id: [] for user in users}
    job_index = 0
    
    for user in users:
        assigned_count = 0
        while assigned_count < apps_per_user and job_index < total_jobs:
            job = jobs[job_index]
            
            # Check if user already applied to this job
            if user.id not in job.get('appliedByUsers', []):
                user_job_assignments[user.id].append(job)
                assigned_count += 1
            
            job_index += 1
    
    # Schedule emails with time staggering
    for user_id, assigned_jobs in user_job_assignments.items():
        base_time = datetime.now().replace(hour=9, minute=0)
        
        for i, job in enumerate(assigned_jobs):
            # Random delay between 30-90 minutes per email
            delay_minutes = random.randint(30, 90) * i
            send_time = base_time + timedelta(minutes=delay_minutes)
            
            # Queue email job
            schedule_email_job(user_id, job.id, send_time)
```

### Time Staggering Logic
- **First email:** 9:00 AM - 9:30 AM
- **Second email:** 9:30 AM - 11:00 AM (30-90 min delay)
- **Third email:** 11:00 AM - 1:00 PM
- ...and so on
- **20th email:** Before 11:59 PM

This ensures:
- Human-like sending patterns
- Google doesn't flag as spam
- Same recruiter doesn't receive 10 emails at once

---

## 8. API Specifications

### 8.1 Next.js API Routes

#### **POST `/api/auth/signup`**
```typescript
// Request
{
  email: string,
  password: string
}

// Response
{
  success: boolean,
  uid: string,
  token: string
}
```

#### **POST `/api/user/upload-resume`**
```typescript
// Request (multipart/form-data)
{
  resume: File (PDF, max 5MB)
}

// Response
{
  success: boolean,
  resumeUrl: string,
  extractedName: string
}
```

#### **POST `/api/user/setup-smtp`**
```typescript
// Request
{
  smtpEmail: string,
  smtpPassword: string
}

// Response
{
  success: boolean,
  connectionStatus: "success" | "failed",
  errorMessage?: string
}
```

#### **GET `/api/dashboard/stats`**
```typescript
// Response
{
  applicationsToday: number,
  applicationsThisWeek: number,
  applicationsThisMonth: number,
  applicationsTotal: number,
  nextBatchTime: string,
  automationStatus: "active" | "paused"
}
```

#### **GET `/api/dashboard/recent-applications`**
```typescript
// Response
{
  applications: [
    {
      id: string,
      linkedinUrl: string,
      sentAt: string,
      status: "sent" | "failed"
    }
  ]
}
```

### 8.2 Python FastAPI Endpoints

#### **POST `/scrape/linkedin`** (Internal, cron-triggered)
```python
# Triggers daily at 8:00 AM
# No request body needed

# Response
{
  "success": True,
  "jobsScraped": 1234,
  "jobsWithEmail": 856,
  "jobsStored": 856,
  "duration": "45s"
}
```

#### **POST `/process/send-applications`** (Internal, cron-triggered)
```python
# Triggers every 30 minutes from 9 AM to 11 PM
# Picks up queued email jobs from database

# Response
{
  "success": True,
  "emailsSent": 42,
  "emailsFailed": 2,
  "duration": "12s"
}
```

#### **POST `/ai/classify-job`**
```python
# Request
{
  "postText": "We're hiring React developers..."
}

# Response
{
  "category": "Software Developer",
  "confidence": 0.92
}
```

#### **POST `/ai/generate-email`**
```python
# Request
{
  "userName": "John Doe",
  "jobPostText": "Hiring React devs...",
  "templateId": 23
}

# Response
{
  "subject": "Application for React Developer Position",
  "body": "Hi,\n\nI came across your post..."
}
```

---

## 9. Design System

### 9.1 Visual Identity (Stripe-Inspired)

Based on the **US Stripe website** (light theme, clean aesthetic, vibrant "Blurple" accents) and your request to update the visual identity section, here is the completely revised **9.1 Visual Identity** section.

This replaces the previous "Pure Black" dark mode with Stripe's signature "Technical Glass" aesthetic: crisp whites, slate grays, and electric purple/blue gradients.

### 9.1 Visual Identity (Stripe-Inspired)

**Design Philosophy:** 

#### **Color Palette (CSS Variables)**

```css
:root {
  /* --- Core Brand Colors --- */
  /* The signature "Stripe Blurple" - used for primary CTAs and active states */
  --brand-primary: #635BFF;
  --brand-hover: #5851EA;
  
  /* Deep Navy - used for strong headers or sidebar navigation */
  --brand-dark: #0A2540; 
  
  /* --- Backgrounds (Light Theme) --- */
  /* Pure white for cards and main content areas to create depth */
  --background: #FFFFFF;
  
  /* Subtle off-white/blue tint for page backgrounds (The "Stripe Gray") */
  --surface: #F6F9FC;
  
  /* Glassmorphic overlay for sticky headers/modals */
  --overlay: rgba(255, 255, 255, 0.8);

  /* --- Typography --- */
  /* Deep Slate for primary headings - softer than pure black */
  --text-primary: #0A2540;
  
  /* Cool Gray for body text - highly readable but not harsh */
  --text-secondary: #425466;
  
  /* Light Gray for placeholders and disabled text */
  --text-tertiary: #A0A3BD;

  /* --- Borders & Separators --- */
  /* Subtle borders for inputs and cards */
  --border-subtle: #E6E8F0;
  --border-focus: #CDD0E0;

  /* --- Functional Colors --- */
  /* Success - A vibrant minty green */
  --success: #3ECF8E;
  
  /* Error - A soft but clear red */
  --error: #ED5F74;
  
  /* Warning - A warm amber */
  --warning: #F5A623;

  /* --- Gradients --- */
  /* The "Glow" gradient for hero sections and special buttons */
  --gradient-glow: linear-gradient(135deg, #635BFF 0%, #00D4FF 100%);
}

```

#### **Typography**

* **Font Family:** `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, sans-serif.
* *Note: Stripe uses a custom font "Camphor," but "Inter" is the closest open-source equivalent for this technical look.*


* **Weights:**
* **Regular (400):** Body text.
* **Medium (500):** UI labels, navigation.
* **Bold (600/700):** Headings.


* **Letter Spacing:** Slightly tighter (`-0.01em`) for headings to create a crisp, "editorial" feel.

#### **Shadows & Depth (The "Levitation" Effect)**

Stripe does not use flat design; it uses layers of light.

```css
/* Card Shadow - Soft, diffused, blue-tinted shadow */
--shadow-card: 0px 2px 5px rgba(50, 50, 93, 0.1), 0px 1px 1px rgba(0, 0, 0, 0.07);

/* Hover Lift - Used for buttons and cards on hover */
--shadow-lift: 0px 13px 27px -5px rgba(50, 50, 93, 0.25), 0px 8px 16px -8px rgba(0, 0, 0, 0.3);

/* Inner Glow - For inputs to give them depth */
--shadow-inner: inset 0px 1px 2px rgba(10, 37, 64, 0.1);

```

#### **Component Styling Guide**

* **Buttons:**
* *Primary:* Background `--brand-primary`, Text `#FFF`, Border Radius `24px` (Pill shape), Font Weight `500`. Transition: `transform: translateY(-1px)` on hover.
* *Secondary:* Background `#FFF`, Text `--text-primary`, Border `--border-subtle`.


* **Cards:** Background `--background` (White), Border Radius `8px`, `--shadow-card`.
* **Inputs:** Background `--surface`, Border `--border-subtle`. On focus: Border `--brand-primary` with a subtle glow shadow.
```

#### **Typography**
- **Primary Font:** Inter (system font, modern, clean)
- **Code Font:** Fira Code (for technical elements)
- **Headings:** 600-700 weight
- **Body:** 400-500 weight

#### **Spacing System** (Tailwind-based)
- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px
- `3xl`: 64px

### 9.2 Component Library (shadcn/ui)

**Core Components:**
- Button (primary, secondary, ghost variants)
- Input (with floating labels)
- Card (glassmorphism effect)
- Badge (status indicators)
- Progress (application count)
- Dialog/Modal
- Toast notifications
- Data tables
- Charts (for admin dashboard)

**Animation Principles:**
- Subtle hover effects (scale: 1.02)
- Smooth transitions (duration: 200-300ms)
- Page transitions (fade + slide)
- Loading states (skeleton screens)
- Micro-interactions (checkbox checkmark, button ripple)

### 9.3 Key Screens

#### **Landing Page**
- Hero section with gradient background
- "Start Applying Today" CTA
- Feature showcase (3 cards)
- Pricing section
- FAQ accordion
- Footer

#### **Dashboard (User)**
```
┌─────────────────────────────────────────────────────┐
│  Logo                                    [Profile ▾] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Welcome back, John! 👋                             │
│                                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐│
│  │   Today      │ │  This Week   │ │  This Month ││
│  │              │ │              │ │             ││
│  │   14/20      │ │     68       │ │    420      ││
│  │  Applied     │ │   Applied    │ │  Applied    ││
│  └──────────────┘ └──────────────┘ └─────────────┘│
│                                                      │
│  Recent Applications                   [View All →] │
│  ┌────────────────────────────────────────────────┐│
│  │ 🔗 LinkedIn Post · Sent 2 hours ago             ││
│  │ 🔗 LinkedIn Post · Sent 3 hours ago             ││
│  │ 🔗 LinkedIn Post · Sent 5 hours ago             ││
│  └────────────────────────────────────────────────┘│
│                                                      │
│  Automation Status: ● Active                        │
│  Next batch: Tomorrow at 9:00 AM                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### **Admin Dashboard**
```
┌─────────────────────────────────────────────────────┐
│  Logo          [Users][Revenue][System][Logs]        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  System Overview                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │  Total   │ │  Active  │ │   Apps   │ │Uptime ││
│  │  Users   │ │  Users   │ │  Today   │ │       ││
│  │   487    │ │   412    │ │  8,240   │ │99.8%  ││
│  └──────────┘ └──────────┘ └──────────┘ └────────┘│
│                                                      │
│  Revenue Chart (MRR)              [This Month ▾]    │
│  ┌────────────────────────────────────────────────┐│
│  │                                        ┌──┐     ││
│  │                                   ┌──┐ │  │     ││
│  │                              ┌──┐ │  │ │  │     ││
│  │  ₹600K ─                ┌──┐ │  │ │  │ │  │     ││
│  │                    ┌──┐ │  │ │  │ │  │ │  │     ││
│  │  ₹400K ─      ┌──┐ │  │ │  │ │  │ │  │ │  │     ││
│  │          ┌──┐ │  │ │  │ │  │ │  │ │  │ │  │     ││
│  │  ₹200K ─ │  │ │  │ │  │ │  │ │  │ │  │ │  │     ││
│  │          Jan  Feb  Mar  Apr  May  Jun  Jul       ││
│  └────────────────────────────────────────────────┘│
│                                                      │
│  Recent Users                          [View All →] │
│  ┌────────────────────────────────────────────────┐│
│  │ user@example.com · Active · 45 apps sent today ││
│  │ dev@company.com · Active · 20 apps sent today  ││
│  └────────────────────────────────────────────────┘│
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 10. Tech Stack & Dependencies

### 10.1 Frontend (Next.js)

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    
    // UI & Styling
    "tailwindcss": "^4.0.0",
    "@tailwindcss/typography": "^0.5.15",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    
    // UI Components
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-dropdown-menu": "^2.1.2",
    "@radix-ui/react-tabs": "^1.1.1",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-switch": "^1.1.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.7.0",
    
    // Animations
    "framer-motion": "^11.15.0",
    
    // Icons
    "lucide-react": "^0.469.0",
    
    // Forms
    "react-hook-form": "^7.54.2",
    "zod": "^3.24.1",
    "@hookform/resolvers": "^3.9.1",
    
    // Firebase
    "firebase": "^11.1.0",
    "firebase-admin": "^13.0.2",
    
    // Charts (Admin Dashboard)
    "recharts": "^2.15.0",
    "date-fns": "^4.1.0",
    
    // Utils
    "nanoid": "^5.0.9",
    "crypto-js": "^4.2.0"
  },
  
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.6",
    "eslint": "^9.17.0",
    "prettier": "^3.4.2",
    "prettier-plugin-tailwindcss": "^0.6.10"
  }
}
```

### 10.2 Backend (Python)

```txt
# requirements.txt

fastapi==0.115.6
uvicorn[standard]==0.34.0
python-dotenv==1.0.1

# Database
firebase-admin==6.5.0

# Job Queue
celery==5.4.0
redis==5.2.1

# Scraping
apify-client==1.8.3
beautifulsoup4==4.12.3
lxml==5.3.0

# AI
openai==1.59.7
anthropic==0.42.0

# Email
smtplib (built-in)
email-validator==2.2.0

# Utils
pydantic==2.10.4
httpx==0.28.1
python-multipart==0.0.20
aiofiles==24.1.0

# Encryption
cryptography==44.0.0

# PDF Processing
PyPDF2==3.0.1
pdfplumber==0.11.4

# Logging & Monitoring
sentry-sdk==2.19.2
```

### 10.3 Infrastructure

**Hosting:**
- **Frontend:** Vercel (free tier supports 100GB bandwidth)
- **Backend:** Railway ($5/month starter plan, auto-scaling)
- **Database:** Firebase Firestore (free tier: 1GB storage, 50K reads/day)
- **Storage:** Firebase Storage (free tier: 5GB)

**CI/CD:**
- GitHub Actions for automated deployments
- Vercel auto-deployment on main branch push
- Railway auto-deployment on Python service push

**Monitoring:**
- Sentry (error tracking) - Free tier
- PostHog (analytics) - Free tier
- Vercel Analytics (built-in)

---

## 11. Implementation Roadmap

### Phase 1: MVP (Weeks 1-4) - Core Functionality

**Week 1: Foundation**
- [ ] Next.js project setup with TypeScript + Tailwind
- [ ] Firebase project setup (Auth, Firestore, Storage)
- [ ] Python FastAPI project setup
- [ ] Database schema implementation
- [ ] Basic landing page design

**Week 2: Authentication & Onboarding**
- [ ] Firebase Auth integration (signup/login)
- [ ] Resume upload functionality
- [ ] AI resume name extraction
- [ ] Job category selection
- [ ] SMTP setup + connection testing

**Week 3: Job Processing Pipeline**
- [ ] Apify integration for LinkedIn scraping
- [ ] Email extraction from posts
- [ ] Job classification AI model
- [ ] Firestore storage of jobs
- [ ] Duplicate removal logic

**Week 4: Email Automation**
- [ ] 50-60 email template creation
- [ ] AI email generation system
- [ ] SMTP email sending (with retry logic)
- [ ] Smart job distribution algorithm
- [ ] Application logging

### Phase 2: Dashboard & Admin (Weeks 5-6)

**Week 5: User Dashboard**
- [ ] Dashboard layout (Stripe-inspired)
- [ ] Stats cards (today/week/month)
- [ ] Recent applications list
- [ ] Settings page (update resume, SMTP, category)
- [ ] Pause/resume automation toggle

**Week 6: Admin Dashboard**
- [ ] Admin authentication (separate route)
- [ ] System overview metrics
- [ ] Revenue dashboard (MRR, growth)
- [ ] User management table
- [ ] System health monitoring
- [ ] Log viewer

### Phase 3: Polish & Testing (Weeks 7-8)

**Week 7: UI/UX Polish**
- [ ] Animations (Framer Motion)
- [ ] Glassmorphism effects
- [ ] Loading states
- [ ] Error handling UI
- [ ] Responsive design (mobile/tablet)
- [ ] Dark mode refinements

**Week 8: Testing & Bug Fixes**
- [ ] End-to-end testing (Playwright)
- [ ] Load testing (simulate 100 users)
- [ ] Email deliverability testing
- [ ] SMTP error handling
- [ ] Database query optimization
- [ ] Security audit

### Phase 4: Launch Preparation (Week 9-10)

**Week 9: Production Setup**
- [ ] Domain setup + SSL
- [ ] Vercel production deployment
- [ ] Railway production deployment
- [ ] Firebase production rules
- [ ] Environment variables configuration
- [ ] Sentry error tracking setup

**Week 10: Soft Launch**
- [ ] Beta user onboarding (10-20 users)
- [ ] Monitor system performance
- [ ] Collect user feedback
- [ ] Fix critical bugs
- [ ] Documentation (user guides)
- [ ] Public launch 🚀

---

## 12. Cost Estimation

### 12.1 Monthly Operating Costs (100 Users)

| Service | Cost (₹) | Details |
|---------|----------|---------|
| **Apify** | ₹2,000 | ~1000 posts/day × ₹2/1000 × 30 days |
| **OpenAI/Groq** | ₹1,500 | Email generation (~3000 calls/day × ₹0.01) |
| **Railway** | ₹500 | Python backend hosting |
| **Vercel** | ₹0 | Free tier (100GB bandwidth) |
| **Firebase** | ₹0 | Free tier (sufficient for 100 users) |
| **Domain** | ₹100 | .com domain |
| **Total** | **₹4,100** | |

**Revenue (100 users × ₹1200):** ₹1,20,000/month  
**Profit Margin:** ~96.5%

### 12.2 Scaling Costs (500 Users)

| Service | Cost (₹) | Details |
|---------|----------|---------|
| **Apify** | ₹2,000 | Same (scrape once, serve many) |
| **OpenAI/Groq** | ₹7,500 | 15,000 calls/day |
| **Railway** | ₹2,000 | Scale to 2GB RAM |
| **Firebase** | ₹1,500 | Paid tier (10GB storage, 1M reads) |
| **Total** | **₹13,000** | |

**Revenue (500 users × ₹1200):** ₹6,00,000/month  
**Profit Margin:** ~97.8%

---

## 13. Risks & Mitigation

### Risk 1: LinkedIn Scraping Violation
**Impact:** High  
**Probability:** Medium  
**Mitigation:**
- Use Apify's no-cookie scraper (harder to detect)
- Scrape from non-user accounts
- Rate limit scraping (once daily, not aggressive)
- Have backup: Build integrations with Indeed, Glassdoor APIs
- Legal disclaimer: Users acknowledge automation risks

### Risk 2: Email Deliverability Issues
**Impact:** High  
**Probability:** Medium  
**Mitigation:**
- Users use their own SMTP (they own sender reputation)
- Random delays between emails (30-90 min)
- 50+ unique templates to avoid spam patterns
- Instruct users to use app-specific passwords (not main password)
- Limit to 20 emails/day per user

### Risk 3: SMTP Connection Failures
**Impact:** Medium  
**Probability:** High  
**Mitigation:**
- Test SMTP connection during setup
- Retry failed emails (3 attempts with exponential backoff)
- Notify user if SMTP fails (in-app + email)
- Provide troubleshooting guide
- Future: OAuth2 Gmail integration

### Risk 4: AI Classification Errors
**Impact:** Low  
**Probability:** Medium  
**Mitigation:**
- Use GPT-4 Turbo for high accuracy
- Fallback: If confidence <0.7, categorize as "Other"
- Manual review queue (admin can reclassify jobs)
- User feedback: "Was this job relevant?" (train model)

### Risk 5: Database Scalability
**Impact:** Medium  
**Probability:** Low  
**Mitigation:**
- Firestore scales automatically
- Implement pagination (load 20 apps at a time)
- Archive old applications (>90 days) to cold storage
- Monitor Firestore usage, upgrade tier if needed

### Risk 6: User Churn
**Impact:** High  
**Probability:** Medium  
**Mitigation:**
- Provide value: Ensure 18+ applications sent daily
- User onboarding: Guide users through SMTP setup
- Support: Fast response to user issues
- Analytics: Track where users drop off, optimize
- Retention emails: "You got X applications sent this week!"

---

## Appendix

### A. Email Template Examples

**Template 1 (Casual):**
```
Subject: Application for {JOB_TITLE}

Hi there,

I came across your post on LinkedIn about hiring for {JOB_TITLE}. 
With my background in {RELEVANT_SKILLS}, I believe I'd be a great fit.

Here's my portfolio:
https://bhargavcodes.com/

I've attached my resume for your review.

Looking forward to hearing from you!

Best,
{USER_NAME}
```

**Template 2 (Professional):**
```
Subject: Interested in {JOB_TITLE} Position

Hello,

I noticed your LinkedIn post regarding {JOB_TITLE} and wanted to express 
my interest. My experience with {RELEVANT_SKILLS} aligns well with the 
requirements you've outlined.

Portfolio: https://bhargavcodes.com/
Please find my resume attached.

Thank you for considering my application.

Regards,
{USER_NAME}
```

*(Total: 50-60 variations with different tones, structures, and vocabulary)*

### B. Glossary

- **Apify:** Web scraping platform with pre-built actors
- **URN:** Unique Resource Name (LinkedIn's post identifier)
- **SMTP:** Simple Mail Transfer Protocol (email sending)
- **MRR:** Monthly Recurring Revenue
- **Firestore:** NoSQL document database by Firebase
- **Glassmorphism:** UI design trend with frosted glass effect

---

**Document End**

*For questions or clarifications, contact: Product Team*

*Last Reviewed: January 26, 2026*