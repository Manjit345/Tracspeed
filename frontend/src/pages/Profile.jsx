import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"
import { setAvatarColor as saveAvatarColor } from "../lib/supabase"
import { colors, fonts, radius, avatarPalette } from "../theme"

export default function Profile() {
    const navigate = useNavigate()
    const [name, setName] = useState("")
    const [avatarColor, setAvatarColorState] = useState(colors.accent)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await api.getProfile()
                setName(data.name || "")
                setAvatarColorState(data.avatar_color || colors.accent)
            } catch (err) {
                console.error("Failed to load profile", err)
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setMessage(null)
        try {
            await api.updateProfile({ name, avatar_color: avatarColor })
            saveAvatarColor(avatarColor)
            localStorage.setItem("user_name", name)
            setMessage({ type: "success", text: "Profile updated" })
        } catch (err) {
            setMessage({ type: "error", text: "Failed to update profile" })
        } finally {
            setSaving(false)
        }
    }

    const cardStyle = {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: "28px",
        border: `1px solid ${colors.border}`
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

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: fonts.body }}>
                <Navbar />
                <div style={{ padding: "40px", color: colors.textMuted }}>Loading...</div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: fonts.body }}>
            <Navbar />

            <div style={{ padding: "48px 40px", maxWidth: "560px", margin: "0 auto" }}>
                <h1 style={{
                    fontFamily: fonts.heading,
                    fontSize: "30px",
                    fontWeight: "500",
                    color: colors.textPrimary,
                    marginBottom: "36px",
                    letterSpacing: "-0.01em"
                }}>
                    Profile
                </h1>

                {message && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: radius.sm,
                        marginBottom: "24px",
                        backgroundColor: message.type === "success" ? colors.successBg : colors.dangerBg,
                        color: message.type === "success" ? colors.success : colors.danger,
                        fontSize: "14px"
                    }}>
                        {message.text}
                    </div>
                )}

                <div style={{ ...cardStyle, marginBottom: "20px" }}>
                    {/* Preview */}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
                        <div style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            backgroundColor: avatarColor,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: fonts.heading,
                            fontSize: "26px",
                            fontWeight: "600",
                            color: "#1a1210"
                        }}>
                            {name ? name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <div>
                            <p style={{ color: colors.textPrimary, fontSize: "16px", fontWeight: "600" }}>{name || "Your name"}</p>
                            <p style={{ color: colors.textMuted, fontSize: "12px" }}>This is how your avatar appears</p>
                        </div>
                    </div>

                    {/* Name field */}
                    <div style={{ marginBottom: "24px" }}>
                        <label style={{ fontSize: "13px", color: colors.textSecondary, display: "block", marginBottom: "6px" }}>
                            Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {/* Color picker */}
                    <div>
                        <label style={{ fontSize: "13px", color: colors.textSecondary, display: "block", marginBottom: "10px" }}>
                            Avatar color
                        </label>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {avatarPalette.map(color => (
                                <button
                                    key={color}
                                    onClick={() => setAvatarColorState(color)}
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "50%",
                                        backgroundColor: color,
                                        border: avatarColor === color ? `2px solid ${colors.textPrimary}` : "2px solid transparent",
                                        cursor: "pointer",
                                        padding: 0,
                                        outline: "none"
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{
                        padding: "13px 28px",
                        backgroundColor: saving ? colors.surfaceRaised : colors.accent,
                        color: saving ? colors.textMuted : "#1a1210",
                        border: "none",
                        borderRadius: radius.sm,
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: saving ? "not-allowed" : "pointer"
                    }}
                >
                    {saving ? "Saving..." : "Save changes"}
                </button>
            </div>
        </div>
    )
}