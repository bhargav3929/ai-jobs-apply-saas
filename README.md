# JobAgent.ai

> Automated LinkedIn job application platform - Search Aggregation Engine

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS 4.0, Shadcn UI
- **Backend:** Python 3.12, FastAPI
- **Database:** Firebase (Firestore, Auth, Storage)
- **Deploy:** Vercel (Frontend) + Railway (Backend)

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Production & Auth Setup

### Firebase Configuration
To enable real authentication (instead of Mock Mode):
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a project and enable **Authentication**, **Firestore**, and **Storage**.
3. Create `frontend/.env.local` with your keys:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```

## Project Structure

```
jobagent/
├── frontend/          # Next.js 15 App
├── backend/           # FastAPI Service
└── PRD.md             # Product Requirements
```