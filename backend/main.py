import os
from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.sentry import init_sentry
from api import users, jobs, admin, resume
from core.settings import ENVIRONMENT

# Initialize Sentry
init_sentry()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 Server starting in {ENVIRONMENT} mode")
    yield
    # Shutdown
    print("🛑 Server shutting down")

app = FastAPI(title="LinkedIn Auto-Apply Backend", lifespan=lifespan)

from middleware.rate_limit import rate_limit_middleware
app.middleware("http")(rate_limit_middleware)

from fastapi.middleware.cors import CORSMiddleware

_allowed_origins = [
    "http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:4000",
    "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002", "http://127.0.0.1:4000",
]
# Add FRONTEND_URL from env (e.g. Vercel production URL)
_frontend_url = os.getenv("FRONTEND_URL", "")
if _frontend_url:
    _allowed_origins.append(_frontend_url.rstrip("/"))
# Also allow any Vercel preview/production URLs for this project
_vercel_url = os.getenv("VERCEL_URL", "")
if _vercel_url:
    _allowed_origins.append(f"https://{_vercel_url}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(users.router)
app.include_router(jobs.router)
app.include_router(admin.router)
from api import dashboard
app.include_router(dashboard.router)
app.include_router(resume.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": ENVIRONMENT}

@app.get("/")
async def root():
    return {"message": "Service is running"}
