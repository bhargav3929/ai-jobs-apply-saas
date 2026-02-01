from fastapi import APIRouter, HTTPException, Body
from app.services.email_service import EmailService
from pydantic import BaseModel, EmailStr

router = APIRouter()

class SMTPConfig(BaseModel):
    email: EmailStr
    password: str
    server: str = "smtp.gmail.com"
    port: int = 465

@router.post("/verify-smtp")
async def verify_smtp(config: SMTPConfig):
    """
    Verifies the provided SMTP credentials.
    """
    result = EmailService.verify_connection(
        email=config.email,
        password=config.password,
        server=config.server,
        port=config.port
    )
    
    if not result["success"]:
        # We return a 400 Bad Request for failed verification so the frontend knows it failed
        raise HTTPException(status_code=400, detail=result["message"])
        
    return {"status": "success", "message": "SMTP connection verified"}
