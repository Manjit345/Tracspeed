import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { setAuth } from "../lib/supabase"
import { colors, fonts, radius } from "../theme"

export default function Login() {
    const navigate = useNavigate()
    const [mode, setMode] = useState("signin")
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

    const inputStyle = {
        width: "100%",
        padding: "11px 14px",
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        color: colors.textPrimary,
        fontSize: "14px",
        outline: "none",
        fontFamily: fonts.body
    }

    const labelStyle = {
        fontSize: "13px",
        color: colors.textSecondary,
        display: "block",
        marginBottom: "6px"
    }

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.bg,
            fontFamily: fonts.body
        }}>
            <div style={{
                width: "100%",
                maxWidth: "400px",
                padding: "44px",
                backgroundColor: colors.surface,
                borderRadius: radius.card,
                border: `1px solid ${colors.border}`
            }}>
                {/* Logo / Avatar */}
                <div style={{ textAlign: "center", marginBottom: "36px" }}>
                    <div style={{
                        width: "52px",
                        height: "52px",
                        borderRadius: "50%",
                        backgroundColor: colors.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: fonts.heading,
                        fontSize: "22px",
                        fontWeight: "600",
                        color: "#1a1210",
                        margin: "0 auto 18px auto"
                    }}>
                        R
                    </div>
                    <h1 style={{
                        fontFamily: fonts.heading,
                        fontSize: "26px",
                        fontWeight: "500",
                        color: colors.textPrimary,
                        letterSpacing: "-0.01em"
                    }}>
                        Tracspeed
                    </h1>
                    <p style={{ color: colors.textSecondary, fontSize: "14px", marginTop: "8px" }}>
                        {mode === "signin" ? "Rex is waiting. Let's see where you left off." : "Rex remembers everything you commit to."}
                    </p>
                </div>

                {/* Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {mode === "signup" && (
                        <div>
                            <label style={labelStyle}>Name</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Your name"
                                value={form.name}
                                onChange={handleChange}
                                style={inputStyle}
                            />
                        </div>
                    )}

                    <div>
                        <label style={labelStyle}>Email</label>
                        <input
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Password</label>
                        <input
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            style={inputStyle}
                        />
                    </div>

                    {error && (
                        <p style={{ color: colors.danger, fontSize: "13px" }}>{error}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: "100%",
                            padding: "13px",
                            backgroundColor: loading ? colors.surfaceRaised : colors.accent,
                            color: loading ? colors.textMuted : "#1a1210",
                            border: "none",
                            borderRadius: radius.sm,
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: loading ? "not-allowed" : "pointer",
                            marginTop: "8px"
                        }}
                    >
                        {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
                    </button>
                </div>

                {/* Toggle */}
                <p style={{ textAlign: "center", marginTop: "26px", fontSize: "13px", color: colors.textMuted }}>
                    {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                    <span
                        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null) }}
                        style={{ color: colors.accent, cursor: "pointer", fontWeight: "600" }}
                    >
                        {mode === "signin" ? "Sign up" : "Sign in"}
                    </span>
                </p>
            </div>
        </div>
    )
}