// Supabase client for frontend auth state management
// Auth tokens are stored in localStorage and managed via the FastAPI backend
export const getToken = () => localStorage.getItem("access_token")
export const getRefreshToken = () => localStorage.getItem("refresh_token")
export const getUserId = () => localStorage.getItem("user_id")
export const getUserName = () => localStorage.getItem("user_name")
export const getAvatarColor = () => localStorage.getItem("avatar_color") || "#e2662d"
export const setAvatarColor = (color) => localStorage.setItem("avatar_color", color)

export const setAuth = (token, refreshToken, userId, name) => {
    localStorage.setItem("access_token", token)
    localStorage.setItem("refresh_token", refreshToken)
    localStorage.setItem("user_id", userId)
    localStorage.setItem("user_name", name)
}

export const clearAuth = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user_id")
    localStorage.removeItem("user_name")
    localStorage.removeItem("avatar_color")
}

export const isAuthenticated = () => !!getToken()