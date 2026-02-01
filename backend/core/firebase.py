import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
from core.settings import FIREBASE_SERVICE_ACCOUNT_PATH

STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET", "jobs-apply-saas.firebasestorage.app")

if not firebase_admin._apps:
    try:
        # Priority 1: JSON string from env var (for Railway/production)
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if service_account_json:
            cred = credentials.Certificate(json.loads(service_account_json))
            firebase_admin.initialize_app(cred, {
                'storageBucket': STORAGE_BUCKET
            })
        # Priority 2: File path (for local development)
        elif FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred, {
                'storageBucket': STORAGE_BUCKET
            })
        else:
            firebase_admin.initialize_app(options={
                'storageBucket': STORAGE_BUCKET
            })
    except Exception as e:
        print(f"Warning: Firebase Admin init failed: {e}")

try:
    db = firestore.client()
except Exception as e:
    print(f"Warning: Firestore client init failed: {e}")
    db = None
