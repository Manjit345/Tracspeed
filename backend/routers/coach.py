"""
Coach Router: FastAPI endpoints for Rex, Tracspeed's AI accountability coach. It handles incoming messages, retrieves conversation history from Supabase, passes it to the coach graph, stores the response, and returns Rex's reply.
"""

from fastapi import APIRouter, HTTPException, Depends
from models.schemas import CoachMessage, CoachResponse
from db.supabase_client import supabase, get_current_user
from agent.coach_graph import chat_with_rex
from langchain_core.messages import HumanMessage, AIMessage

router = APIRouter(prefix="/coach", tags=["coach"])

def get_conversation_history(user_id: str, limit: int = 20) -> list:
    """
    Retrieve recent conversation history from Supabase and convert to LangChain message format for the coach graph. Limits to last 20 messages to avoid token limits.
    """

    try:
        response = supabase.table("conversations").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(limit).execute()
        messages = list(reversed(response.data))
        history = []
        for msg in messages:
            if msg["role"] == "user":
                history.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                history.append(AIMessage(content=msg["content"]))
        return history
    except Exception:
        return []

def save_messages(user_id: str, user_message: str, assistant_message: str):
    """
    Save both the user message and Rex's response to Supabase conversations table. This is how conversation memory persists across sessions.
    """

    try:
        supabase.table("conversations").insert([
            {"user_id": user_id, "role": "user", "content": user_message},
            {"user_id": user_id, "role": "assistant", "content": assistant_message}
        ]).execute()
    except Exception as e:
        print(f"Error saving messages: {str(e)}")

@router.post("/message", response_model=CoachResponse)
def send_message(message: CoachMessage, user_id: str = Depends(get_current_user)):
    """
    Send a message to Rex and get a response. Retrieves conversation history, runs the coach graph, saves both messages to Supabase, and returns Rex's reply.
    """

    try:
        history = get_conversation_history(user_id)
        response_content = chat_with_rex(user_id=user_id, message=message.content, history=history)
        save_messages(user_id, message.content, response_content)
        last_msg = supabase.table("conversations").select("id").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(1).execute()
        conversation_id=last_msg.data[0]["id"] if last_msg.data else ""

        return CoachResponse(
            content=response_content,
            conversation_id=conversation_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/history")
def get_history(user_id: str = Depends(get_current_user)):
    """
    Retrieve full conversation history for the authenticated user which is used by the frontend to display past messages on load.
    """

    try:
        response = supabase.table("conversations").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(50).execute()

        return {"messages": list(reversed(response.data))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))