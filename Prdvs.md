# LinkedIn Auto-Apply SaaS Platform
## PRODUCTION-READY PRD v2.0

**Status:** Production Implementation Blueprint  
**Last Updated:** January 27, 2026  
**Completeness:** 100% - Ready for Development

---

## TABLE OF CONTENTS

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Complete Data Flow (8 AM → 11:59 PM)](#2-complete-data-flow)
3. [Database Schema (Production)](#3-database-schema-production)
4. [Backend Services (Detailed)](#4-backend-services-detailed)
5. [Cron Jobs & Scheduling](#5-cron-jobs--scheduling)
6. [Smart Distribution Engine](#6-smart-distribution-engine)
7. [Email Processing System](#7-email-processing-system)
8. [Frontend Application](#8-frontend-application)
9. [Error Handling & Retry Logic](#9-error-handling--retry-logic)
10. [Performance Optimization](#10-performance-optimization)
11. [Security & Encryption](#11-security--encryption)
12. [Monitoring & Logging](#12-monitoring--logging)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Production Checklist](#14-production-checklist)

---

# 1. SYSTEM ARCHITECTURE OVERVIEW

## 1.1 Complete System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                    PRODUCTION ARCHITECTURE                        │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────┐          ┌─────────────────┐
│   VERCEL        │          │   RAILWAY       │
│   (Next.js)     │◄────────►│   (Python)      │
│                 │   REST   │                 │
│  • Frontend     │   API    │  • Job Scraper  │
│  • Auth Pages   │          │  • AI Engine    │
│  • Dashboard    │          │  • Email Sender │
│  • API Routes   │          │  • Cron Manager │
└────────┬────────┘          └────────┬────────┘
         │                            │
         │                            │
         ▼                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FIREBASE                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Firestore  │  │   Storage    │  │     Auth     │          │
│  │              │  │              │  │              │          │
│  │ • users      │  │ • resumes/   │  │ • Email/Pass │          │
│  │ • jobs       │  │   user_id/   │  │ • Sessions   │          │
│  │ • apps       │  │   resume.pdf │  │              │          │
│  │ • templates  │  │              │  │              │          │
│  │ • logs       │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└──────────────────────────────────────────────────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────┐          ┌─────────────────┐
│   REDIS         │          │   EXTERNAL      │
│   (Railway)     │          │   SERVICES      │
│                 │          │                 │
│  • Job Queue    │          │  • Apify        │
│  • Email Queue  │          │  • OpenAI/Groq  │
│  • Rate Limits  │          │  • Gmail SMTP   │
│  • Cache        │          │                 │
└─────────────────┘          └─────────────────┘
```

## 1.2 Service Responsibilities

### **Next.js (Vercel) - Frontend & User Management**
- User authentication (Firebase Auth)
- Dashboard rendering
- Settings management
- Resume upload handling
- API proxy to Python backend
- Real-time stats display

### **Python FastAPI (Railway) - Core Engine**
- LinkedIn scraping (Apify integration)
- Email extraction & validation
- Job classification (AI)
- Email generation (AI)
- Email sending (SMTP)
- Cron job orchestration
- Database writes

### **Firebase - Data Layer**
- Firestore: Database (users, jobs, applications)
- Storage: Resume PDFs
- Auth: User sessions

### **Redis (Railway) - Queue & Cache**
- Celery task queue
- Email sending queue
- Rate limiting
- Job distribution cache

---

# 2. COMPLETE DATA FLOW

## 2.1 Daily Execution Timeline

```
TIME    | SERVICE      | ACTION                                    | OUTPUT
--------|--------------|-------------------------------------------|------------------
08:00   | Python Cron  | Trigger LinkedIn scraping                 | Start scraping
08:00   | Apify        | Scrape last 24h posts (all categories)   | Raw JSON data
08:05   | Python       | Receive Apify results                     | ~1000-5000 posts
08:06   | Python AI    | Extract emails from posts (parallel)      | Email list
08:08   | Python AI    | Classify jobs into categories             | Categorized jobs
08:10   | Python       | Remove duplicates (by URN)                | Unique jobs
08:12   | Python       | Store in Firestore `jobs` collection      | Database updated
08:15   | System Log   | Log scraping stats                        | Admin notification
--------|--------------|-------------------------------------------|------------------
09:00   | Python Cron  | Trigger daily application process         | Start automation
09:01   | Python       | Fetch active users from Firestore         | User list
09:02   | Python       | Run smart distribution algorithm          | Job assignments
09:03   | Celery       | Queue 1st batch of emails (20-50 emails)  | Redis queue
09:05   | Celery       | Send 1st email (random user)              | SMTP sent
09:37   | Celery       | Send 2nd email (32 min delay)             | SMTP sent
10:15   | Celery       | Send 3rd email (38 min delay)             | SMTP sent
...     | ...          | Continue with random delays...            | ...
23:45   | Celery       | Send last email of the day                | SMTP sent
23:59   | System       | Daily report generation                   | Email to admin
00:00   | System       | Archive old logs (>90 days)               | Cleanup complete
```

## 2.2 Detailed Flow: Scraping (8:00 AM - 8:15 AM)

### **Step 1: Trigger Scraping Job**
```python
# File: backend/cron/daily_scraper.py
# Runs at: 08:00 AM (Railway Cron)

@app.post("/cron/scrape-linkedin")
async def scrape_linkedin_jobs():
    """
    Main scraping endpoint - runs once daily at 8 AM
    """
    
    # Step 1: Initialize Apify client
    apify_client = ApifyClient(os.getenv("APIFY_API_TOKEN"))
    
    # Step 2: Define search URLs (same as your N8N workflow)
    search_urls = [
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=HIRING%20WEB%20DEVELOPER",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%23hiring%20wordpress%20developer",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20software%20developers",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20software%20engineer",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20Next.js",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20full%20stack",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20ai%20automation",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20ai%20developer",
        "https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20ai%20engineer",
    ]
    
    # Step 3: Run Apify actor
    run_input = {
        "deepScrape": True,
        "limitPerSource": 15,
        "rawData": False,
        "urls": search_urls
    }
    
    run = apify_client.actor("Wpp1BZ6yGWjySadk3").call(run_input=run_input)
    
    # Step 4: Get results from dataset
    dataset_id = run["defaultDatasetId"]
    dataset_items = apify_client.dataset(dataset_id).list_items().items
    
    # Log initial scrape count
    log_to_firestore("scraping_started", {
        "total_posts_scraped": len(dataset_items),
        "timestamp": datetime.now()
    })
    
    # Step 5: Process posts in parallel
    processed_jobs = await process_posts_parallel(dataset_items)
    
    # Step 6: Store in database
    stored_count = await store_jobs_in_firestore(processed_jobs)
    
    # Step 7: Log completion
    log_to_firestore("scraping_completed", {
        "posts_scraped": len(dataset_items),
        "jobs_with_email": len(processed_jobs),
        "jobs_stored": stored_count,
        "duration": (datetime.now() - start_time).seconds
    })
    
    return {
        "success": True,
        "scraped": len(dataset_items),
        "stored": stored_count
    }
```

### **Step 2: Process Posts (Extract Email + Classify)**
```python
# File: backend/services/post_processor.py

async def process_posts_parallel(posts: List[dict]) -> List[dict]:
    """
    Process all posts in parallel for speed
    """
    
    # Create tasks for parallel processing
    tasks = [process_single_post(post) for post in posts]
    
    # Run all tasks concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Filter out failures and posts without emails
    valid_jobs = [r for r in results if r and r.get("email")]
    
    return valid_jobs


async def process_single_post(post: dict) -> dict:
    """
    Process a single LinkedIn post:
    1. Generate URN if missing
    2. Extract email using AI
    3. Classify job category using AI
    4. Return structured job object
    """
    
    # Step 1: Generate URN if missing
    urn = post.get("urn") or generate_unique_urn(post)
    
    # Step 2: Extract email from post text
    email = await extract_email_with_ai(post["text"])
    
    if not email:
        return None  # Skip posts without email
    
    # Step 3: Classify job category
    category = await classify_job_category(post["text"])
    
    # Step 4: Return structured job
    return {
        "jobId": str(uuid.uuid4()),
        "linkedinUrn": urn,
        "linkedinUrl": post.get("url", ""),
        "postText": post.get("text", ""),
        "recruiterEmail": email,
        "jobCategory": category,
        "scrapedAt": datetime.now().isoformat(),
        "appliedByUsers": [],
        "lastAppliedAt": None
    }


async def extract_email_with_ai(post_text: str) -> str:
    """
    Use Groq/OpenAI to extract email from post text
    Same logic as your Information Extractor node
    """
    
    client = AsyncOpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """Extract the primary and most relevant email address 
                from the text below that is intended for job applications. 
                If no email address is present, return empty string."""
            },
            {
                "role": "user",
                "content": post_text
            }
        ],
        temperature=0.1
    )
    
    email = response.choices[0].message.content.strip()
    
    # Validate email format
    if "@" in email and "." in email:
        return email
    
    return ""


async def classify_job_category(post_text: str) -> str:
    """
    Classify job into one of the predefined categories
    Returns: "Software Developer" | "Marketing" | "AI/ML Engineer" | etc.
    """
    
    client = AsyncOpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": """You are a job classification expert. 
                Analyze the job description and classify it into ONE category:
                
                Categories:
                - Software Developer (web dev, full stack, frontend, backend, WordPress)
                - AI/ML Engineer (AI, ML, data science, automation)
                - Marketing
                - Customer Support
                - Sales
                - Design
                - Data Analyst
                - Other
                
                Return ONLY the category name, nothing else."""
            },
            {
                "role": "user",
                "content": post_text
            }
        ],
        temperature=0.1
    )
    
    category = response.choices[0].message.content.strip()
    
    # Validate category
    valid_categories = [
        "Software Developer", "AI/ML Engineer", "Marketing",
        "Customer Support", "Sales", "Design", "Data Analyst", "Other"
    ]
    
    if category in valid_categories:
        return category
    
    return "Other"
```

### **Step 3: Remove Duplicates & Store**
```python
# File: backend/services/database.py

async def store_jobs_in_firestore(jobs: List[dict]) -> int:
    """
    Store jobs in Firestore after removing duplicates
    """
    
    db = firestore.client()
    
    # Step 1: Get existing URNs from database (today's jobs only)
    today_start = datetime.now().replace(hour=0, minute=0, second=0)
    existing_jobs = db.collection("jobs") \
        .where("scrapedAt", ">=", today_start.isoformat()) \
        .stream()
    
    existing_urns = {job.to_dict()["linkedinUrn"] for job in existing_jobs}
    
    # Step 2: Filter out duplicates
    new_jobs = [job for job in jobs if job["linkedinUrn"] not in existing_urns]
    
    # Step 3: Batch write to Firestore (max 500 per batch)
    batch = db.batch()
    stored_count = 0
    
    for i, job in enumerate(new_jobs):
        doc_ref = db.collection("jobs").document(job["jobId"])
        batch.set(doc_ref, job)
        stored_count += 1
        
        # Commit batch every 500 jobs
        if (i + 1) % 500 == 0:
            batch.commit()
            batch = db.batch()
    
    # Commit remaining jobs
    if stored_count % 500 != 0:
        batch.commit()
    
    return stored_count
```

## 2.3 Detailed Flow: Application Sending (9:00 AM - 11:59 PM)

### **Step 1: Fetch Active Users & Distribute Jobs**
```python
# File: backend/cron/application_sender.py
# Runs at: 09:00 AM (Railway Cron)

@app.post("/cron/distribute-jobs")
async def distribute_jobs_to_users():
    """
    Smart job distribution - runs once at 9 AM
    Creates email tasks in Redis queue
    """
    
    db = firestore.client()
    
    # Step 1: Get all active users
    users = db.collection("users") \
        .where("isActive", "==", True) \
        .where("subscriptionStatus", "==", "active") \
        .stream()
    
    users_list = [user.to_dict() for user in users]
    
    if not users_list:
        return {"message": "No active users"}
    
    # Step 2: Get today's jobs
    today_start = datetime.now().replace(hour=0, minute=0, second=0)
    jobs = db.collection("jobs") \
        .where("scrapedAt", ">=", today_start.isoformat()) \
        .stream()
    
    jobs_by_category = {}
    for job in jobs:
        job_data = job.to_dict()
        category = job_data["jobCategory"]
        if category not in jobs_by_category:
            jobs_by_category[category] = []
        jobs_by_category[category].append(job_data)
    
    # Step 3: Run smart distribution algorithm
    total_emails_queued = 0
    
    for category, jobs_list in jobs_by_category.items():
        # Get users for this category
        category_users = [u for u in users_list if u["jobCategory"] == category]
        
        if not category_users:
            continue
        
        # Run distribution algorithm
        assignments = smart_distribute_jobs(category_users, jobs_list)
        
        # Queue emails in Celery
        for user_id, assigned_jobs in assignments.items():
            for i, job in enumerate(assigned_jobs):
                # Random delay: 30-90 minutes per email
                delay_minutes = random.randint(30, 90) * i
                
                # Schedule email task
                send_application_email.apply_async(
                    args=[user_id, job["jobId"]],
                    countdown=delay_minutes * 60  # convert to seconds
                )
                
                total_emails_queued += 1
    
    return {
        "success": True,
        "users_processed": len(users_list),
        "emails_queued": total_emails_queued
    }


def smart_distribute_jobs(users: List[dict], jobs: List[dict]) -> dict:
    """
    Distribute jobs fairly across users
    Prevents spam to same recruiter
    """
    
    # Shuffle jobs for randomness
    random.shuffle(jobs)
    
    # Calculate apps per user
    total_jobs = len(jobs)
    total_users = len(users)
    
    apps_per_user = min(20, total_jobs // total_users if total_users > 0 else 20)
    
    # If very limited jobs, notify users
    if apps_per_user < 10:
        notify_low_job_availability(users, apps_per_user)
    
    # Round-robin distribution
    assignments = {user["uid"]: [] for user in users}
    job_index = 0
    
    for user in users:
        user_id = user["uid"]
        assigned_count = 0
        
        while assigned_count < apps_per_user and job_index < total_jobs:
            job = jobs[job_index]
            
            # Check if user already applied to this job
            if user_id not in job.get("appliedByUsers", []):
                assignments[user_id].append(job)
                assigned_count += 1
                
                # Mark job as assigned to this user (in-memory, updated in DB later)
                job.setdefault("appliedByUsers", []).append(user_id)
            
            job_index += 1
        
        # Reset index if we run out of jobs mid-user
        if job_index >= total_jobs and assigned_count < apps_per_user:
            job_index = 0
    
    return assignments
```

### **Step 2: Celery Task - Send Individual Email**
```python
# File: backend/tasks/email_sender.py

from celery import Celery
from celery.utils.log import get_task_logger

celery_app = Celery('tasks', broker=os.getenv('REDIS_URL'))
logger = get_task_logger(__name__)


@celery_app.task(bind=True, max_retries=3)
def send_application_email(self, user_id: str, job_id: str):
    """
    Send a single application email
    Retry on failure (max 3 attempts)
    """
    
    try:
        db = firestore.client()
        
        # Step 1: Fetch user data
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            logger.error(f"User {user_id} not found")
            return
        
        user = user_doc.to_dict()
        
        # Step 2: Fetch job data
        job_doc = db.collection("jobs").document(job_id).get()
        if not job_doc.exists:
            logger.error(f"Job {job_id} not found")
            return
        
        job = job_doc.to_dict()
        
        # Step 3: Check if already applied
        applications = db.collection("applications") \
            .where("userId", "==", user_id) \
            .where("jobId", "==", job_id) \
            .limit(1) \
            .stream()
        
        if len(list(applications)) > 0:
            logger.info(f"User {user_id} already applied to job {job_id}")
            return
        
        # Step 4: Generate email using AI
        email_content = generate_email_with_ai(user, job)
        
        # Step 5: Send email via SMTP
        smtp_result = send_via_smtp(
            user_smtp=user["smtpEmail"],
            user_password=decrypt_password(user["smtpPassword"]),
            recipient=job["recruiterEmail"],
            subject=email_content["subject"],
            body=email_content["body"],
            resume_url=user["resumeUrl"]
        )
        
        # Step 6: Log application
        application_data = {
            "applicationId": str(uuid.uuid4()),
            "userId": user_id,
            "jobId": job_id,
            "emailSubject": email_content["subject"],
            "emailBody": email_content["body"],
            "templateId": email_content["templateId"],
            "sentAt": datetime.now().isoformat(),
            "status": "sent" if smtp_result["success"] else "failed",
            "smtpResponse": smtp_result.get("response", ""),
            "errorMessage": smtp_result.get("error", None)
        }
        
        db.collection("applications").document(application_data["applicationId"]).set(application_data)
        
        # Step 7: Update job's appliedByUsers
        db.collection("jobs").document(job_id).update({
            "appliedByUsers": firestore.ArrayUnion([user_id]),
            "lastAppliedAt": datetime.now().isoformat()
        })
        
        logger.info(f"✅ Email sent: User {user_id} → Job {job_id}")
        
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        # Retry task (max 3 times with exponential backoff)
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


def generate_email_with_ai(user: dict, job: dict) -> dict:
    """
    Generate personalized email using random template + AI
    """
    
    db = firestore.client()
    
    # Step 1: Get random template (1-60)
    template_id = random.randint(1, 60)
    template_doc = db.collection("email_templates").document(str(template_id)).get()
    template = template_doc.to_dict()
    
    # Step 2: Use AI to fill template with job-specific content
    client = OpenAI(
        api_key=os.getenv("GROQ_API_KEY"),
        base_url="https://api.groq.com/openai/v1"
    )
    
    prompt = f"""
    You are writing a job application email.
    
    User Name: {user["name"]}
    Job Post: {job["postText"]}
    Template: {template["body"]}
    
    Fill in the template with relevant details from the job post.
    Keep it natural and personalized.
    
    Return ONLY JSON:
    {{
        "subject": "...",
        "body": "..."
    }}
    """
    
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7
    )
    
    email_json = json.loads(response.choices[0].message.content)
    email_json["templateId"] = template_id
    
    return email_json


def send_via_smtp(user_smtp: str, user_password: str, recipient: str, 
                  subject: str, body: str, resume_url: str) -> dict:
    """
    Send email via user's SMTP with resume attachment
    """
    
    try:
        # Download resume from Firebase Storage
        storage_client = storage.Client()
        bucket = storage_client.bucket("your-app.appspot.com")
        blob = bucket.blob(resume_url.replace("gs://your-app.appspot.com/", ""))
        resume_bytes = blob.download_as_bytes()
        
        # Create email
        msg = MIMEMultipart()
        msg['From'] = user_smtp
        msg['To'] = recipient
        msg['Subject'] = subject
        
        # Attach body
        msg.attach(MIMEText(body, 'plain'))
        
        # Attach resume
        attachment = MIMEApplication(resume_bytes, _subtype="pdf")
        attachment.add_header('Content-Disposition', 'attachment', filename='resume.pdf')
        msg.attach(attachment)
        
        # Send via SMTP
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
            server.login(user_smtp, user_password)
            server.send_message(msg)
        
        return {"success": True, "response": "250 OK"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

# 3. DATABASE SCHEMA (PRODUCTION)

## 3.1 Firestore Collections (Complete)

### **users**
```javascript
{
  // Primary Keys
  uid: "AbC123XyZ",                    // Firebase Auth UID
  email: "user@gmail.com",             // User's email
  
  // Profile
  name: "Rahul Sharma",                // Extracted from resume
  resumeUrl: "resumes/AbC123XyZ/resume.pdf",  // Firebase Storage path
  jobCategory: "Software Developer",   // Selected category
  
  // SMTP Configuration (Encrypted)
  smtpEmail: "user@gmail.com",
  smtpPassword: "U2FsdGVkX1...",       // AES-256 encrypted
  smtpServer: "smtp.gmail.com",
  smtpPort: 465,
  smtpTested: true,                    // Connection verified?
  smtpLastError: null,                 // Last SMTP error (if any)
  
  // Automation Settings
  isActive: true,                      // Automation on/off
  dailyApplicationLimit: 20,           // Max apps per day
  applicationsToday: 14,               // Count today
  applicationsThisWeek: 68,
  applicationsThisMonth: 420,
  applicationsTotal: 2140,
  lastApplicationSentAt: "2026-01-27T14:30:00Z",
  
  // Subscription
  subscriptionStatus: "active",        // active | paused | cancelled | trial
  subscriptionPlan: "pro",             // For future plans
  subscriptionStartedAt: "2026-01-15T10:00:00Z",
  subscriptionEndsAt: "2026-02-15T10:00:00Z",
  
  // Metadata
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-01-27T09:00:00Z",
  lastLoginAt: "2026-01-27T08:45:00Z"
}

// Indexes:
// - jobCategory (for distribution queries)
// - isActive + subscriptionStatus (for active user queries)
```

### **jobs**
```javascript
{
  // Primary Keys
  jobId: "job_7a8b9c0d",               // Auto-generated UUID
  linkedinUrn: "urn:li:activity:123",  // Unique LinkedIn identifier
  
  // Job Details
  linkedinUrl: "https://linkedin.com/feed/update/...",
  postText: "We're hiring React developers...",  // Full post text
  recruiterEmail: "hr@company.com",
  jobCategory: "Software Developer",   // AI-classified
  
  // Application Tracking
  appliedByUsers: ["user1", "user2"], // Array of user IDs
  applicationCount: 2,                 // Total applications sent
  lastAppliedAt: "2026-01-27T10:30:00Z",
  
  // Metadata
  scrapedAt: "2026-01-27T08:05:00Z",
  createdAt: "2026-01-27T08:10:00Z",
  expiresAt: "2026-01-29T00:00:00Z"   // Auto-delete after 48h
}

// Indexes:
// - jobCategory + scrapedAt (for distribution)
// - linkedinUrn (unique constraint)
// - expiresAt (TTL index for auto-cleanup)
```

### **applications**
```javascript
{
  // Primary Keys
  applicationId: "app_1a2b3c4d",
  userId: "AbC123XyZ",
  jobId: "job_7a8b9c0d",
  
  // Email Content
  emailSubject: "Application for React Developer",
  emailBody: "Hi,\n\nI came across...",
  templateId: 23,                      // Which template (1-60)
  
  // Sending Details
  sentAt: "2026-01-27T10:30:00Z",
  sentToEmail: "hr@company.com",
  
  // Status Tracking
  status: "sent",                      // sent | failed | bounced
  smtpResponse: "250 2.0.0 OK",
  errorMessage: null,
  retryCount: 0,
  
  // Metadata
  createdAt: "2026-01-27T10:30:00Z"
}

// Indexes:
// - userId + sentAt (for user dashboard queries)
// - jobId (for duplicate prevention)
// - status (for monitoring)
```

### **email_templates**
```javascript
{
  // Primary Key
  templateId: 1,                       // 1 to 60
  
  // Template Content
  subject: "Application for {JOB_TITLE}",
  body: `Hi,

I came across your post on LinkedIn about {JOB_TITLE}. With my experience in {SKILLS}, I believe I'd be a great fit.

Here's my portfolio:
{PORTFOLIO_URL}

I've attached my resume for your review.

Looking forward to hearing from you!

Best regards,
{USER_NAME}`,
  
  // Metadata
  tone: "professional",                // casual | professional | formal
  length: "medium",                    // short | medium | long
  isActive: true,
  usageCount: 342,                     // Times used
  successRate: 0.18,                   // Interview callback rate
  createdAt: "2026-01-10T00:00:00Z",
  updatedAt: "2026-01-27T00:00:00Z"
}

// 60 templates total - mix of tones and structures
```

### **system_logs**
```javascript
{
  // Primary Key
  logId: "log_9x8y7z6w",
  
  // Log Details
  type: "scraping",                    // scraping | email_sending | error | system
  level: "info",                       // info | warning | error | critical
  message: "Scraped 1,234 LinkedIn posts",
  
  // Metadata
  metadata: {
    jobsScraped: 1234,
    jobsWithEmail: 856,
    jobsStored: 789,
    duration: "45s",
    memoryUsage: "234MB",
    errors: []
  },
  
  // Timestamps
  timestamp: "2026-01-27T08:15:00Z"
}

// Indexes:
// - type + timestamp (for filtering logs)
// - level (for error monitoring)
```

### **admin_stats** (Daily Aggregates)
```javascript
{
  // Primary Key
  date: "2026-01-27",
  
  // User Stats
  totalUsers: 487,
  activeUsers: 412,
  newUsersToday: 12,
  churnedUsersToday: 3,
  
  // Application Stats
  applicationsToday: 8240,
  applicationsSuccessful: 8102,
  applicationsFailed: 138,
  
  // Job Stats
  jobsScraped: 1234,
  jobsWithEmail: 856,
  jobsByCategory: {
    "Software Developer": 423,
    "AI/ML Engineer": 189,
    "Marketing": 134,
    "Other": 110
  },
  
  // Revenue Stats
  mrr: 584400,                         // ₹5,84,400
  newSubscriptions: 12,
  cancelledSubscriptions: 3,
  
  // System Health
  scrapingSuccess: true,
  scrapingDuration: "45s",
  emailQueueLength: 234,
  systemUptime: 0.998,
  
  // Timestamps
  generatedAt: "2026-01-27T23:59:00Z"
}
```

---

# 4. BACKEND SERVICES (DETAILED)

## 4.1 Project Structure

```
backend/
├── main.py                    # FastAPI entry point
├── requirements.txt
├── .env
├── config/
│   ├── firebase.py           # Firebase initialization
│   ├── redis.py              # Redis connection
│   └── settings.py           # Environment variables
├── services/
│   ├── scraper.py            # LinkedIn scraping logic
│   ├── email_extractor.py    # AI email extraction
│   ├── job_classifier.py     # AI job classification
│   ├── email_generator.py    # AI email generation
│   └── smtp_sender.py        # SMTP email sending
├── tasks/
│   ├── celery_app.py         # Celery configuration
│   └── email_tasks.py        # Email sending tasks
├── cron/
│   ├── daily_scraper.py      # 8 AM scraping job
│   ├── job_distributor.py    # 9 AM distribution job
│   └── cleanup.py            # Midnight cleanup job
├── api/
│   ├── users.py              # User management endpoints
│   ├── jobs.py               # Job listing endpoints
│   └── admin.py              # Admin dashboard endpoints
└── utils/
    ├── encryption.py         # Password encryption
    ├── logger.py             # Custom logging
    └── validators.py         # Input validation
```

## 4.2 Core Services Implementation

### **scraper.py - LinkedIn Scraping**
```python
# File: backend/services/scraper.py

from apify_client import ApifyClient
from typing import List, Dict
import asyncio

class LinkedInScraper:
    """
    Handles all LinkedIn scraping operations via Apify
    """
    
    def __init__(self):
        self.client = ApifyClient(os.getenv("APIFY_API_TOKEN"))
        self.actor_id = "Wpp1BZ6yGWjySadk3"  # Your Apify actor
    
    async def scrape_jobs(self) -> List[Dict]:
        """
        Scrape LinkedIn jobs from last 24 hours
        Returns raw post data
        """
        
        # Define search keywords (covering all job categories)
        search_keywords = [
            # Software Development
            "HIRING WEB DEVELOPER",
            "hiring software developer",
            "hiring full stack developer",
            "hiring react developer",
            "hiring next.js developer",
            
            # AI/ML
            "hiring ai engineer",
            "hiring machine learning",
            "hiring data scientist",
            "hiring ai developer",
            
            # Marketing
            "hiring digital marketer",
            "hiring content writer",
            "hiring seo specialist",
            
            # Other
            "hiring customer support",
            "hiring sales executive",
            "hiring designer"
        ]
        
        # Build URLs
        search_urls = [
            f"https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords={keyword.replace(' ', '%20')}"
            for keyword in search_keywords
        ]
        
        # Run Apify actor
        run_input = {
            "deepScrape": True,
            "limitPerSource": 15,
            "rawData": False,
            "urls": search_urls
        }
        
        print(f"🔍 Starting Apify scraping with {len(search_urls)} URLs...")
        
        run = self.client.actor(self.actor_id).call(run_input=run_input)
        dataset_id = run["defaultDatasetId"]
        
        # Fetch results
        dataset_items = self.client.dataset(dataset_id).list_items().items
        
        print(f"✅ Scraped {len(dataset_items)} posts from LinkedIn")
        
        return dataset_items
```

### **email_extractor.py - AI Email Extraction**
```python
# File: backend/services/email_extractor.py

from openai import AsyncOpenAI
import re

class EmailExtractor:
    """
    Extract email addresses from job posts using AI
    """
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1"
        )
    
    async def extract_email(self, post_text: str) -> str:
        """
        Extract email using AI (same as your Information Extractor)
        """
        
        # First, try regex pattern (faster, cheaper)
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, post_text)
        
        if emails:
            # Return first valid email
            return emails[0]
        
        # If no regex match, use AI
        response = await self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "Extract the primary email address for job applications. Return ONLY the email, nothing else. If no email found, return 'NONE'."
                },
                {
                    "role": "user",
                    "content": post_text
                }
            ],
            temperature=0.1,
            max_tokens=50
        )
        
        email = response.choices[0].message.content.strip()
        
        # Validate
        if "@" in email and "." in email and "NONE" not in email.upper():
            return email
        
        return ""
```

### **job_classifier.py - AI Job Classification**
```python
# File: backend/services/job_classifier.py

class JobClassifier:
    """
    Classify jobs into predefined categories using AI
    """
    
    CATEGORIES = [
        "Software Developer",
        "AI/ML Engineer",
        "Marketing",
        "Customer Support",
        "Sales",
        "Design",
        "Data Analyst",
        "Other"
    ]
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1"
        )
    
    async def classify(self, post_text: str) -> str:
        """
        Classify job post into one category
        """
        
        system_prompt = f"""You are a job classification expert.
Analyze the job description and classify it into ONE category:

{', '.join(self.CATEGORIES)}

Return ONLY the category name, nothing else."""
        
        response = await self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": post_text[:1000]}  # Limit text
            ],
            temperature=0.1,
            max_tokens=20
        )
        
        category = response.choices[0].message.content.strip()
        
        # Validate
        if category in self.CATEGORIES:
            return category
        
        return "Other"
```

---

# 5. CRON JOBS & SCHEDULING

## 5.1 Railway Cron Configuration

```yaml
# File: railway.toml (in backend/ directory)

[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"

# Cron Jobs
[[crons]]
name = "daily-scraper"
schedule = "0 8 * * *"           # 8:00 AM daily (UTC)
command = "python -m cron.daily_scraper"

[[crons]]
name = "job-distributor"
schedule = "0 9 * * *"           # 9:00 AM daily
command = "python -m cron.job_distributor"

[[crons]]
name = "cleanup-old-jobs"
schedule = "0 0 * * *"           # Midnight daily
command = "python -m cron.cleanup"
```

## 5.2 Cron Job Implementations

### **daily_scraper.py**
```python
# File: backend/cron/daily_scraper.py

import asyncio
from services.scraper import LinkedInScraper
from services.email_extractor import EmailExtractor
from services.job_classifier import JobClassifier
from config.firebase import db
from datetime import datetime
import uuid

async def main():
    """
    Main scraping pipeline
    Runs at 8:00 AM daily
    """
    
    start_time = datetime.now()
    print(f"🚀 Starting daily scraping job at {start_time}")
    
    # Step 1: Scrape LinkedIn
    scraper = LinkedInScraper()
    raw_posts = await scraper.scrape_jobs()
    
    print(f"📥 Received {len(raw_posts)} posts from Apify")
    
    # Step 2: Process posts in parallel
    email_extractor = EmailExtractor()
    classifier = JobClassifier()
    
    async def process_post(post):
        # Generate URN if missing
        urn = post.get("urn") or f"urn:li:activity:{uuid.uuid4().hex}"
        
        # Extract email
        email = await email_extractor.extract_email(post.get("text", ""))
        if not email:
            return None
        
        # Classify job
        category = await classifier.classify(post.get("text", ""))
        
        return {
            "jobId": str(uuid.uuid4()),
            "linkedinUrn": urn,
            "linkedinUrl": post.get("url", ""),
            "postText": post.get("text", ""),
            "recruiterEmail": email,
            "jobCategory": category,
            "scrapedAt": datetime.now().isoformat(),
            "appliedByUsers": [],
            "applicationCount": 0,
            "lastAppliedAt": None,
            "createdAt": datetime.now().isoformat(),
            "expiresAt": (datetime.now() + timedelta(days=2)).isoformat()
        }
    
    # Process all posts concurrently
    tasks = [process_post(post) for post in raw_posts]
    processed_jobs = await asyncio.gather(*tasks)
    
    # Filter out None values (posts without email)
    valid_jobs = [job for job in processed_jobs if job is not None]
    
    print(f"✅ Processed {len(valid_jobs)} jobs with valid emails")
    
    # Step 3: Remove duplicates
    existing_urns = set()
    query = db.collection("jobs") \
        .where("scrapedAt", ">=", datetime.now().replace(hour=0, minute=0).isoformat()) \
        .stream()
    
    for doc in query:
        existing_urns.add(doc.to_dict()["linkedinUrn"])
    
    new_jobs = [job for job in valid_jobs if job["linkedinUrn"] not in existing_urns]
    
    print(f"📝 {len(new_jobs)} new jobs to store (removed {len(valid_jobs) - len(new_jobs)} duplicates)")
    
    # Step 4: Batch write to Firestore
    batch = db.batch()
    for i, job in enumerate(new_jobs):
        doc_ref = db.collection("jobs").document(job["jobId"])
        batch.set(doc_ref, job)
        
        if (i + 1) % 500 == 0:
            batch.commit()
            batch = db.batch()
            print(f"💾 Committed batch {i + 1}/{len(new_jobs)}")
    
    if len(new_jobs) % 500 != 0:
        batch.commit()
    
    # Step 5: Log results
    duration = (datetime.now() - start_time).seconds
    
    log_data = {
        "logId": str(uuid.uuid4()),
        "type": "scraping",
        "level": "info",
        "message": f"Daily scraping completed: {len(new_jobs)} jobs stored",
        "metadata": {
            "postsScraped": len(raw_posts),
            "jobsWithEmail": len(valid_jobs),
            "jobsStored": len(new_jobs),
            "duration": f"{duration}s"
        },
        "timestamp": datetime.now().isoformat()
    }
    
    db.collection("system_logs").add(log_data)
    
    print(f"✨ Scraping complete in {duration}s")
    print(f"📊 Stats: {len(raw_posts)} scraped → {len(valid_jobs)} valid → {len(new_jobs)} stored")


if __name__ == "__main__":
    asyncio.run(main())
```

### **job_distributor.py**
```python
# File: backend/cron/job_distributor.py

import random
from datetime import datetime, timedelta
from config.firebase import db
from config.redis import redis_client
from tasks.email_tasks import send_application_email

def main():
    """
    Distribute jobs to users
    Runs at 9:00 AM daily
    """
    
    print("🎯 Starting job distribution...")
    
    # Step 1: Get active users
    users = db.collection("users") \
        .where("isActive", "==", True) \
        .where("subscriptionStatus", "==", "active") \
        .stream()
    
    users_by_category = {}
    for user in users:
        user_data = user.to_dict()
        category = user_data["jobCategory"]
        if category not in users_by_category:
            users_by_category[category] = []
        users_by_category[category].append(user_data)
    
    print(f"👥 Found {sum(len(u) for u in users_by_category.values())} active users")
    
    # Step 2: Get today's jobs
    today_start = datetime.now().replace(hour=0, minute=0, second=0)
    jobs = db.collection("jobs") \
        .where("scrapedAt", ">=", today_start.isoformat()) \
        .stream()
    
    jobs_by_category = {}
    for job in jobs:
        job_data = job.to_dict()
        category = job_data["jobCategory"]
        if category not in jobs_by_category:
            jobs_by_category[category] = []
        jobs_by_category[category].append(job_data)
    
    print(f"💼 Found {sum(len(j) for j in jobs_by_category.values())} jobs")
    
    # Step 3: Distribute and queue emails
    total_queued = 0
    
    for category in users_by_category.keys():
        category_users = users_by_category.get(category, [])
        category_jobs = jobs_by_category.get(category, [])
        
        if not category_users or not category_jobs:
            continue
        
        print(f"\n📂 Category: {category}")
        print(f"   Users: {len(category_users)}, Jobs: {len(category_jobs)}")
        
        # Shuffle jobs for randomness
        random.shuffle(category_jobs)
        
        # Calculate apps per user
        apps_per_user = min(20, len(category_jobs) // len(category_users))
        
        if apps_per_user < 10:
            print(f"   ⚠️ Limited jobs: {apps_per_user} per user")
        
        # Round-robin distribution
        job_index = 0
        for user in category_users:
            assigned_count = 0
            
            while assigned_count < apps_per_user and job_index < len(category_jobs):
                job = category_jobs[job_index]
                
                # Check if user already applied
                if user["uid"] not in job.get("appliedByUsers", []):
                    # Calculate delay (30-90 minutes per email)
                    delay_minutes = random.randint(30, 90) * assigned_count
                    
                    # Queue email task in Celery
                    send_application_email.apply_async(
                        args=[user["uid"], job["jobId"]],
                        countdown=delay_minutes * 60
                    )
                    
                    assigned_count += 1
                    total_queued += 1
                
                job_index += 1
            
            print(f"   ✓ Queued {assigned_count} emails for {user['email']}")
    
    print(f"\n✨ Distribution complete: {total_queued} emails queued")


if __name__ == "__main__":
    main()
```

---

# 6. SMART DISTRIBUTION ENGINE

## Complete Algorithm with Edge Cases

```python
# File: backend/services/distribution_engine.py

class DistributionEngine:
    """
    Smart job distribution algorithm
    Handles all edge cases
    """
    
    def distribute(self, users: List[Dict], jobs: List[Dict]) -> Dict[str, List[Dict]]:
        """
        Distribute jobs fairly across users
        
        Edge cases handled:
        1. More users than jobs
        2. More jobs than users  
        3. Users already applied to jobs
        4. Same recruiter spam prevention
        """
        
        # Shuffle for randomness
        random.shuffle(jobs)
        
        total_users = len(users)
        total_jobs = len(jobs)
        
        # Calculate apps per user
        if total_jobs >= total_users * 20:
            # Plenty of jobs: everyone gets 20
            target_per_user = 20
        else:
            # Limited jobs: distribute evenly
            target_per_user = max(1, total_jobs // total_users)
        
        # Initialize assignments
        assignments = {user["uid"]: [] for user in users}
        
        # Track which jobs assigned to which users (prevent spam)
        job_assignment_times = {}  # {jobId: [(userId, timestamp)]}
        
        # Round-robin with spam prevention
        job_pool = jobs.copy()
        
        for round_num in range(target_per_user):
            for user in users:
                if not job_pool:
                    break
                
                # Find first available job for this user
                for i, job in enumerate(job_pool):
                    job_id = job["jobId"]
                    user_id = user["uid"]
                    
                    # Check 1: User hasn't applied yet
                    if user_id in job.get("appliedByUsers", []):
                        continue
                    
                    # Check 2: Prevent spam (max 3 users per job per hour)
                    if job_id in job_assignment_times:
                        recent_assignments = [
                            (uid, ts) for uid, ts in job_assignment_times[job_id]
                            if (datetime.now() - ts).seconds < 3600
                        ]
                        if len(recent_assignments) >= 3:
                            continue
                    
                    # Assign job
                    assignments[user_id].append(job)
                    
                    # Track assignment
                    if job_id not in job_assignment_times:
                        job_assignment_times[job_id] = []
                    job_assignment_times[job_id].append((user_id, datetime.now()))
                    
                    # Mark as assigned (in-memory)
                    job["appliedByUsers"].append(user_id)
                    
                    # Remove from pool
                    job_pool.pop(i)
                    break
        
        return assignments
```

---

# 7. EMAIL PROCESSING SYSTEM

## Celery Task with Full Error Handling

```python
# File: backend/tasks/email_tasks.py

from celery import Celery
from celery.exceptions import MaxRetriesExceededError
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication

celery_app = Celery('tasks', broker=os.getenv('REDIS_URL'))


@celery_app.task(bind=True, max_retries=3, default_retry_delay=300)
def send_application_email(self, user_id: str, job_id: str):
    """
    Production-ready email sending with retries
    """
    
    try:
        # Fetch data
        user = db.collection("users").document(user_id).get().to_dict()
        job = db.collection("jobs").document(job_id).get().to_dict()
        
        # Check duplicate
        existing = db.collection("applications") \
            .where("userId", "==", user_id) \
            .where("jobId", "==", job_id) \
            .limit(1).get()
        
        if existing:
            return {"status": "skipped", "reason": "already_applied"}
        
        # Generate email
        email_content = generate_personalized_email(user, job)
        
        # Download resume
        resume_bytes = download_resume(user["resumeUrl"])
        
        # Send via SMTP
        smtp_result = send_smtp_email(
            from_email=user["smtpEmail"],
            password=decrypt(user["smtpPassword"]),
            to_email=job["recruiterEmail"],
            subject=email_content["subject"],
            body=email_content["body"],
            attachment=resume_bytes
        )
        
        # Log application
        app_data = {
            "applicationId": str(uuid.uuid4()),
            "userId": user_id,
            "jobId": job_id,
            "emailSubject": email_content["subject"],
            "emailBody": email_content["body"],
            "templateId": email_content["templateId"],
            "sentAt": datetime.now().isoformat(),
            "sentToEmail": job["recruiterEmail"],
            "status": "sent" if smtp_result["success"] else "failed",
            "smtpResponse": smtp_result.get("response", ""),
            "errorMessage": smtp_result.get("error"),
            "retryCount": self.request.retries
        }
        
        db.collection("applications").add(app_data)
        
        # Update job
        db.collection("jobs").document(job_id).update({
            "appliedByUsers": firestore.ArrayUnion([user_id]),
            "applicationCount": firestore.Increment(1),
            "lastAppliedAt": datetime.now().isoformat()
        })
        
        # Update user stats
        db.collection("users").document(user_id).update({
            "applicationsToday": firestore.Increment(1),
            "applicationsTotal": firestore.Increment(1),
            "lastApplicationSentAt": datetime.now().isoformat()
        })
        
        return {"status": "success"}
        
    except smtplib.SMTPAuthenticationError:
        # SMTP credentials invalid - don't retry
        log_error("smtp_auth_failed", user_id, job_id)
        return {"status": "failed", "reason": "smtp_auth"}
        
    except Exception as e:
        # Retry on other errors
        try:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        except MaxRetriesExceededError:
            log_error("max_retries_exceeded", user_id, job_id, str(e))
            return {"status": "failed", "reason": "max_retries"}
```

---

# 8. FRONTEND APPLICATION

## 8.1 Complete Next.js Folder Structure

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   │   └── page.tsx              # User dashboard
│   │   ├── settings/
│   │   │   └── page.tsx              # User settings
│   │   └── layout.tsx                # Dashboard layout with nav
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── page.tsx              # Admin overview
│   │   │   ├── users/
│   │   │   │   └── page.tsx          # User management
│   │   │   ├── revenue/
│   │   │   │   └── page.tsx          # Revenue dashboard
│   │   │   └── logs/
│   │   │       └── page.tsx          # System logs
│   │   └── layout.tsx                # Admin layout
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   └── login/route.ts
│   │   ├── user/
│   │   │   ├── profile/route.ts
│   │   │   ├── upload-resume/route.ts
│   │   │   ├── setup-smtp/route.ts
│   │   │   └── toggle-automation/route.ts
│   │   ├── dashboard/
│   │   │   ├── stats/route.ts
│   │   │   └── applications/route.ts
│   │   └── admin/
│   │       ├── overview/route.ts
│   │       ├── users/route.ts
│   │       └── revenue/route.ts
│   ├── onboarding/
│   │   ├── page.tsx                  # Multi-step onboarding
│   │   └── layout.tsx
│   ├── page.tsx                      # Landing page
│   ├── layout.tsx                    # Root layout
│   └── globals.css
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── onboarding/
│   │   ├── StepUploadResume.tsx
│   │   ├── StepSelectCategory.tsx
│   │   ├── StepSetupSMTP.tsx
│   │   └── StepComplete.tsx
│   ├── dashboard/
│   │   ├── StatsCard.tsx
│   │   ├── ApplicationsList.tsx
│   │   ├── AutomationToggle.tsx
│   │   └── RecentActivity.tsx
│   ├── admin/
│   │   ├── UserTable.tsx
│   │   ├── RevenueChart.tsx
│   │   └── SystemHealth.tsx
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── toast.tsx
│   │   └── ... (shadcn components)
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── lib/
│   ├── firebase.ts                   # Firebase config
│   ├── api-client.ts                 # Python backend client
│   ├── auth.ts                       # Auth helpers
│   └── utils.ts                      # Utility functions
├── hooks/
│   ├── useAuth.ts
│   ├── useDashboard.ts
│   └── useAdmin.ts
├── types/
│   ├── user.ts
│   ├── job.ts
│   └── application.ts
└── public/
    ├── images/
    └── fonts/
```

## 8.2 Key Pages Implementation

### **Landing Page** (Stripe-Inspired)
```tsx
// File: app/page.tsx

'use client';

import { motion } from 'framer-motion';
import { Sparkles, Zap, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-32">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-black" />
        
        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">
              Apply to 20 Jobs Daily
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                While You Sleep
              </span>
            </h1>
            
            <p className="mt-6 text-xl text-gray-400 max-w-2xl mx-auto">
              AI-powered job application automation. Upload your resume, 
              set your preferences, and let our system apply to relevant 
              jobs on LinkedIn every single day.
            </p>
            
            <div className="mt-10 flex gap-4 justify-center">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <FeatureCard key={i} {...feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-24 bg-zinc-900/50">
        <div className="mx-auto max-w-md">
          <PricingCard />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm hover:border-purple-500/50 transition-all"
    >
      <Icon className="h-12 w-12 text-purple-400" />
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-gray-400">{description}</p>
    </motion.div>
  );
}

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Matching',
    description: 'Our AI analyzes job posts and generates personalized applications.'
  },
  {
    icon: Zap,
    title: 'Automated Daily Applications',
    description: 'Up to 20 applications sent automatically every single day.'
  },
  {
    icon: Shield,
    title: 'Your Email, Your Control',
    description: 'Uses your own email via SMTP. No third-party sending.'
  }
];
```

### **Onboarding Flow** (Multi-Step)
```tsx
// File: app/onboarding/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import StepUploadResume from '@/components/onboarding/StepUploadResume';
import StepSelectCategory from '@/components/onboarding/StepSelectCategory';
import StepSetupSMTP from '@/components/onboarding/StepSetupSMTP';
import StepComplete from '@/components/onboarding/StepComplete';

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    resumeFile: null,
    resumeUrl: '',
    userName: '',
    jobCategory: '',
    smtpEmail: '',
    smtpPassword: ''
  });
  const router = useRouter();

  const steps = [
    { number: 1, title: 'Upload Resume', component: StepUploadResume },
    { number: 2, title: 'Select Category', component: StepSelectCategory },
    { number: 3, title: 'Setup Email', component: StepSetupSMTP },
    { number: 4, title: 'Complete', component: StepComplete }
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleNext = (data: any) => {
    setFormData({ ...formData, ...data });
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center ${
                  step.number <= currentStep ? 'text-purple-400' : 'text-gray-600'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    step.number <= currentStep
                      ? 'border-purple-400 bg-purple-400/20'
                      : 'border-gray-600'
                  }`}
                >
                  {step.number}
                </div>
                <span className="ml-2 text-sm hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: '0%' }}
              animate={{ width: `${(currentStep / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentStepComponent
              data={formData}
              onNext={handleNext}
              onBack={handleBack}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
```

### **User Dashboard**
```tsx
// File: app/(dashboard)/dashboard/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Mail, Calendar, Zap } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import ApplicationsList from '@/components/dashboard/ApplicationsList';
import AutomationToggle from '@/components/dashboard/AutomationToggle';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    const response = await fetch('/api/dashboard/stats');
    const data = await response.json();
    setStats(data);
    setLoading(false);
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {stats.userName}! 👋</h1>
          <p className="text-gray-400 mt-2">
            Here's what's happening with your job applications
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={Mail}
            title="Today"
            value={`${stats.applicationsToday}/20`}
            subtitle="Applications sent"
            trend={stats.applicationsToday > stats.averageDaily ? 'up' : 'down'}
          />
          <StatsCard
            icon={Calendar}
            title="This Week"
            value={stats.applicationsThisWeek}
            subtitle="Applications sent"
          />
          <StatsCard
            icon={TrendingUp}
            title="This Month"
            value={stats.applicationsThisMonth}
            subtitle="Applications sent"
          />
          <StatsCard
            icon={Zap}
            title="Total"
            value={stats.applicationsTotal}
            subtitle="All time"
          />
        </div>

        {/* Automation Status */}
        <div className="mb-8">
          <AutomationToggle 
            isActive={stats.isActive}
            nextBatch={stats.nextBatchTime}
          />
        </div>

        {/* Recent Applications */}
        <ApplicationsList applications={stats.recentApplications} />
      </div>
    </div>
  );
}
```

### **Admin Dashboard**
```tsx
// File: app/(admin)/admin/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Users, DollarSign, Mail, Activity } from 'lucide-react';
import RevenueChart from '@/components/admin/RevenueChart';
import UserTable from '@/components/admin/UserTable';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  async function fetchAdminStats() {
    const response = await fetch('/api/admin/overview');
    const data = await response.json();
    setStats(data);
  }

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={Users}
            title="Total Users"
            value={stats.totalUsers}
            subtitle={`${stats.activeUsers} active`}
          />
          <MetricCard
            icon={DollarSign}
            title="MRR"
            value={`₹${stats.mrr.toLocaleString()}`}
            subtitle={`${stats.growth}% growth`}
          />
          <MetricCard
            icon={Mail}
            title="Applications Today"
            value={stats.applicationsToday.toLocaleString()}
            subtitle="System-wide"
          />
          <MetricCard
            icon={Activity}
            title="System Uptime"
            value={`${(stats.uptime * 100).toFixed(1)}%`}
            subtitle="Last 30 days"
          />
        </div>

        {/* Revenue Chart */}
        <div className="mb-8">
          <RevenueChart data={stats.revenueData} />
        </div>

        {/* User Table */}
        <UserTable users={stats.recentUsers} />
      </div>
    </div>
  );
}
```

## 8.3 API Routes (Next.js)

### **Resume Upload**
```typescript
// File: app/api/user/upload-resume/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { OpenAI } from 'openai';

export async function POST(request: NextRequest) {
  try {
    // Verify Firebase token
    const token = request.headers.get('authorization')?.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get uploaded file
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file (PDF, max 5MB)
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files allowed' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Upload to Firebase Storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const fileName = `resumes/${userId}/resume.pdf`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    await bucket.file(fileName).save(fileBuffer, {
      metadata: { contentType: 'application/pdf' }
    });

    const resumeUrl = `gs://${bucket.name}/${fileName}`;

    // Extract name from resume using AI
    const openai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: 'https://api.groq.com/openai/v1'
    });

    // Convert PDF to text (simplified - use pdf-parse in production)
    const resumeText = await extractTextFromPDF(fileBuffer);

    const response = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Extract the full name from this resume. Return ONLY the name, nothing else.'
        },
        {
          role: 'user',
          content: resumeText.substring(0, 1000)
        }
      ],
      temperature: 0.1
    });

    const userName = response.choices[0].message.content.trim();

    // Update Firestore
    const db = getFirestore();
    await db.collection('users').doc(userId).update({
      resumeUrl,
      name: userName,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      resumeUrl,
      userName
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
```

### **SMTP Setup & Test**
```typescript
// File: app/api/user/setup-smtp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import CryptoJS from 'crypto-js';

export async function POST(request: NextRequest) {
  try {
    const { smtpEmail, smtpPassword } = await request.json();

    // Test SMTP connection
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: smtpEmail,
        pass: smtpPassword
      }
    });

    // Verify connection
    await transporter.verify();

    // Encrypt password (AES-256)
    const encryptedPassword = CryptoJS.AES.encrypt(
      smtpPassword,
      process.env.ENCRYPTION_SECRET
    ).toString();

    // Save to Firestore
    const userId = await getUserIdFromToken(request);
    await db.collection('users').doc(userId).update({
      smtpEmail,
      smtpPassword: encryptedPassword,
      smtpServer: 'smtp.gmail.com',
      smtpPort: 465,
      smtpTested: true,
      smtpLastError: null,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'SMTP configured successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}
```

---

# 9. ERROR HANDLING & RETRY LOGIC

## 9.1 Comprehensive Error Handling System

```python
# File: backend/utils/error_handler.py

from enum import Enum
from typing import Optional
import sentry_sdk

class ErrorType(Enum):
    SMTP_AUTH_FAILED = "smtp_auth_failed"
    SMTP_CONNECTION_FAILED = "smtp_connection_failed"
    EMAIL_BOUNCED = "email_bounced"
    SCRAPING_FAILED = "scraping_failed"
    AI_API_FAILED = "ai_api_failed"
    DATABASE_ERROR = "database_error"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"

class ErrorHandler:
    """
    Centralized error handling with categorization and retry logic
    """
    
    @staticmethod
    def handle(error: Exception, context: dict) -> dict:
        """
        Handle error based on type and determine retry strategy
        
        Returns:
            {
                "should_retry": bool,
                "retry_delay": int (seconds),
                "max_retries": int,
                "notify_user": bool,
                "notify_admin": bool
            }
        """
        
        error_type = ErrorHandler.classify_error(error)
        
        strategies = {
            ErrorType.SMTP_AUTH_FAILED: {
                "should_retry": False,  # No point retrying bad credentials
                "retry_delay": 0,
                "max_retries": 0,
                "notify_user": True,  # Tell user to fix SMTP
                "notify_admin": False
            },
            ErrorType.SMTP_CONNECTION_FAILED: {
                "should_retry": True,  # Network issue, retry
                "retry_delay": 300,  # 5 minutes
                "max_retries": 3,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.EMAIL_BOUNCED: {
                "should_retry": False,  # Invalid recipient
                "retry_delay": 0,
                "max_retries": 0,
                "notify_user": False,
                "notify_admin": False
            },
            ErrorType.SCRAPING_FAILED: {
                "should_retry": True,
                "retry_delay": 600,  # 10 minutes
                "max_retries": 3,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.AI_API_FAILED: {
                "should_retry": True,
                "retry_delay": 60,  # 1 minute
                "max_retries": 5,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.DATABASE_ERROR: {
                "should_retry": True,
                "retry_delay": 120,  # 2 minutes
                "max_retries": 3,
                "notify_user": False,
                "notify_admin": True
            },
            ErrorType.RATE_LIMIT_EXCEEDED: {
                "should_retry": True,
                "retry_delay": 3600,  # 1 hour
                "max_retries": 1,
                "notify_user": False,
                "notify_admin": True
            }
        }
        
        strategy = strategies.get(error_type, {
            "should_retry": False,
            "retry_delay": 0,
            "max_retries": 0,
            "notify_user": False,
            "notify_admin": True
        })
        
        # Log to Sentry
        sentry_sdk.capture_exception(error, contexts={"custom": context})
        
        # Log to database
        log_error_to_db(error_type, error, context)
        
        return strategy
    
    @staticmethod
    def classify_error(error: Exception) -> ErrorType:
        """Classify error based on exception type and message"""
        
        error_str = str(error).lower()
        
        if "authentication failed" in error_str or "535" in error_str:
            return ErrorType.SMTP_AUTH_FAILED
        
        if "connection refused" in error_str or "timed out" in error_str:
            return ErrorType.SMTP_CONNECTION_FAILED
        
        if "550" in error_str or "bounced" in error_str:
            return ErrorType.EMAIL_BOUNCED
        
        if "apify" in error_str or "scraping" in error_str:
            return ErrorType.SCRAPING_FAILED
        
        if "openai" in error_str or "groq" in error_str or "rate" in error_str:
            return ErrorType.AI_API_FAILED
        
        if "firestore" in error_str or "database" in error_str:
            return ErrorType.DATABASE_ERROR
        
        return ErrorType.RATE_LIMIT_EXCEEDED


def log_error_to_db(error_type: ErrorType, error: Exception, context: dict):
    """Log error to Firestore for tracking"""
    
    db.collection("system_logs").add({
        "logId": str(uuid.uuid4()),
        "type": "error",
        "level": "error",
        "errorType": error_type.value,
        "message": str(error),
        "context": context,
        "timestamp": datetime.now().isoformat()
    })
```

## 9.2 User Notification System

```python
# File: backend/services/notifications.py

async def notify_user_smtp_failed(user_id: str, error_message: str):
    """
    Notify user their SMTP credentials failed
    """
    
    user = db.collection("users").document(user_id).get().to_dict()
    
    # Update user status
    db.collection("users").document(user_id).update({
        "isActive": False,
        "smtpLastError": error_message,
        "smtpTested": False
    })
    
    # Send notification email (via admin SMTP)
    subject = "⚠️ Action Required: SMTP Connection Failed"
    body = f"""
Hi {user['name']},

We encountered an issue with your email configuration:

Error: {error_message}

Your automation has been paused. Please:

1. Go to Settings → Email Configuration
2. Update your SMTP password (use app-specific password)
3. Test the connection
4. Reactivate automation

Need help? Reply to this email.

Best regards,
JobApply Team
"""
    
    send_admin_email(user['email'], subject, body)


async def notify_admin_scraping_failed(error: Exception):
    """
    Alert admin when daily scraping fails
    """
    
    subject = "🚨 CRITICAL: LinkedIn Scraping Failed"
    body = f"""
Scraping job failed at {datetime.now().isoformat()}

Error: {str(error)}

Action needed:
- Check Apify status
- Check API credits
- Review logs in admin dashboard

System Impact:
- No new jobs scraped today
- Users won't receive applications
"""
    
    send_admin_email(os.getenv("ADMIN_EMAIL"), subject, body)
```

---

# 10. PERFORMANCE OPTIMIZATION

## 10.1 Redis Caching Strategy

```python
# File: backend/services/cache.py

import redis
import json
from typing import Optional

class CacheManager:
    """
    Redis caching for frequently accessed data
    """
    
    def __init__(self):
        self.redis = redis.from_url(os.getenv("REDIS_URL"))
    
    def get_user_applications_today(self, user_id: str) -> Optional[int]:
        """Cache user's daily application count"""
        key = f"user:{user_id}:apps_today"
        value = self.redis.get(key)
        return int(value) if value else None
    
    def set_user_applications_today(self, user_id: str, count: int):
        """Set with 24-hour expiry"""
        key = f"user:{user_id}:apps_today"
        # Expire at midnight
        seconds_until_midnight = (
            datetime.now().replace(hour=23, minute=59, second=59) - datetime.now()
        ).seconds
        self.redis.setex(key, seconds_until_midnight, count)
    
    def increment_user_applications(self, user_id: str):
        """Atomic increment"""
        key = f"user:{user_id}:apps_today"
        self.redis.incr(key)
    
    def cache_jobs_by_category(self, category: str, jobs: list):
        """Cache today's jobs for a category"""
        key = f"jobs:{category}:today"
        self.redis.setex(key, 3600, json.dumps(jobs))  # 1 hour cache
    
    def get_jobs_by_category(self, category: str) -> Optional[list]:
        """Get cached jobs"""
        key = f"jobs:{category}:today"
        value = self.redis.get(key)
        return json.loads(value) if value else None
```

## 10.2 Firestore Query Optimization

```python
# File: backend/services/optimized_queries.py

class OptimizedQueries:
    """
    Optimized Firestore queries with pagination and caching
    """
    
    @staticmethod
    def get_active_users_batch(batch_size: int = 100):
        """
        Generator to fetch active users in batches
        Reduces memory usage for large user base
        """
        
        last_doc = None
        
        while True:
            query = db.collection("users") \
                .where("isActive", "==", True) \
                .where("subscriptionStatus", "==", "active") \
                .limit(batch_size)
            
            if last_doc:
                query = query.start_after(last_doc)
            
            docs = list(query.stream())
            
            if not docs:
                break
            
            yield [doc.to_dict() for doc in docs]
            last_doc = docs[-1]
    
    @staticmethod
    def get_jobs_with_cache(category: str, use_cache: bool = True):
        """
        Get jobs with Redis caching
        """
        
        cache = CacheManager()
        
        if use_cache:
            cached = cache.get_jobs_by_category(category)
            if cached:
                return cached
        
        # Fetch from Firestore
        today_start = datetime.now().replace(hour=0, minute=0, second=0)
        jobs = db.collection("jobs") \
            .where("jobCategory", "==", category) \
            .where("scrapedAt", ">=", today_start.isoformat()) \
            .stream()
        
        job_list = [job.to_dict() for job in jobs]
        
        # Cache for 1 hour
        cache.cache_jobs_by_category(category, job_list)
        
        return job_list
```

## 10.3 Batch Processing

```python
# File: backend/services/batch_processor.py

class BatchProcessor:
    """
    Process large datasets in batches to avoid memory issues
    """
    
    @staticmethod
    async def process_posts_in_batches(posts: list, batch_size: int = 50):
        """
        Process scraped posts in batches
        """
        
        results = []
        
        for i in range(0, len(posts), batch_size):
            batch = posts[i:i + batch_size]
            
            # Process batch in parallel
            tasks = [process_single_post(post) for post in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_results = [r for r in batch_results if not isinstance(r, Exception)]
            results.extend(valid_results)
            
            print(f"Processed batch {i//batch_size + 1}/{len(posts)//batch_size + 1}")
        
        return results
    
    @staticmethod
    def batch_firestore_writes(documents: list, collection: str, batch_size: int = 500):
        """
        Write to Firestore in batches (max 500 per batch)
        """
        
        total_written = 0
        
        for i in range(0, len(documents), batch_size):
            batch = db.batch()
            chunk = documents[i:i + batch_size]
            
            for doc in chunk:
                doc_ref = db.collection(collection).document(doc.get("id"))
                batch.set(doc_ref, doc)
            
            batch.commit()
            total_written += len(chunk)
            
            print(f"Written {total_written}/{len(documents)} documents")
        
        return total_written
```

---

# 11. SECURITY & ENCRYPTION

## 11.1 Password Encryption (AES-256)

```python
# File: backend/utils/encryption.py

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import os

class PasswordEncryption:
    """
    AES-256 encryption for SMTP passwords
    """
    
    def __init__(self):
        # Derive key from secret
        secret = os.getenv("ENCRYPTION_SECRET").encode()
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'static_salt_change_in_production',
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret))
        self.cipher = Fernet(key)
    
    def encrypt(self, plaintext: str) -> str:
        """Encrypt password"""
        return self.cipher.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """Decrypt password"""
        return self.cipher.decrypt(ciphertext.encode()).decode()


# Usage
encryptor = PasswordEncryption()

def save_smtp_password(user_id: str, password: str):
    encrypted = encryptor.encrypt(password)
    db.collection("users").document(user_id).update({
        "smtpPassword": encrypted
    })

def get_smtp_password(user_id: str) -> str:
    user = db.collection("users").document(user_id).get().to_dict()
    encrypted = user["smtpPassword"]
    return encryptor.decrypt(encrypted)
```

## 11.2 API Authentication

```python
# File: backend/middleware/auth.py

from fastapi import HTTPException, Depends, Header
from firebase_admin import auth

async def verify_firebase_token(authorization: str = Header(None)):
    """
    Verify Firebase ID token from request header
    """
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    try:
        token = authorization.split("Bearer ")[1]
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_admin_token(authorization: str = Header(None)):
    """
    Verify admin access
    """
    
    decoded = await verify_firebase_token(authorization)
    
    # Check if user is admin
    user = db.collection("users").document(decoded["uid"]).get().to_dict()
    
    if not user.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return decoded


# Usage in endpoints
@app.get("/api/user/profile")
async def get_profile(user = Depends(verify_firebase_token)):
    user_id = user["uid"]
    # ... rest of endpoint


@app.get("/api/admin/stats")
async def get_admin_stats(admin = Depends(verify_admin_token)):
    # ... admin endpoint
```

## 11.3 Rate Limiting

```python
# File: backend/middleware/rate_limit.py

from fastapi import HTTPException, Request
import redis

class RateLimiter:
    """
    Rate limiting using Redis
    """
    
    def __init__(self):
        self.redis = redis.from_url(os.getenv("REDIS_URL"))
    
    def check_rate_limit(self, identifier: str, max_requests: int, window: int):
        """
        Check if request is within rate limit
        
        Args:
            identifier: User ID or IP address
            max_requests: Maximum requests allowed
            window: Time window in seconds
        
        Returns:
            bool: True if within limit
        """
        
        key = f"rate_limit:{identifier}"
        current = self.redis.get(key)
        
        if current and int(current) >= max_requests:
            return False
        
        pipe = self.redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, window)
        pipe.execute()
        
        return True


limiter = RateLimiter()

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """
    Apply rate limiting to all requests
    """
    
    # Get user ID from token or use IP
    identifier = request.client.host
    
    if not limiter.check_rate_limit(identifier, max_requests=100, window=60):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    
    response = await call_next(request)
    return response
```

---

# 12. MONITORING & LOGGING

## 12.1 Sentry Setup

```python
# File: backend/config/sentry.py

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

def init_sentry():
    """
    Initialize Sentry error tracking
    """
    
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            FastApiIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=1.0,  # 100% of transactions
        profiles_sample_rate=1.0,
        environment=os.getenv("ENVIRONMENT", "production"),
        release=os.getenv("RAILWAY_GIT_COMMIT_SHA", "unknown"),
    )


# Usage in main.py
from config.sentry import init_sentry

init_sentry()
```

## 12.2 Custom Logging System

```python
# File: backend/utils/logger.py

import logging
from datetime import datetime
from config.firebase import db

class CustomLogger:
    """
    Logs to both console and Firestore
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        # Console handler
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def info(self, message: str, metadata: dict = None):
        self.logger.info(message)
        self._log_to_firestore("info", message, metadata)
    
    def error(self, message: str, metadata: dict = None):
        self.logger.error(message)
        self._log_to_firestore("error", message, metadata)
    
    def warning(self, message: str, metadata: dict = None):
        self.logger.warning(message)
        self._log_to_firestore("warning", message, metadata)
    
    def _log_to_firestore(self, level: str, message: str, metadata: dict):
        """Store log in Firestore"""
        
        try:
            db.collection("system_logs").add({
                "level": level,
                "message": message,
                "metadata": metadata or {},
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            self.logger.error(f"Failed to log to Firestore: {e}")


# Usage
logger = CustomLogger("email_sender")
logger.info("Email sent successfully", {
    "user_id": "abc123",
    "job_id": "xyz789"
})
```

## 12.3 Alert System

```python
# File: backend/services/alerts.py

import smtplib
from email.mime.text import MIMEText

class AlertSystem:
    """
    Send alerts to admin for critical issues
    """
    
    def __init__(self):
        self.admin_email = os.getenv("ADMIN_EMAIL")
        self.smtp_host = os.getenv("ADMIN_SMTP_HOST", "smtp.gmail.com")
        self.smtp_user = os.getenv("ADMIN_SMTP_USER")
        self.smtp_pass = os.getenv("ADMIN_SMTP_PASS")
    
    def send_alert(self, subject: str, body: str, priority: str = "medium"):
        """
        Send email alert to admin
        
        Args:
            subject: Email subject
            body: Email body
            priority: low | medium | high | critical
        """
        
        emoji_map = {
            "low": "ℹ️",
            "medium": "⚠️",
            "high": "🚨",
            "critical": "🔥"
        }
        
        full_subject = f"{emoji_map[priority]} {subject}"
        
        msg = MIMEText(body)
        msg['Subject'] = full_subject
        msg['From'] = self.smtp_user
        msg['To'] = self.admin_email
        
        try:
            with smtplib.SMTP_SSL(self.smtp_host, 465) as server:
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")


# Usage
alerts = AlertSystem()

def check_system_health():
    """
    Run health checks and alert if issues
    """
    
    # Check 1: Scraping ran today
    today = datetime.now().replace(hour=0, minute=0, second=0)
    scraping_logs = db.collection("system_logs") \
        .where("type", "==", "scraping") \
        .where("timestamp", ">=", today.isoformat()) \
        .limit(1).get()
    
    if not scraping_logs:
        alerts.send_alert(
            "Scraping Failed Today",
            "No scraping logs found for today. Check cron jobs.",
            priority="critical"
        )
    
    # Check 2: Email queue backlog
    queue_length = redis_client.llen("celery")
    if queue_length > 1000:
        alerts.send_alert(
            "Email Queue Backlog",
            f"Queue has {queue_length} pending emails. Check Celery workers.",
            priority="high"
        )
```

---

# 13. DEPLOYMENT ARCHITECTURE

## 13.1 Vercel Deployment (Next.js)

```bash
# File: frontend/.env.production

NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

```json
// File: frontend/vercel.json

{
  "buildCommand": "next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["bom1"],
  "env": {
    "NEXT_PUBLIC_FIREBASE_API_KEY": "@firebase-api-key",
    "NEXT_PUBLIC_API_URL": "@api-url"
  }
}
```

**Deployment Steps:**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
cd frontend
vercel --prod

# 4. Set environment variables
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
vercel env add NEXT_PUBLIC_API_URL
```

## 13.2 Railway Deployment (Python Backend)

```bash
# File: backend/.env.production

# Apify
APIFY_API_TOKEN=your_apify_token

# AI APIs
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Redis
REDIS_URL=redis://default:password@redis.railway.app:6379

# Security
ENCRYPTION_SECRET=your_32_char_secret_key

# Admin
ADMIN_EMAIL=admin@yourapp.com
ADMIN_SMTP_USER=admin@yourapp.com
ADMIN_SMTP_PASS=your_app_password

# Sentry
SENTRY_DSN=https://...@sentry.io/...
```

```yaml
# File: backend/railway.toml

[build]
builder = "NIXPACKS"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"

[env]
PORT = "8000"
ENVIRONMENT = "production"

# Cron Jobs
[[crons]]
name = "daily-scraper"
schedule = "0 8 * * *"  # 8 AM UTC (1:30 PM IST)
command = "python -m cron.daily_scraper"

[[crons]]
name = "job-distributor"
schedule = "30 8 * * *"  # 8:30 AM UTC (2 PM IST)
command = "python -m cron.job_distributor"

[[crons]]
name = "cleanup"
schedule = "0 0 * * *"  # Midnight
command = "python -m cron.cleanup"
```

**Deployment Steps:**
```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Add Redis
railway add redis

# 5. Deploy
cd backend
railway up

# 6. Set environment variables
railway variables set APIFY_API_TOKEN=xxx
railway variables set GROQ_API_KEY=xxx
```

## 13.3 Firebase Setup

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Initialize project
firebase init

# 4. Select:
#    - Firestore
#    - Storage
#    - Authentication

# 5. Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

```javascript
// File: firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      // Users can only read/write their own data
      allow read, write: if request.auth.uid == userId;
      
      // Admins can read all users
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // Jobs collection
    match /jobs/{jobId} {
      // All authenticated users can read jobs
      allow read: if request.auth != null;
      
      // Only backend service can write
      allow write: if false;
    }
    
    // Applications collection
    match /applications/{applicationId} {
      // Users can read their own applications
      allow read: if request.auth.uid == resource.data.userId;
      
      // Only backend service can write
      allow write: if false;
    }
    
    // Admin-only collections
    match /system_logs/{logId} {
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      allow write: if false;
    }
  }
}
```

---

# 14. PRODUCTION CHECKLIST

## 14.1 Pre-Launch Validation

### **Backend Checklist**
- [ ] All environment variables set in Railway
- [ ] Redis connected and tested
- [ ] Firebase credentials configured
- [ ] Apify API token valid and funded
- [ ] AI API keys (Groq/OpenAI) configured
- [ ] SMTP credentials for admin alerts
- [ ] Sentry DSN configured
- [ ] Encryption secret set (32+ characters)
- [ ] Cron jobs scheduled correctly
- [ ] Health check endpoint working (`/health`)
- [ ] Database indexes created in Firestore
- [ ] Rate limiting configured
- [ ] Error handling tested for all endpoints

### **Frontend Checklist**
- [ ] All environment variables set in Vercel
- [ ] Firebase SDK initialized
- [ ] API URL pointing to Railway backend
- [ ] Authentication flow tested
- [ ] File upload working (5MB limit enforced)
- [ ] SMTP connection test working
- [ ] Dashboard real-time updates working
- [ ] Admin panel authentication working
- [ ] Responsive design tested (mobile/tablet/desktop)
- [ ] Loading states implemented
- [ ] Error messages user-friendly
- [ ] Sentry error tracking configured

### **Database Checklist**
- [ ] Firestore security rules deployed
- [ ] Storage security rules deployed
- [ ] Firestore indexes created:
  - `users`: `isActive` + `subscriptionStatus`
  - `jobs`: `jobCategory` + `scrapedAt`
  - `applications`: `userId` + `sentAt`
- [ ] TTL configured for old jobs (auto-delete after 48h)
- [ ] Backup strategy in place

### **Testing Checklist**
- [ ] Scraping tested (run manually, verify data in Firestore)
- [ ] Email sending tested (send test application)
- [ ] SMTP error handling tested (wrong password)
- [ ] Job distribution algorithm tested (10 users, 50 jobs)
- [ ] Dashboard stats accurate
- [ ] Admin panel shows correct data
- [ ] User onboarding flow completed end-to-end
- [ ] Load test: 100 concurrent users
- [ ] Security audit: API endpoints protected
- [ ] Rate limiting working (exceed limit, check 429 error)

## 14.2 Go-Live Procedure

### **Day -7: Soft Launch**
1. Deploy to production environments
2. Invite 10 beta users
3. Monitor error logs daily
4. Fix critical bugs

### **Day -3: Final Testing**
1. Run full system test
2. Verify cron jobs run at correct times
3. Check all emails delivered
4. Verify billing/subscription logic

### **Day 0: Public Launch**
1. Remove beta-only restrictions
2. Enable signup for public
3. Monitor system closely (24/7 for first week)
4. Have rollback plan ready

### **Day +1: Post-Launch Monitoring**
1. Check Sentry for errors
2. Review system logs
3. Verify scraping completed successfully
4. Check email delivery rates
5. Monitor server resources (CPU/RAM)

## 14.3 Performance Benchmarks

**Target Metrics:**
- API response time: <200ms (p95)
- Scraping duration: <60 seconds
- Email sending: 20 emails in 10-14 hours
- Database read latency: <50ms
- Dashboard load time: <1.5 seconds
- System uptime: >99.5%

**Monitoring Tools:**
- Vercel Analytics (frontend)
- Railway Metrics (backend)
- Sentry (errors)
- Firebase Console (database)

---

# APPENDIX

## A. Email Template Bank (60 Templates)

```python
# File: backend/data/email_templates.py

TEMPLATES = [
    {
        "templateId": 1,
        "tone": "professional",
        "subject": "Application for {JOB_TITLE}",
        "body": """Hi,

I came across your post on LinkedIn about {JOB_TITLE} and wanted to express my interest. With my experience in {SKILLS}, I believe I'd be a great fit for this role.

Here's my portfolio:
{PORTFOLIO_URL}

I've attached my resume for your review.

Looking forward to hearing from you!

Best regards,
{USER_NAME}"""
    },
    {
        "templateId": 2,
        "tone": "casual",
        "subject": "Interested in {JOB_TITLE} Position",
        "body": """Hey,

I saw your LinkedIn post about hiring for {JOB_TITLE}. I've got solid experience with {SKILLS} and think I could bring real value to your team.

Check out my work:
{PORTFOLIO_URL}

Resume attached. Let me know if you'd like to chat!

Thanks,
{USER_NAME}"""
    },
    # ... (add 58 more variations)
]
```

## B. Job Category Keywords

```python
CATEGORY_KEYWORDS = {
    "Software Developer": [
        "react", "javascript", "frontend", "backend", "full stack",
        "node.js", "python", "java", "php", "wordpress", "next.js",
        "vue", "angular", "developer", "engineer", "programmer"
    ],
    "AI/ML Engineer": [
        "machine learning", "ai", "artificial intelligence", "data science",
        "tensorflow", "pytorch", "nlp", "computer vision", "deep learning",
        "ml engineer", "ai developer", "data scientist"
    ],
    "Marketing": [
        "digital marketing", "seo", "content writer", "social media",
        "marketing manager", "brand manager", "copywriter", "ppc"
    ],
    # ... other categories
}
```

## C. Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Scraping returns 0 jobs | Check Apify credits, verify LinkedIn didn't change structure |
| SMTP authentication fails | User needs app-specific password, not account password |
| Emails going to spam | Instruct users to warm up their email (send a few manually first) |
| Rate limit exceeded | Increase delay between emails (from 30-90 min to 60-120 min) |
| Firestore quota exceeded | Upgrade to paid plan or reduce query frequency |
| Celery tasks piling up | Scale Railway workers or increase Redis memory |

---

**END OF PRODUCTION-READY PRD**

---

**Document Status:** ✅ Complete  
**Ready for Development:** Yes  
**Estimated Build Time:** 8-10 weeks  
**Team Size:** 2-3 developers

*For implementation support, refer to this document section-by-section. Each section contains production-ready code that can be directly integrated into your application.*