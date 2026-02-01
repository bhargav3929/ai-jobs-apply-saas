"""
Comprehensive keyword mappings for job classification.
Each category has:
  - strong_keywords: High-confidence matches (if found, almost certainly this category)
  - weak_keywords: Supportive signals (need multiple or combined with context)
  - negative_keywords: If these appear alongside, it's likely NOT this category
"""

CATEGORY_KEYWORDS = {
    "Software Developer": {
        "strong_keywords": [
            # Exact role titles
            "software developer", "software engineer", "web developer",
            "frontend developer", "front-end developer", "front end developer",
            "backend developer", "back-end developer", "back end developer",
            "full stack developer", "fullstack developer", "full-stack developer",
            "mobile developer", "app developer", "ios developer", "android developer",
            "wordpress developer", "php developer", "laravel developer",
            "react developer", "vue developer", "angular developer",
            "node.js developer", "nodejs developer", "node developer",
            "java developer", "python developer", ".net developer",
            "ruby developer", "golang developer", "go developer",
            "rust developer", "c++ developer", "c# developer",
            "kotlin developer", "swift developer", "flutter developer",
            "react native developer", "mern stack", "mean stack",
            "devops engineer", "cloud engineer", "sre engineer",
            "site reliability engineer", "system administrator", "sysadmin",
            "qa engineer", "test engineer", "automation tester",
            "software tester", "quality assurance", "manual tester",
            "embedded engineer", "firmware engineer",
            # Framework-specific
            "django developer", "flask developer", "spring boot developer",
            "next.js developer", "nuxt developer", "svelte developer",
            "express.js developer", "fastapi developer",
            # Generic but strong
            "programmer", "coder", "sde", "swe",
        ],
        "weak_keywords": [
            "react", "vue", "angular", "next.js", "node.js", "express",
            "django", "flask", "spring boot", "laravel", "rails",
            "javascript", "typescript", "python", "java", "php",
            "c++", "c#", "golang", "rust", "ruby", "kotlin", "swift",
            "html", "css", "tailwind", "bootstrap",
            "mongodb", "postgresql", "mysql", "redis", "elasticsearch",
            "docker", "kubernetes", "aws", "azure", "gcp",
            "git", "github", "gitlab", "ci/cd", "jenkins",
            "rest api", "graphql", "microservices",
            "agile", "scrum", "jira",
            "coding", "programming", "development", "software",
            "frontend", "backend", "full stack", "fullstack",
        ],
        "negative_keywords": [
            "machine learning", "deep learning", "neural network",
            "data scientist", "ml engineer", "ai researcher",
            "marketing", "seo", "content writer",
        ],
    },
    "AI/ML Engineer": {
        "strong_keywords": [
            "ai engineer", "ml engineer", "ai/ml engineer",
            "machine learning engineer", "deep learning engineer",
            "data scientist", "data science", "nlp engineer",
            "computer vision engineer", "cv engineer",
            "mlops engineer", "ml ops",
            "ai developer", "ai researcher", "ai specialist",
            "prompt engineer", "llm engineer",
            "generative ai", "gen ai",
            "ai automation", "ai architect",
        ],
        "weak_keywords": [
            "machine learning", "deep learning", "neural network",
            "tensorflow", "pytorch", "scikit-learn", "keras",
            "hugging face", "langchain", "llamaindex", "openai",
            "llm", "gpt", "large language model", "transformer",
            "nlp", "natural language processing",
            "computer vision", "image recognition",
            "reinforcement learning", "supervised learning",
            "model training", "model fine-tuning", "fine tuning",
            "rag", "retrieval augmented", "vector database",
            "embeddings", "semantic search",
            "artificial intelligence", "ai",
        ],
        "negative_keywords": [],
    },
    "Marketing": {
        "strong_keywords": [
            "digital marketer", "digital marketing manager",
            "marketing manager", "marketing specialist",
            "performance marketer", "performance marketing",
            "growth marketer", "growth marketing manager",
            "seo specialist", "seo manager", "seo executive",
            "sem specialist", "ppc specialist", "ppc manager",
            "content writer", "content strategist", "content manager",
            "copywriter", "copy writer",
            "social media manager", "social media specialist",
            "social media executive", "community manager",
            "email marketing", "email marketing specialist",
            "brand manager", "brand strategist",
            "marketing executive", "marketing analyst",
            "digital marketing executive",
        ],
        "weak_keywords": [
            "marketing", "seo", "sem", "ppc",
            "google ads", "meta ads", "facebook ads",
            "content marketing", "inbound marketing",
            "social media", "instagram", "linkedin marketing",
            "hubspot", "mailchimp", "hootsuite",
            "analytics", "google analytics",
            "campaign", "lead generation",
            "copywriting", "blog", "content creation",
        ],
        "negative_keywords": [
            "developer", "engineer", "coding", "programming",
        ],
    },
    "Customer Support": {
        "strong_keywords": [
            "customer support", "customer support executive",
            "customer service", "customer service representative",
            "customer success", "customer success manager",
            "helpdesk", "help desk", "support agent",
            "technical support", "tech support",
            "support executive", "support specialist",
            "client support", "client success",
            "customer experience", "cx manager",
        ],
        "weak_keywords": [
            "support", "helpdesk", "ticketing",
            "zendesk", "freshdesk", "intercom",
            "customer", "client relations",
        ],
        "negative_keywords": [
            "developer", "engineer", "marketing", "sales",
        ],
    },
    "Sales": {
        "strong_keywords": [
            "sales executive", "sales manager", "sales representative",
            "business development executive", "business development manager",
            "bde", "bdm", "bdr", "sdr",
            "account executive", "account manager",
            "inside sales", "outside sales",
            "sales associate", "sales officer",
            "sales development representative",
            "revenue manager", "revenue officer",
        ],
        "weak_keywords": [
            "sales", "business development", "revenue",
            "quota", "pipeline", "crm", "salesforce",
            "cold calling", "lead generation", "prospecting",
            "b2b sales", "b2c sales", "enterprise sales",
            "closing deals",
        ],
        "negative_keywords": [
            "developer", "engineer", "marketing",
        ],
    },
    "Design": {
        "strong_keywords": [
            "ui/ux designer", "ui ux designer", "ux designer", "ui designer",
            "product designer", "graphic designer",
            "visual designer", "interaction designer",
            "motion designer", "motion graphics",
            "web designer", "creative designer",
            "brand designer", "design lead",
        ],
        "weak_keywords": [
            "figma", "sketch", "adobe xd", "invision",
            "photoshop", "illustrator", "after effects",
            "design system", "wireframe", "prototype",
            "user experience", "user interface",
            "typography", "branding", "visual identity",
        ],
        "negative_keywords": [
            "developer", "engineer", "marketing",
        ],
    },
    "Data Analyst": {
        "strong_keywords": [
            "data analyst", "data analytics",
            "business analyst", "business intelligence analyst",
            "bi analyst", "bi developer",
            "sql analyst", "reporting analyst",
            "analytics engineer", "analytics manager",
        ],
        "weak_keywords": [
            "sql", "tableau", "power bi", "looker",
            "excel", "data visualization", "dashboard",
            "reporting", "etl", "data warehouse",
            "bigquery", "redshift", "snowflake",
        ],
        "negative_keywords": [
            "data scientist", "machine learning", "deep learning",
            "developer", "software engineer",
        ],
    },
}
