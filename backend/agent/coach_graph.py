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
    """Retrieve the user's work sessions from the last 7 days."""
    try:
        week_ago = str(date.today() - timedelta(days=7))
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).gte("logged_at", week_ago).order("logged_at", desc=True).execute()

        if not response.data:
            return "No sessions logged in the last 7 days."

        sessions_text = "\n".join([
            f"- {s['duration']} mins on {s['logged_at'][:10]}: {s.get('notes', 'no notes')}"
            for s in response.data
        ])
        return f"Recent sessions (last 7 days):\n{sessions_text}"
    except Exception as e:
        return f"Error retrieving sessions: {str(e)}"

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

# ── Graph state ───────────────────────────────────────────────────────────────

class CoachState(TypedDict):
    messages: Annotated[Sequence, add_messages]
    user_id: str

# ── LLM setup with tool binding and LangChain fallback middleware ─────────────

tools = [get_today_goals, get_recent_sessions, get_completion_rate, get_patterns]

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