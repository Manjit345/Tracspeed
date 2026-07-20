"""
Supabase Client: It initializes and exports the Supabase client instance used across all backend modules for database operations and authentication.
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import Header,HTTPException

load_dotenv()

url : str = os.getenv("SUPABASE_URL")
key : str = os.getenv("SUPABASE_KEY")

supabase : Client = create_client(url, key)

def get_current_user(authorization: str = Header(...)):
    """
    FastAPI dependency that extracts and verifies the JWT token from the Authorization header. It returns the authenticated user's ID and is used to protect endpoints that require authentication.
    """

    try:
        token = authorization.replace("Bearer ","")
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")