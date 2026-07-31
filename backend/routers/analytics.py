"""
Analytics Router: Provides aggregated statistics for the dashboard which includes completion rates, session trends, streak data, goal status breakdown, and recent pattern detections. All computation happens here rather than on the frontend, keeping the client simple and the data consistent.
"""

from fastapi import APIRouter, HTTPException, Depends
from db.supabase_client import supabase, get_current_user
from datetime import date, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/overview")
def get_overview(user_id: str = Depends(get_current_user)):
    """
    Returns hero-level stats: completion rate, current streak, total sessions, and total minutes worked, all computed over the last 30 days.
    """
    try:
        thirty_days_ago = str(date.today() - timedelta(days=30))

        # Goals for completion rate
        goals_response = supabase.table("goals").select("status", "date").eq(
            "user_id", user_id
        ).gte("date", thirty_days_ago).execute()

        goals = goals_response.data
        total_goals = len(goals)
        completed = len([g for g in goals if g["status"] == "completed"])
        completion_rate = round((completed / total_goals) * 100, 1) if total_goals > 0 else 0

        # Sessions for total time and count
        sessions_response = supabase.table("sessions").select("duration", "logged_at").eq(
            "user_id", user_id
        ).gte("logged_at", thirty_days_ago).execute()

        sessions = sessions_response.data
        total_sessions = len(sessions)
        total_minutes = sum(s["duration"] for s in sessions)

        # Streak calculation — consecutive days with at least one completed goal
        streak = _calculate_streak(user_id)

        return {
            "completion_rate": completion_rate,
            "current_streak": streak,
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "total_goals": total_goals,
            "completed_goals": completed
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def _calculate_streak(user_id: str) -> int:
    """
    Calculate the user's current streak which is the count of consecutive days going backward from today where at least one goal was marked completed.
    """
    goals_response = supabase.table("goals").select("status", "date").eq(
        "user_id", user_id
    ).eq("status", "completed").order("date", desc=True).execute()

    if not goals_response.data:
        return 0

    completed_dates = sorted(set(g["date"] for g in goals_response.data), reverse=True)

    streak = 0
    current_date = date.today()

    for i in range(len(completed_dates)):
        expected_date = str(current_date - timedelta(days=i))
        if expected_date in completed_dates:
            streak += 1
        else:
            break

    return streak

@router.get("/completion-trend")
def get_completion_trend(user_id: str = Depends(get_current_user)):
    """
    Returns daily completion rate for the last 30 days, formatted for a line/area chart showing that day's rate.
    """
    try:
        thirty_days_ago = str(date.today() - timedelta(days=30))
        response = supabase.table("goals").select("status", "date").eq(
            "user_id", user_id
        ).gte("date", thirty_days_ago).order("date").execute()

        # Group goals by date
        by_date = {}
        for g in response.data:
            d = g["date"]
            if d not in by_date:
                by_date[d] = {"total": 0, "completed": 0}
            by_date[d]["total"] += 1
            if g["status"] == "completed":
                by_date[d]["completed"] += 1

        trend = [
            {
                "date": d,
                "completion_rate": round((v["completed"] / v["total"]) * 100, 1)
            }
            for d, v in sorted(by_date.items())
        ]

        return {"trend": trend}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/session-activity")
def get_session_activity(user_id: str = Depends(get_current_user)):
    """
    Returns total minutes worked per day for the last 14 days, formatted for a bar chart showing daily activity levels.
    """
    try:
        two_weeks_ago = str(date.today() - timedelta(days=14))
        response = supabase.table("sessions").select("duration", "logged_at").eq(
            "user_id", user_id
        ).gte("logged_at", two_weeks_ago).execute()

        by_date = {}
        for s in response.data:
            d = s["logged_at"][:10]
            by_date[d] = by_date.get(d, 0) + s["duration"]

        activity = [
            {"date": d, "minutes": minutes}
            for d, minutes in sorted(by_date.items())
        ]

        return {"activity": activity}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/goal-breakdown")
def get_goal_breakdown(user_id: str = Depends(get_current_user)):
    """
    Returns the count of goals by status (completed, partial, missed, pending) over the last 30 days, formatted for a pie/donut chart.
    """
    try:
        thirty_days_ago = str(date.today() - timedelta(days=30))
        response = supabase.table("goals").select("status").eq(
            "user_id", user_id
        ).gte("date", thirty_days_ago).execute()

        breakdown = {"completed": 0, "partial": 0, "missed": 0, "pending": 0}
        for g in response.data:
            status = g["status"]
            if status in breakdown:
                breakdown[status] += 1

        return {"breakdown": breakdown}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/recent-activity")
def get_recent_activity(user_id: str = Depends(get_current_user)):
    """
    Returns the 10 most recent sessions with details, for a scrollable activity feed on the dashboard.
    """
    try:
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).order("logged_at", desc=True).limit(10).execute()

        return {"sessions": response.data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))