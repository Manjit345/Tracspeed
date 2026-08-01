import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { setAuth } from "../lib/supabase"

export default function Login() {
    const navigate = useNavigate()
    const [mode, setMode] = useState("signin") // "signin" or "signup"
    const [form, setForm] = useState({ email: "", password: "", name: "" })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    const handleSubmit = async () => {
        setLoading(true)
        setError(null)

        try {
            let response
            if (mode === "signup") {
                response = await api.signup(form)
            } else {
                response = await api.signin({ email: form.email, password: form.password })
            }

            if (response.detail) {
                setError(typeof response.detail === "string" ? response.detail : "Something went wrong")
                return
            }

            setAuth(response.access_token, response.refresh_token, response.user_id, response.name)
            navigate("/")
        } catch (err) {
            setError("Something went wrong. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0f1117"
        }}>
            <div style={{
                width: "100%",
                maxWidth: "400px",
                padding: "40px",
                backgroundColor: "#1e2130",
                borderRadius: "12px",
                border: "1px solid #2a2f3e"
            }}>
                {/* Logo */}
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#ffffff" }}>
                        Tracspeed
                    </h1>
                    <p style={{ color: "#6b7280", fontSize: "14px", marginTop: "6px" }}>
                        {mode === "signin" ? "Welcome back" : "Create your account"}
                    </p>
                </div>

                {/* Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {mode === "signup" && (
                        <div>
                            <label style={{ fontSize: "13px", color: "#9e9e9e", display: "block", marginBottom: "6px" }}>
                                Name
                            </label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Your name"
                                value={form.name}
                                onChange={handleChange}
                                style={{
                                    width: "100%",
                                    padding: "10px 14px",
                                    backgroundColor: "#0f1117",
                                    border: "1px solid #2a2f3e",
                                    borderRadius: "6px",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    outline: "none"
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ fontSize: "13px", color: "#9e9e9e", display: "block", marginBottom: "6px" }}>
                            Email
                        </label>
                        <input
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                backgroundColor: "#0f1117",
                                border: "1px solid #2a2f3e",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                                outline: "none"
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: "13px", color: "#9e9e9e", display: "block", marginBottom: "6px" }}>
                            Password
                        </label>
                        <input
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                backgroundColor: "#0f1117",
                                border: "1px solid #2a2f3e",
                                borderRadius: "6px",
                                color: "#ffffff",
                                fontSize: "14px",
                                outline: "none"
                            }}
                        />
                    </div>

                    {error && (
                        <p style={{ color: "#f44336", fontSize: "13px" }}>{error}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "12px",
                            backgroundColor: loading ? "#2a2f3e" : "#4f46e5",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: loading ? "not-allowed" : "pointer",
                            marginTop: "8px"
                        }}
                    >
                        {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
                    </button>
                </div>

                {/* Toggle */}
                <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "#6b7280" }}>
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <span
                        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null) }}
                        style={{ color: "#4f46e5", cursor: "pointer", fontWeight: "600" }}
                    >
                        {mode === "signin" ? "Sign up" : "Sign in"}
                    </span>
                </p>
            </div>
        </div>
    )
}