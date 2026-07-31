"""
Evaluator: Async post-hoc scoring of Rex's coach responses using DeepEval. It runs independently of the real-time guardrails and is for monitoring quality trends over time, not blocking bad responses live. The scores are stored in the evaluations table, linked to the conversation they assess.

Note: save_evaluation() uses raw requests instead of the supabase-py client
specifically for this table. supabase-py's client consistently failed RLS
checks on inserts to evaluations despite identical, verified-correct RLS
policies and service role key — raw HTTP requests against Supabase's REST
API succeed reliably, isolating this to a supabase-py client bug rather
than a configuration issue.
"""

import os
import requests
from dotenv import load_dotenv
from deepeval.metrics import AnswerRelevancyMetric, HallucinationMetric
from deepeval.test_case import LLMTestCase
from deepeval.models import GeminiModel
from db.supabase_client import supabase

load_dotenv()

gemini_judge = GeminiModel(model="gemini-3.6-flash")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def evaluate_conversation(user_message: str, rex_response: str, retrieved_context: str = "") -> dict:
    """
    Score a single Rex conversation turn for answer relevancy and hallucination. It returns None for a score if that particular metric fails to run, rather than crashing the whole evaluation so that one failed metric shouldn't lose the others.

    Args:
        user_message: What the user said
        rex_response: What Rex replied
        retrieved_context: Any tool data Rex used to ground the response

    Returns:
        dict: relevancy_score, hallucination_score, and any error notes
    """
    relevancy_score = None
    hallucination_score = None
    notes = []

    try:
        test_case = LLMTestCase(
            input=user_message,
            actual_output=rex_response
        )
        metric = AnswerRelevancyMetric(threshold=0.7, model=gemini_judge)
        metric.measure(test_case)
        relevancy_score = metric.score
    except Exception as e:
        notes.append(f"Relevancy check failed: {str(e)}")

    if retrieved_context:
        try:
            test_case = LLMTestCase(
                input=user_message,
                actual_output=rex_response,
                context=[retrieved_context]
            )
            metric = HallucinationMetric(threshold=0.5, model=gemini_judge)
            metric.measure(test_case)
            hallucination_score = metric.score
        except Exception as e:
            notes.append(f"Hallucination check failed: {str(e)}")

    return {
        "relevancy_score": relevancy_score,
        "hallucination_score": hallucination_score,
        "notes": "; ".join(notes) if notes else None
    }

def save_evaluation(conversation_id: str, scores: dict):
    """
    Persist evaluation scores to the evaluations table, linked to the specific conversation turn they assess. It flags the record if either score crosses concerning thresholds, for easy filtering later.

    Uses raw requests against Supabase's REST API directly rather than the supabase-py client, as a workaround for a library-specific RLS bug isolated during debugging.
    """
    try:
        flagged = False
        if scores["relevancy_score"] is not None and scores["relevancy_score"] < 0.5:
            flagged = True
        if scores["hallucination_score"] is not None and scores["hallucination_score"] > 0.5:
            flagged = True

        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/evaluations",
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            json={
                "conversation_id": conversation_id,
                "tone_score": None,
                "hallucination_score": scores["hallucination_score"],
                "relevancy_score": scores["relevancy_score"],
                "flagged": flagged
            }
        )

        if response.status_code not in (200, 201):
            print(f"Failed to save evaluation for conversation {conversation_id}: {response.text}")

    except Exception as e:
        print(f"Failed to save evaluation for conversation {conversation_id}: {str(e)}")

def run_evaluation(conversation_id: str, user_message: str, rex_response: str, retrieved_context: str = ""):
    """
    Full evaluation pipeline for a single conversation turn which scores it and persists the result. It is designed to be called without blocking the main request/response cycle, since this is purely for monitoring.
    """
    scores = evaluate_conversation(user_message, rex_response, retrieved_context)
    save_evaluation(conversation_id, scores)
    return scores

#Code for unit testing the evaluator
if __name__ == "__main__":
    result = evaluate_conversation(
        user_message="What did I commit to today?",
        rex_response="You committed to finishing a lecture today, and it looks like you've already completed it. How did it go?",
        retrieved_context="Today's goals: - Finish lecture (completed, target: 60 mins)"
    )
    print(f"Relevancy score: {result['relevancy_score']}")
    print(f"Hallucination score: {result['hallucination_score']}")
    print(f"Notes: {result['notes']}")