"""
Coach Graph: LangGraph reasoning loop for Rex, Tracspeed's AI accountability coach. Rex uses tool binding to retrieve user data before responding, ensuring every response is grounded in the user's actual history rather than assumptions.
Primary model: Groq (Llama 3.3 70B) with a natural conversational tone.
Fallback model: Mistral (mistral-small-latest) via LangChain middleware.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from typing import TypedDict, Annotated, Sequence
from db.supabase_client import supabase
from agent.prompts import SYSTEM_PROMPT
from datetime import date, timedelta

load_dotenv()

# ── Tools Rex can call to retrieve user data ──────────────────────────────────

@tool
def get_today_goals(user_id: str) -> str:
    """Retrieve the user's goals for today."""
    try:
        response = supabase.table("goals").select("*").eq(
            "user_id", user_id
        ).eq("date", str(date.today())).execute()

        if not response.data:
            return "No goals set for today."

        goals_text = "\n".join([
            f"- {g['description']} ({g['status']}, target: {g.get('target_duration', 'no duration set')} mins)"
            for g in response.data
        ])
        return f"Today's goals:\n{goals_text}"
    except Exception as e:
        return f"Error retrieving goals: {str(e)}"

@tool
def get_recent_sessions(user_id: str) -> str:
    """Retrieve the user's work sessions from the last 7 days, with the exact
    day-span explicitly stated so timeframes are never exaggerated."""
    try:
        week_ago = str(date.today() - timedelta(days=7))
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).gte("logged_at", week_ago).order("logged_at", desc=True).execute()

        if not response.data:
            return "No sessions logged in the last 7 days."

        # Calculate the actual span of days covered by this data
        dates = [s['logged_at'][:10] for s in response.data]
        earliest = min(dates)
        latest = max(dates)
        days_span = (date.fromisoformat(latest) - date.fromisoformat(earliest)).days + 1

        sessions_text = "\n".join([
            f"- {s['duration']} mins on {s['logged_at'][:10]}: {s.get('notes', 'no notes')}"
            for s in response.data
        ])
        return (f"IMPORTANT: This data covers exactly {days_span} day(s), from {earliest} "
                f"to {latest}. State this exact timeframe. Do not describe this as 'a week' "
                f"or 'recently over time' unless days_span is actually 7 or more.\n\n"
                f"Sessions:\n{sessions_text}")
    except Exception as e:
        return f"Error retrieving sessions: {str(e)}"

@tool
def get_long_term_summary(user_id: str) -> str:
    """Retrieve a summary of the user's activity over the last 90 days,
    including total sessions, active days, and how long they've been using
    Tracspeed. Use this when discussing long-term consistency or streaks,
    rather than get_recent_sessions which only covers 7 days."""
    try:
        ninety_days_ago = str(date.today() - timedelta(days=90))
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).gte("logged_at", ninety_days_ago).execute()

        if not response.data:
            return "No session history found."

        dates = sorted(set(s['logged_at'][:10] for s in response.data))
        total_sessions = len(response.data)
        active_days = len(dates)
        first_day = dates[0]
        last_day = dates[-1]
        total_days_since_start = (date.today() - date.fromisoformat(first_day)).days + 1

        return (f"Long-term summary: {total_sessions} total session(s) across {active_days} "
                f"active day(s), starting from {first_day} ({total_days_since_start} day(s) ago). "
                f"State this exact scope explicitly — do not imply a longer history than "
                f"{total_days_since_start} day(s).")
    except Exception as e:
        return f"Error retrieving long-term summary: {str(e)}"

@tool
def get_completion_rate(user_id: str) -> str:
    """Calculate the user's goal completion rate over the last 30 days."""
    try:
        month_ago = str(date.today() - timedelta(days=30))
        response = supabase.table("goals").select("status").eq(
            "user_id", user_id
        ).gte("date", month_ago).execute()

        if not response.data:
            return "No goals found in the last 30 days."

        total = len(response.data)
        completed = len([g for g in response.data if g["status"] == "completed"])
        partial = len([g for g in response.data if g["status"] == "partial"])
        missed = len([g for g in response.data if g["status"] == "missed"])
        rate = round((completed / total) * 100, 1) if total > 0 else 0

        return f"30-day completion rate: {rate}% ({completed} completed, {partial} partial, {missed} missed out of {total} total goals)"
    except Exception as e:
        return f"Error calculating completion rate: {str(e)}"

@tool
def get_patterns(user_id: str) -> str:
    """Retrieve any detected avoidance patterns for the user."""
    try:
        response = supabase.table("patterns").select("*").eq(
            "user_id", user_id
        ).order("detected_at", desc=True).execute()

        if not response.data:
            return "No patterns detected yet."

        patterns_text = "\n".join([
            f"- {p['pattern_type']} (detected: {p['detected_at'][:10]}, raised: {'yes' if p['raised_at'] else 'not yet'})"
            for p in response.data
        ])
        return f"Detected patterns:\n{patterns_text}"
    except Exception as e:
        return f"Error retrieving patterns: {str(e)}"

