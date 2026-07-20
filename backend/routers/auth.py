"""
Auth Router: It handles user registration and authentication using Supabase Auth.
"""

from fastapi import APIRouter, HTTPException
from models.schemas import SignUpRequest, SignInRequest, TokenResponse
from db.supabase_client import supabase

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=TokenResponse)
def signup(request: SignUpRequest):
    """
    Register a new user with an email and a password and it creates a Supabase auth user and a corresponding profile record.
    """

    try:
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": {"name": request.name}
            }
        })

        if not response.user:
            raise HTTPException(status_code=400, detail="User signup failed")

        return TokenResponse(
            access_token=response.session.access_token,
            user_id=response.user.id,
            name=request.name
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/signin", response_model=TokenResponse)
def signin(request: SignInRequest):
    """
    Sign in an existing user with their email and password and it returns a Supabase JWT access token for subsequent requests.
    """

    try:
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })

        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        profile = supabase.table("profiles").select("name").eq(
            "id", response.user.id
        ).single().execute()

        return TokenResponse(
            access_token=response.session.access_token,
            user_id=response.user.id,
            name=profile.data["name"]
        )

    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/signout")
def signout():
    """Sign out the current user and invalidate their session."""

    try:
        supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))