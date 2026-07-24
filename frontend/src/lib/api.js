// API utility — all calls to the FastAPI backend go through here
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

const getHeaders = () => {
    const token = localStorage.getItem("access_token")
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
    }
}

export const api = {
    // Auth
    signup: (data) => fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json()),

    signin: (data) => fetch(`${API_URL}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    }).then(r => r.json()),

    // Goals
    createGoal: (data) => fetch(`${API_URL}/goals/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data)
    }).then(r => r.json()),

    getTodayGoals: () => fetch(`${API_URL}/goals/today`, {
        headers: getHeaders()
    }).then(r => r.json()),

    getAllGoals: () => fetch(`${API_URL}/goals/`, {
        headers: getHeaders()
    }).then(r => r.json()),

    updateGoalStatus: (goalId, status) => fetch(`${API_URL}/goals/${goalId}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status })
    }).then(r => r.json()),

    // Sessions
    logSession: (data) => fetch(`${API_URL}/sessions/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data)
    }).then(r => r.json()),

    getTodaySessions: () => fetch(`${API_URL}/sessions/today`, {
        headers: getHeaders()
    }).then(r => r.json()),

    // Coach
    sendMessage: (content) => fetch(`${API_URL}/coach/message`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ content })
    }).then(r => r.json()),

    getHistory: () => fetch(`${API_URL}/coach/history`, {
        headers: getHeaders()
    }).then(r => r.json()),
}