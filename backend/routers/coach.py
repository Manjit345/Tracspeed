"""
Coach Router: FastAPI endpoints for Rex, Tracspeed's AI accountability coach. It handles incoming messages, retrieves conversation history from Supabase, passes it to the coach graph, stores the response, and returns Rex's reply. Input and output guardrails run around the coach conversation to catch distress signals, scope violations, jailbreak attempts, and unsafe responses. The output guardrail is now given the actual retrieved tool data from the conversation turn, so it can correctly verify whether Rex's response is grounded in real data rather than incorrectly flagging correct, data-backed responses as fabricated.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from models.schemas import CoachMessage, CoachResponse
from db.supabase_client import supabase, get_current_user
from agent.coach_graph import chat_with_rex, stream_chat_with_rex
from agent.guardrails import check_input, check_output, DISTRESS_FALLBACK, SCOPE_FALLBACK, JAILBREAK_FALLBACK, GENERIC_OUTPUT_FALLBACK
from agent.evaluator import run_evaluation
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
            {"user_id": user_id, "role": "user", "content": user_message}
        ]).execute()
        supabase.table("conversations").insert([
            {"user_id": user_id, "role": "assistant", "content": assistant_message}
        ]).execute()
    except Exception as e:
        print(f"Error saving messages: {str(e)}")

@router.post("/message", response_model=CoachResponse)
def send_message(message: CoachMessage, user_id: str = Depends(get_current_user)):
    """
    Send a message to Rex and get a response. It runs through input guardrails first, then the coach graph, then output guardrails before returning the final response. Both messages are saved to Supabase regardless of guardrail outcome.
    """

    try:
        input_check = check_input(message.content)

        if input_check.is_distress_signal:
            response_content = DISTRESS_FALLBACK
        elif input_check.is_jailbreak_attempt:
            response_content = JAILBREAK_FALLBACK
        elif input_check.is_scope_violation:
            response_content = SCOPE_FALLBACK
        else:
            history = get_conversation_history(user_id)
            response_content, retrieved_context = chat_with_rex(
                user_id=user_id,
                message=message.content,
                history=history
            )

            output_check = check_output(response_content, retrieved_context)

            if output_check.is_shaming or output_check.gives_medical_advice or output_check.encourages_overwork or output_check.fabricates_unverified_history:
                print(f"Output guardrail triggered for user {user_id}: {output_check.reasoning}")
                print(f"Original flagged response was: {response_content}")
                print(f"Retrieved context was: {retrieved_context}")
                response_content = GENERIC_OUTPUT_FALLBACK

        save_messages(user_id, message.content, response_content)

        last_msg = supabase.table("conversations").select("id").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(1).execute()

        conversation_id = last_msg.data[0]["id"] if last_msg.data else ""

        try:
            run_evaluation(conversation_id, message.content, response_content)
        except Exception as e:
            print(f"Evaluation failed to run: {str(e)}")

        return CoachResponse(
            content=response_content,
            conversation_id=conversation_id
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/message/stream")
async def send_message_stream(message: CoachMessage, user_id: str = Depends(get_current_user)):
    """
    Send a message to Rex and stream the response token by token. The input guardrail runs before streaming starts. The output guardrail runs asynchronously after the full response has streamed to the user, using the actual retrieved tool context from that turn, and if flagged, the persisted conversation history stores a corrected fallback instead of the original, so Rex's memory and future conversations are never contaminated by a flagged response.
    """
    input_check = check_input(message.content)

    if input_check.is_distress_signal:
        async def distress_stream():
            yield f"data: {DISTRESS_FALLBACK}\n\n"
            save_messages(user_id, message.content, DISTRESS_FALLBACK)
            yield "data: [DONE]\n\n"
        return StreamingResponse(distress_stream(), media_type="text/event-stream")

    if input_check.is_jailbreak_attempt:
        async def jailbreak_stream():
            yield f"data: {JAILBREAK_FALLBACK}\n\n"
            save_messages(user_id, message.content, JAILBREAK_FALLBACK)
            yield "data: [DONE]\n\n"
        return StreamingResponse(jailbreak_stream(), media_type="text/event-stream")

    if input_check.is_scope_violation:
        async def scope_stream():
            yield f"data: {SCOPE_FALLBACK}\n\n"
            save_messages(user_id, message.content, SCOPE_FALLBACK)
            yield "data: [DONE]\n\n"
        return StreamingResponse(scope_stream(), media_type="text/event-stream")

    history = get_conversation_history(user_id)

    async def event_generator():
        full_response = ""
        retrieved_context = ""

        async for item_type, content in stream_chat_with_rex(user_id, message.content, history):
            if item_type == "chunk":
                full_response += content
                yield f"data: {content}\n\n"
            elif item_type == "context":
                retrieved_context = content

        output_check = check_output(full_response, retrieved_context)

        if output_check.is_shaming or output_check.gives_medical_advice or output_check.encourages_overwork or output_check.fabricates_unverified_history:
            print(f"Output guardrail triggered for user {user_id}: {output_check.reasoning}")
            print(f"Original flagged response was: {full_response}")
            print(f"Retrieved context was: {retrieved_context}")
            saved_response = GENERIC_OUTPUT_FALLBACK
        else:
            saved_response = full_response

        save_messages(user_id, message.content, saved_response)

        last_msg = supabase.table("conversations").select("id").eq(
            "user_id", user_id
        ).order("created_at", desc=True).limit(1).execute()
        conversation_id = last_msg.data[0]["id"] if last_msg.data else ""

        try:
            run_evaluation(conversation_id, message.content, saved_response, retrieved_context)
        except Exception as e:
            print(f"Evaluation failed to run: {str(e)}")

        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

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