@tool
def get_unresolved_goals(user_id: str) -> str:
    """Retrieve all goals that are still pending, partial, or missed, listed individually by description and original date, regardless of when they were created. Use this whenever the user asks to see, list, or work on their missed/pending/incomplete goals specifically."""
    try:
        response = supabase.table("goals").select("*").eq(
            "user_id", user_id
        ).in_("status", ["pending", "partial", "missed"]).order("date", desc=True).execute()

        if not response.data:
            return "No unresolved goals. Everything is either completed or nothing has been set."

        goals_text = "\n".join([
            f"- [{g['status'].upper()}] {g['description']} (originally set for {g['date']}, target: {g.get('target_duration', 'no duration set')} mins)"
            for g in response.data
        ])
        return f"Unresolved goals (list these individually if asked, don't just summarize):\n{goals_text}"
    except Exception as e:
        return f"Error retrieving unresolved goals: {str(e)}"

# ── Graph state ───────────────────────────────────────────────────────────────

class CoachState(TypedDict):
    messages: Annotated[Sequence, add_messages]
    user_id: str

# ── LLM setup with tool binding and LangChain fallback middleware ─────────────

tools = [get_today_goals, get_recent_sessions, get_long_term_summary, get_completion_rate, get_patterns, get_unresolved_goals]

def get_llm_with_tools():
    """
    Returns a LangChain LLM chain with tool binding and automatic fallback.
    Groq (Llama 3.3 70B) is the primary model for natural conversational tone.
    Mistral (mistral-small-latest) is the fallback via LangChain .with_fallbacks() middleware. If Groq fails for any reason, LangChain automatically retries with Mistral without any manual intervention.
    """
    primary = ChatGroq(
        model="llama-3.3-70b-versatile",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7
    )

    fallback = ChatMistralAI(
        model="mistral-small-latest",
        api_key=os.getenv("MISTRAL_API_KEY"),
        temperature=0.7
    )

    # LangChain middleware — automatically switches to fallback on primary failure
    llm_with_fallback = primary.with_fallbacks([fallback])
    return llm_with_fallback.bind_tools(tools)

# ── Graph nodes ───────────────────────────────────────────────────────────────

def coach_node(state: CoachState):
    """
    Rex's reasoning node which receives the conversation history, calls tools if needed, and generates a response.
    """
    llm_with_tools = get_llm_with_tools()

    # Inject system prompt and user_id context so Rex knows who he's talking to
    system = SystemMessage(content=f"{SYSTEM_PROMPT}\n\nCurrent user_id: {state['user_id']}")
    messages = [system] + list(state["messages"])

    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

def should_continue(state: CoachState):
    """
    Conditional edge where, if the last message has tool calls, route to tool execution. Otherwise end the conversation turn and return Rex's response.
    """
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    return END

# ── Build graph ───────────────────────────────────────────────────────────────

tool_node = ToolNode(tools)

def build_coach_graph():
    """Build and compile the Rex coach reasoning graph."""
    graph = StateGraph(CoachState)

    graph.add_node("coach", coach_node)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("coach")

    graph.add_conditional_edges("coach", should_continue, {
        "tools": "tools",
        END: END
    })

    # After tools execute, return to coach for final response
    graph.add_edge("tools", "coach")

    return graph.compile()

coach_graph = build_coach_graph()

# ── Main conversation function ────────────────────────────────────────────────

def chat_with_rex(user_id: str, message: str, history: list) -> str:
    """
    Send a message to Rex and get a response. The history parameter is a list of previous messages in LangChain format.

    Args:
        user_id: The authenticated user's ID
        message: The user's current message
        history: Previous conversation messages

    Returns:
        str: Rex's response
    """
    messages = history + [HumanMessage(content=message)]

    result = coach_graph.invoke({
        "messages": messages,
        "user_id": user_id
    })

    # Extract the last AI message that isn't a tool call
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and not getattr(msg, "tool_calls", None):
            return msg.content

    return "I'm having trouble responding right now. Please try again."

async def stream_chat_with_rex(user_id: str, message: str, history: list):
    """
    Stream Rex's response token by token as it's generated.
    Yields text chunks for real-time display in the frontend.

    Args:
        user_id: The authenticated user's ID
        message: The user's current message
        history: Previous conversation messages

    Yields:
        str: Individual text chunks as Rex generates the response
    """
    messages = history + [HumanMessage(content=message)]

    async for msg, metadata in coach_graph.astream(
        {"messages": messages, "user_id": user_id},
        stream_mode="messages"
    ):
        # Only stream content from the coach node, not tool nodes
        if metadata.get("langgraph_node") == "coach" and msg.content:
            yield msg.content

# ── Unit test ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_user_id = "ee59e314-05d5-4e37-b01e-4d7ca910b561"

    print("Testing Rex coach graph...")
    response = chat_with_rex(
        user_id=test_user_id,
        message="Hey Rex, what did I commit to today?",
        history=[]
    )
    print(f"\nRex: {response}")