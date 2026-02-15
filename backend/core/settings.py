import os
from dotenv import load_dotenv

load_dotenv()

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./service-account.json")
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")

# Redis
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Apify
APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_ACTOR_ID = os.getenv("APIFY_ACTOR_ID", "Wpp1BZ6yGWjySadk3") # Default to LinkedIn Jobs Scraper

# AI (Groq/OpenAI)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Mistral OCR
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")

# Security
ENCRYPTION_SECRET = os.getenv("ENCRYPTION_SECRET", "default_secret_please_change_me_32chars")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_SMTP_USER = os.getenv("ADMIN_SMTP_USER")
ADMIN_SMTP_PASS = os.getenv("ADMIN_SMTP_PASS")
ADMIN_SMTP_HOST = os.getenv("ADMIN_SMTP_HOST", "smtp.gmail.com")

# Sentry
SENTRY_DSN = os.getenv("SENTRY_DSN")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
