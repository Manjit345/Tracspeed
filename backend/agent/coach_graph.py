"""
Coach Graph: LangGraph reasoning loop for Rex, Tracspeed's AI accountability coach. Rex uses tool binding to retrieve user data before responding, ensuring every response is grounded in the user's actual history rather than assumptions.
Primary model: Groq (GPT-OSS 120B) with a natural conversational tone.
Fallback model: Mistral (mistral-small-latest) via LangChain middleware.
"""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_mistralai import ChatMistralAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.graph.message import add_messages
from typing import TypedDict, Annotated, Sequence
from db.supabase_client import supabase
from agent.prompts import SYSTEM_PROMPT
from tavily import TavilyClient
from datetime import date, timedelta
import re

load_dotenv()

tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

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
    """Retrieve the user's work sessions from the last 7 days, with the exact day-span explicitly stated so timeframes are never exaggerated."""
    try:
        week_ago = str(date.today() - timedelta(days=7))
        response = supabase.table("sessions").select("*").eq(
            "user_id", user_id
        ).gte("logged_at", week_ago).order("logged_at", desc=True).execute()

        if not response.data:
            return "No sessions logged in the last 7 days."

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
    """Retrieve a summary of the user's activity over the last 90 days, including total sessions, active days, and how long they've been using Tracspeed. Use this when discussing long-term consistency or streaks, rather than get_recent_sessions which only covers 7 days."""
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

@tool
def suggest_approach(topic: str) -> str:
    """Search for genuinely useful, current suggestions on how to approach a specific topic, skill, or piece of work like study techniques for a hard concept, or how to structure practice for a skill. Use this ONLY when the user is asking for substantive advice on how to tackle something specific, not for tracking goals, sessions, or any personal accountability data. Never use this to look up information about the user themselves and only for general topic/approach research."""
    try:
        results = tavily_client.search(
            query=f"best approach to learn or practice {topic}",
            max_results=3,
            search_depth="basic"
        )

        if not results.get("results"):
            return f"No specific suggestions found for {topic}. Offer general encouragement based on what you know."

        summaries = "\n".join([
            f"- {r['title']}: {r['content'][:200]}"
            for r in results["results"]
        ])
        return f"Found approaches for '{topic}':\n{summaries}\n\nSynthesize these into 1-2 concrete, actionable suggestions. Don't just list sources."
    except Exception as e:
        return f"Search unavailable right now. Give your best general suggestion based on your own knowledge instead: {str(e)}"

@tool
def update_goal(user_id: str, goal_description_hint: str, new_duration: int = None, new_status: str = None) -> str:
    """Update an existing goal's target duration and/or status. Use this whenever the user asks to change, adjust, increase, decrease, or update a goal's time target, or mark it as completed/partial/missed through conversation. goal_description_hint should be a short phrase matching part of the goal's description (e.g. "transformer architecture") so the correct goal can be found. Only call this after confirming with the user exactly what should change and never guess the new value."""
    try:
        # Find the goal by matching the hint against unresolved/today's goals
        response = supabase.table("goals").select("*").eq(
            "user_id", user_id
        ).in_("status", ["pending", "partial"]).execute()

        matches = [
            g for g in response.data
            if goal_description_hint.lower() in g["description"].lower()
        ]

        if not matches:
            return f"No matching goal found for '{goal_description_hint}'. Ask the user to clarify which goal they mean."

        if len(matches) > 1:
            names = ", ".join([g["description"] for g in matches])
            return f"Multiple goals match '{goal_description_hint}': {names}. Ask the user to specify which one."

        goal = matches[0]
        update_data = {}
        if new_duration is not None:
            update_data["target_duration"] = new_duration
        if new_status is not None:
            update_data["status"] = new_status

        if not update_data:
            return "No changes specified. Ask the user what they want to update."

        supabase.table("goals").update(update_data).eq("id", goal["id"]).execute()

        changes = []
        if new_duration is not None:
            changes.append(f"duration set to {new_duration} minutes")
        if new_status is not None:
            changes.append(f"status set to {new_status}")

        return f"Successfully updated '{goal['description']}': {', '.join(changes)}. This is now saved."
    except Exception as e:
        return f"Failed to update goal: {str(e)}. Tell the user the update didn't go through and they should try again or use the Check In page."

# ── Graph state ───────────────────────────────────────────────────────────────

class CoachState(TypedDict):
    messages: Annotated[Sequence, add_messages]
    user_id: str

# ── LLM setup with tool binding and LangChain fallback middleware ─────────────

