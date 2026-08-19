import { getToken, getRefreshToken, setAuth, clearAuth } from "./supabase"

const API_URL = import.meta.env.VITE_API_URL || "http://tracspeed.onrender.com"

const getHeaders = () => {
    const token = getToken()
    return {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` })
    }
}

// Attempts to refresh the access token using the stored refresh token.
// Returns true if successful, false if the refresh itself failed
// (meaning the user needs to log in again from scratch).
const attemptTokenRefresh = async () => {
    const refreshToken = getRefreshToken()
    if (!refreshToken) return false

    try {
        const response = await fetch(`${API_URL}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`, {
            method: "POST"
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.log("DEBUG — refresh failed with:", errorText)
            return false
        }

        const data = await response.json()
        setAuth(data.access_token, data.refresh_token, data.user_id, data.name)
        return true
    } catch (err) {
        console.log("DEBUG — refresh threw an exception:", err)
        return false
    }
}

// Core fetch wrapper — all API calls go through this. On a 401 response,
// it automatically attempts a token refresh and retries the original
// request once. If the refresh itself fails, auth is cleared and the
// caller receives the original 401 response so the app can redirect to login.
const apiFetch = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: { ...getHeaders(), ...options.headers }
    })

    if (response.status === 401) {
        const refreshed = await attemptTokenRefresh()

        if (refreshed) {
            return fetch(url, {
                ...options,
                headers: { ...getHeaders(), ...options.headers }
            })
        } else {
            clearAuth()
            window.location.href = "/login"
        }
    }

    return response
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
    createGoal: (data) => apiFetch(`${API_URL}/goals/`, {
        method: "POST",
        body: JSON.stringify(data)
    }).then(r => r.json()),

    getTodayGoals: () => apiFetch(`${API_URL}/goals/today`).then(r => r.json()),

    getAllGoals: () => apiFetch(`${API_URL}/goals/`).then(r => r.json()),

    updateGoalStatus: (goalId, status) => apiFetch(`${API_URL}/goals/${goalId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    }).then(r => r.json()),

    // Sessions
    logSession: (data) => apiFetch(`${API_URL}/sessions/`, {
        method: "POST",
        body: JSON.stringify(data)
    }).then(r => r.json()),

    getTodaySessions: () => apiFetch(`${API_URL}/sessions/today`).then(r => r.json()),

    // Coach
    sendMessage: (content) => apiFetch(`${API_URL}/coach/message`, {
        method: "POST",
        body: JSON.stringify({ content })
    }).then(r => r.json()),

    getHistory: () => apiFetch(`${API_URL}/coach/history`).then(r => r.json()),

    // Analytics
    getOverview: () => apiFetch(`${API_URL}/analytics/overview`).then(r => r.json()),

    getCompletionTrend: () => apiFetch(`${API_URL}/analytics/completion-trend`).then(r => r.json()),

    getSessionActivity: () => apiFetch(`${API_URL}/analytics/session-activity`).then(r => r.json()),

    getGoalBreakdown: () => apiFetch(`${API_URL}/analytics/goal-breakdown`).then(r => r.json()),

    getRecentActivity: () => apiFetch(`${API_URL}/analytics/recent-activity`).then(r => r.json()),

    getUnresolvedGoals: () => apiFetch(`${API_URL}/goals/unresolved`).then(r => r.json()),

    // Profile
    getProfile: () => apiFetch(`${API_URL}/profile/`).then(r => r.json()),

    updateProfile: (data) => apiFetch(`${API_URL}/profile/`, {
        method: "PATCH",
        body: JSON.stringify(data)
    }).then(r => r.json()),

}

// Streaming coach message — reads Server-Sent Events chunk by chunk
export const sendMessageStream = async (content, onChunk, onDone) => {
    let token = getToken()

    const startStream = async (authToken) => {
        return fetch(`${API_URL}/coach/message/stream`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${authToken}`
            },
            body: JSON.stringify({ content })
        })
    }

    let response = await startStream(token)

    if (response.status === 401) {
        const refreshed = await attemptTokenRefresh()
        if (refreshed) {
            token = getToken()
            response = await startStream(token)
        } else {
            clearAuth()
            window.location.href = "/login"
            return
        }
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split("\n\n")
        buffer = parts.pop()

        for (const part of parts) {
            if (part.startsWith("data: ")) {
                const data = part.slice(6)
                if (data === "[DONE]") {
                    onDone()
                    return
                }
                onChunk(data)
            }
        }
    }
}