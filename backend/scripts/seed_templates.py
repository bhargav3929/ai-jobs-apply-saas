"""
Seed email templates into Firestore.
Run: python -m scripts.seed_templates
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.firebase import db
from data.email_templates import TEMPLATES

def seed():
    if not db:
        print("❌ Firestore not connected")
        return

    for t in TEMPLATES:
        tid = str(t["templateId"])
        db.collection("email_templates").document(tid).set(t)
        print(f"✅ Seeded template {tid} ({t['tone']})")

    print(f"\n✨ Done: {len(TEMPLATES)} templates seeded")

if __name__ == "__main__":
    seed()
