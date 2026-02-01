from fastapi import HTTPException, Depends, Header
from firebase_admin import auth
from core.firebase import db

async def verify_firebase_token(authorization: str = Header(None)):
    """
    Verify Firebase ID token from request header
    """
    
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    
    try:
        token = authorization.split("Bearer ")[1]
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")


async def verify_admin_token(authorization: str = Header(None)):
    """
    Verify admin access
    """
    
    decoded = await verify_firebase_token(authorization)
    
    if not db:
        raise HTTPException(status_code=500, detail="DB Connection missing")

    # Check if user is admin
    user_doc = db.collection("users").document(decoded["uid"]).get()
    
    if not user_doc.exists:
         raise HTTPException(status_code=403, detail="User not found")
         
    user = user_doc.to_dict()
    
    if not user.get("isAdmin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return decoded
