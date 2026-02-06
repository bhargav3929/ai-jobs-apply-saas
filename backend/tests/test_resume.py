# Run this from backend/ directory:
# source venv/bin/activate
# python tests/test_resume.py

import sys
import os
import io
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from main import app
from pypdf import PdfWriter

# Mock firebase auth
import firebase_admin.auth
firebase_admin.auth.verify_id_token = MagicMock(return_value={"uid": "test_user_123"})

# Mock database
import core.firebase
mock_db = MagicMock()
mock_doc = MagicMock()
mock_doc.exists = True
mock_doc.to_dict.return_value = {"name": "Test User"}
mock_db.collection.return_value.document.return_value.get.return_value = mock_doc
core.firebase.db = mock_db

client = TestClient(app)

def create_sample_pdf():
    buffer = io.BytesIO()
    p = PdfWriter()
    page = p.add_blank_page(width=72, height=72)
    # Adding text to PDF programmatically is complex without reportlab
    # But pypdf writer mainly merges.
    # Let's create a minimal valid PDF structure.
    p.write(buffer)
    buffer.seek(0)
    return buffer

def test_resume_upload():
    print("Testing resume upload endpoint...")
    
    # Create valid PDF bytes
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 55\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Python React Developer Resume) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000282 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n386\n%%EOF\n"
    
    files = {
        "resume": ("resume.pdf", pdf_content, "application/pdf")
    }
    
    response = client.post(
        "/api/user/upload-resume",
        headers={"Authorization": "Bearer mock_token"},
        files=files
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    if response.status_code == 200:
        data = response.json()
        if data["success"] and "resumeUrl" in data:
            print("✅ Upload test passed!")
            # Check if skills were extracted (our mock PDF has text)
            if "python" in data.get("extracted_skills", []):
               print("✅ Skill extraction verified (found Python)")
        else:
            print("❌ Response format incorrect")
            sys.exit(1)
    else:
        print("❌ Request failed")
        sys.exit(1)

if __name__ == "__main__":
    test_resume_upload()
