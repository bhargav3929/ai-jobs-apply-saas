import os
from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.sentry import init_sentry
from api import users, jobs, admin
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", "http://localhost:3001",
        "http://127.0.0.1:3000", "http://127.0.0.1:3001",
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
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

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": ENVIRONMENT}

@app.get("/")
async def root():
    return {"message": "Service is running"}