tools = [get_today_goals, get_recent_sessions, get_long_term_summary, get_completion_rate, get_patterns, get_unresolved_goals, suggest_approach, update_goal]

def get_llm_with_tools():
    """
    Returns a LangChain LLM chain with tool binding and automatic fallback.
    GPT-OSS 120B (via Groq) is the primary model for natural conversational tone.
    Mistral (mistral-small-latest) is the fallback via LangChain .with_fallbacks() middleware. If Groq fails for any reason, LangChain automatically retries with Mistral without any manual intervention.
    """
    primary = ChatGroq(
        model="openai/gpt-oss-120b",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.7,
        max_tokens=1024
    )

    fallback = ChatMistralAI(
        model="mistral-small-latest",
        api_key=os.getenv("MISTRAL_API_KEY"),
        temperature=0.7
    )

    llm_with_fallback = primary.with_fallbacks([fallback])
    return llm_with_fallback.bind_tools(tools)

# ── Graph nodes ───────────────────────────────────────────────────────────────

def coach_node(state: CoachState):
    """
    Rex's reasoning node which receives the conversation history, calls tools if needed, and generates a response.
    """
    llm_with_tools = get_llm_with_tools()

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

    graph.add_edge("tools", "coach")

    return graph.compile()

coach_graph = build_coach_graph()

# ── Utility functions ───────────────────────────────────────────────────────────────

def _strip_leaked_function_syntax(text: str, is_chunk: bool = False) -> str:
    """
    Removes raw <function=...>...</function> tool-call markup that can leak into visible text when Groq/Llama's function-calling format isn't fully parsed by LangChain in edge cases (e.g. truncated tool calls). This is a defensive safety net, not the primary tool-calling mechanism.
    """

    cleaned = re.sub(r'<function=.*?</function>', '', text, flags=re.DOTALL)
    return cleaned if is_chunk else cleaned.strip()

# ── Main conversation function ────────────────────────────────────────────────

def chat_with_rex(user_id: str, message: str, history: list) -> tuple[str, str]:
    """
    Send a message to Rex and get a response. The history parameter is a list of previous messages in LangChain format.

    Returns:
        tuple: (response_text, retrieved_context) where response_text is the response text and retrieved_context is a concatenated string of all tool outputs retrieved during this turn. The retrieved_context is passed to the output guardrail so it can verify Rex's response is actually grounded in real data rather than being incorrectly flagged as fabricated when it isn't.
    """
    messages = history + [HumanMessage(content=message)]

    result = coach_graph.invoke({
        "messages": messages,
        "user_id": user_id
    })

    response_text = "I'm having trouble responding right now. Please try again."
    for msg in reversed(result["messages"]):
        if isinstance(msg, AIMessage) and not getattr(msg, "tool_calls", None):
            response_text = _strip_leaked_function_syntax(msg.content)
            break

    retrieved_context_parts = []
    for msg in result["messages"][len(history) + 1:]:
        if isinstance(msg, ToolMessage):
            retrieved_context_parts.append(str(msg.content))

    retrieved_context = "\n\n".join(retrieved_context_parts)

    return response_text, retrieved_context

async def stream_chat_with_rex(user_id: str, message: str, history: list):
    """
    Stream Rex's response token by token as it's generated for real-time display in the frontend, and finally yield the retrieved tool context once streaming completes so the caller can verify the response with the output guardrail.

    Yields:
        tuple: ("chunk", text) for each response chunk as it streams, then ("context", retrieved_context) exactly once at the end
    """
    messages = history + [HumanMessage(content=message)]
    retrieved_context_parts = []

    async for msg, metadata in coach_graph.astream(
        {"messages": messages, "user_id": user_id},
        stream_mode="messages"
    ):
        if metadata.get("langgraph_node") == "coach" and msg.content:
            cleaned = _strip_leaked_function_syntax(msg.content, is_chunk=True)
            if cleaned:
                yield ("chunk", cleaned)
        elif isinstance(msg, ToolMessage):
            retrieved_context_parts.append(str(msg.content))

    retrieved_context = "\n\n".join(retrieved_context_parts)
    yield ("context", retrieved_context)

# ── Unit test ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_user_id = "ee59e314-05d5-4e37-b01e-4d7ca910b561"

    print("Testing Rex coach graph...")
    response_text, context = chat_with_rex(
        user_id=test_user_id,
        message="Hey Rex, what did I commit to today?",
        history=[]
    )
    print(f"\nRex: {response_text}")
    print(f"\nRetrieved context: {context}")