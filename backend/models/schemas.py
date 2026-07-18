"""
Schemas: Pydantic models defining request and response structures for all Tracspeed API endpoints.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime

#Authentication schemas
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    name: str

#Goal Schemas
class GoalCreate(BaseModel):
    date: date
    description: str
    target_duration: Optional[int] = None

class GoalUpdate(BaseModel):
    status: str        #  shows goal status amongst completed, pending, partial, or missed

class GoalResponse(BaseModel):
    id: str
    user_id: str
    date: date
    description: str
    target_duration: Optional[int]
    status: str
    created_at: datetime

#Session Schemas
class SessionState(BaseModel):
    goal_id: Optional[str] = None
    duration: int
    notes: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    user_id: str
    goal_id: Optional[str]
    duration: int
    notes: Optional[str]
    logged_at: datetime

#Coach Schemas
class CoachMessage(BaseModel):
    content: str

class CoachResponse(BaseModel):
    content: str
    conversation_id: str

#Pause Schemas
class PauseCreate(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None
