"""
Profile Router: Handles retrieving and updating the authenticated user's profile which is name and avatar color. Avatar customization is intentionally limited to a curated color palette rather than free-form input, to keep every avatar legible against the app's dark theme.
"""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import ProfileUpdate, ProfileResponse
from db.supabase_client import supabase, get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/", response_model=ProfileResponse)
def get_profile(user_id: str = Depends(get_current_user)):
    """Retrieve the authenticated user's profile details."""
    try:
        response = supabase.table("profiles").select("id, name, avatar_color").eq(
            "id", user_id
        ).single().execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/", response_model=ProfileResponse)
def update_profile(update: ProfileUpdate, user_id: str = Depends(get_current_user)):
    """Update the authenticated user's name and/or avatar color."""
    try:
        update_data = {}
        if update.name is not None:
            update_data["name"] = update.name
        if update.avatar_color is not None:
            update_data["avatar_color"] = update.avatar_color

        response = supabase.table("profiles").update(update_data).eq(
            "id", user_id
        ).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))