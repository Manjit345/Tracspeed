"""
Tracspeed Backend: A FastAPI server handling authentication, goal management, session logging, and AI coach conversation for Tracspeed.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routers.auth import router as auth_router
from routers.goals import router as goals_router
from routers.sessions import router as sessions_router
from routers.coach import router as coach_router
from routers.analytics import router as analytics_router
from routers.profile import router as profile_router

app = FastAPI(title="Tracspeed API")

app.include_router(auth_router)
app.include_router(goals_router)
app.include_router(sessions_router)
app.include_router(coach_router)
app.include_router(analytics_router)
app.include_router(profile_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  #temporary before vercel deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Tracspeed API is running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)