"""
Sessions Router: It handles logging of work sessions completed by the user. These sessions are linked to goals and tracked for pattern analysis by the coach.
"""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import SessionState, SessionResponse
from db.supabase_client import supabase, get_current_user
from datetime import date

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("/", response_model=SessionResponse)
def log_session(session: SessionState, user_id: str = Depends(get_current_user)):
    """
    Logs a completed work session and links to a goal if provided. The duration is defined in minutes. Coach uses the session data to track actual vs committed work.
    """

    try:
        response = supabase.table("sessions").insert({
            "user_id": user_id,
            "goal_id": session.goal_id,
            "duration": session.duration,
            "notes": session.notes
        }).execute()

        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=list[SessionResponse])
def get_all_sessions(user_id: str = Depends(get_current_user)):
    """
    Retrieves all sessions for the authenticated user ordered by most recent which are used by the analytics dashboard and coach pattern detection.
    """

    try:
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).order("logged_at", desc=True).execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/today", response_model=list[SessionResponse])
def get_today_sessions(user_id: str = Depends(get_current_user)):
    """
    Retrieves all sessions logged today which are used by the coach during evening review to compare against today's goals.
    """

    try:
        today = str(date.today())
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).gte("logged_at", f"{today}T00:00:00").lte(
            "logged_at", f"{today}T23:59:59"
        ).execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/goal/{goal_id}", response_model=list[SessionResponse])
def get_sessions_by_goal(goal_id: str, user_id: str = Depends(get_current_user)):
    """
    Retrieves all sessions linked to a specific goal which is used by the coach to assess progress on a particular commitment.
    """

    try:
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).eq("goal_id", goal_id).execute()

        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))