"""
Pattern Detector: Analyzes a user's goal, session, and pause history to detect avoidance patterns such as consistent goal-skipping, retroactive off-day marking, or a sustained drop in goal difficulty. It writes those detected patterns to the patterns table, which Rex references during conversations.
"""

from db.supabase_client import supabase
from datetime import date, timedelta

MIN_OCCURRENCES_TO_FLAG = 3  # raise pattern after 3+ occurrences

def detect_missed_goal_pattern(user_id: str) -> bool:
    """
    Detect if the user has missed goals on 3 or more occasions in the last 14 days.
    Returns True if a new pattern was detected and recorded.
    """

    two_weeks_ago = str(date.today() - timedelta(days=14))
    response = supabase.table("goals").select("status", "date").eq(
        "user_id", user_id
    ).gte("date", two_weeks_ago).execute()

    if not response.data:
        return False

    missed_count = len([g for g in response.data if g["status"] == "missed"])

    if missed_count >= MIN_OCCURRENCES_TO_FLAG:
        return _record_pattern_if_new(user_id, "recurring_missed_goals")

    return False

def detect_easy_goal_pattern(user_id: str) -> bool:
    """
    Detect if the user has consistently set very short-duration goals (under 20 mins) while completing them easily, suggesting they may not be challenging themselves.
    """
    two_weeks_ago = str(date.today() - timedelta(days=14))
    response = supabase.table("goals").select("status", "target_duration").eq(
        "user_id", user_id
    ).gte("date", two_weeks_ago).execute()

    if not response.data or len(response.data) < MIN_OCCURRENCES_TO_FLAG:
        return False

    easy_completed = [
        g for g in response.data
        if g["status"] == "completed" and g.get("target_duration") and g["target_duration"] <= 20
    ]

    if len(easy_completed) >= MIN_OCCURRENCES_TO_FLAG and len(easy_completed) == len(response.data):
        return _record_pattern_if_new(user_id, "consistently_easy_goals")

    return False

def detect_retroactive_pause_pattern(user_id: str) -> bool:
    """
    Detect if the user has marked 3 or more pauses that were logged on or after the pause start_date itself, suggesting retroactive excuse-making rather than genuine planned rest.
    """
    two_weeks_ago = str(date.today() - timedelta(days=14))
    response = supabase.table("pauses").select("start_date", "created_at").gte(
        "start_date", two_weeks_ago
    ).eq("user_id", user_id).execute()

    if not response.data:
        return False

    retroactive_count = 0
    for pause in response.data:
        start = date.fromisoformat(pause["start_date"])
        created = date.fromisoformat(pause["created_at"][:10])
        if created >= start:
            retroactive_count += 1

    if retroactive_count >= MIN_OCCURRENCES_TO_FLAG:
        return _record_pattern_if_new(user_id, "retroactive_pause_pattern")

    return False

def _record_pattern_if_new(user_id: str, pattern_type: str) -> bool:
    """
    Records a pattern in the database only if it hasn't already been detected and raised recently, to avoid duplicate or repeated flagging of the same issue.
    """
    existing = supabase.table("patterns").select("*").eq(
        "user_id", user_id
    ).eq("pattern_type", pattern_type).order("detected_at", desc=True).limit(1).execute()

    # If this pattern was already detected in the last 14 days, don't re-flag it
    if existing.data:
        last_detected = date.fromisoformat(existing.data[0]["detected_at"][:10])
        if (date.today() - last_detected).days < 14:
            return False

    supabase.table("patterns").insert({
        "user_id": user_id,
        "pattern_type": pattern_type
    }).execute()

    return True

def run_pattern_detection(user_id: str) -> list:
    """
    Run all pattern detectors for a user. Intended to be called once daily, e.g. after evening check-in, rather than on every message.

    Returns:
        list: Names of newly detected patterns (empty if none found).
    """
    detected = []

    if detect_missed_goal_pattern(user_id):
        detected.append("recurring_missed_goals")

    if detect_easy_goal_pattern(user_id):
        detected.append("consistently_easy_goals")

    if detect_retroactive_pause_pattern(user_id):
        detected.append("retroactive_pause_pattern")

    return detected

#Code for unit testing the pattern detector
if __name__ == "__main__":
    test_user_id = "ee59e314-05d5-4e37-b01e-4d7ca910b561"
    patterns = run_pattern_detection(test_user_id)
    print(f"Newly detected patterns: {patterns}")