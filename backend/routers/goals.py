"""
Goals Router: It handles creation, retrieval, and status updates for daily goals and all the endpoints require authentication via JWT token in the Authorization header.
"""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import GoalCreate, GoalUpdate, GoalResponse
from db.supabase_client import supabase, get_current_user
from datetime import date

router = APIRouter(prefix="/goals", tags=["goals"])

@router.post("/", response_model=GoalResponse)
def create_goal(goal: GoalCreate, user_id: str = Depends(get_current_user)):
    """
    Create a new goal for today or a future date. The coach will reference this goal during check-ins and evening reviews.
    """
    try:
        response = supabase.table("goals").insert({
            "user_id": user_id,
            "date": str(goal.date),
            "description": goal.description,
            "target_duration": goal.target_duration,
            "status": "pending"
        }).execute()

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/today", response_model=list[GoalResponse])
def get_today_goals(user_id: str = Depends(get_current_user)):
    """
    Retrieve all goals for today which is used by the morning check-in and coach to understand today's commitments.
    """
    try:
        response = supabase.table("goals").select("*").eq(
            "user_id", user_id
        ).eq("date", str(date.today())).execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=list[GoalResponse])
def get_all_goals(user_id: str = Depends(get_current_user)):
    """
    Retrieve all goals for the authenticated user which is used by the analytics dashboard and coach pattern detection.
    """
    try:
        response = supabase.table("goals").select("*").eq(
            "user_id", user_id
        ).order("date", desc=True).execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{goal_id}", response_model=GoalResponse)
def update_goal_status(
    goal_id: str,
    update: GoalUpdate,
    user_id: str = Depends(get_current_user)
):
    """
    Update the status of a goal whether it is completed, partial, or missed. This is called during evening review when the user reports on their day.
    """
    try:
        response = supabase.table("goals").update({
            "status": update.status
        }).eq("id", goal_id).eq("user_id", user_id).execute()

        if not response.data:
            raise HTTPException(status_code=404, detail="Goal not found")

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))