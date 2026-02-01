from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.resume_parser import parse_resume
from typing import Dict, Any

router = APIRouter()

@router.post("/parse-resume")
async def upload_resume(file: UploadFile = File(...)) -> Dict[str, Any]:
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        result = await parse_resume(file)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
