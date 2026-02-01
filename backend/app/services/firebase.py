import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin SDK
# In production, we'd use a service account JSON file
# For local dev, we can use default credentials if logged in via gcloud, 
# or use a mock approach if we just want to test the API structure first.
# For this MVP step, we'll try to initialize but fallback gracefully.

try:
    if not firebase_admin._apps:
        # Check for service account path in env
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        if service_account_path and os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
        else:
            # Use default credentials (works on GCP or if gcloud auth application-default login is run)
            firebase_admin.initialize_app()
    
    db = firestore.client()
except Exception as e:
    print(f"Warning: Firebase Admin init failed: {e}")
    db = None

def get_firestore_client():
    return db
