// Supabase client for frontend auth state management
// Auth tokens are stored in localStorage and managed via the FastAPI backend
export const getToken = () => localStorage.getItem("access_token")
export const getUserId = () => localStorage.getItem("user_id")
export const getUserName = () => localStorage.getItem("user_name")

export const setAuth = (token, userId, name) => {
    localStorage.setItem("access_token", token)
    localStorage.setItem("user_id", userId)
    localStorage.setItem("user_name", name)
}

export const clearAuth = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_name")
}

export const isAuthenticated = () => !!getToken()