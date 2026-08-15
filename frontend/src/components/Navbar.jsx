import { useNavigate, useLocation } from "react-router-dom"
import { clearAuth, getUserName, getAvatarColor } from "../lib/supabase"
import { colors, fonts, radius } from "../theme"

export default function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()
    const userName = getUserName()

    const handleLogout = () => {
        clearAuth()
        navigate("/login")
    }

    const navItems = [
        { path: "/", label: "Dashboard" },
        { path: "/checkin", label: "Check in" },
        { path: "/coach", label: "Coach" },
        { path: "/analytics", label: "Analytics" }
    ]

    return (
        <nav style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 32px",
            height: "68px",
            backgroundColor: colors.surface,
            borderBottom: `1px solid ${colors.border}`
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "48px" }}>
                {/* Brand */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        backgroundColor: colors.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: fonts.heading,
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1a1210"
                    }}>
                        R
                    </div>
                    <h2 style={{
                        fontFamily: fonts.heading,
                        fontSize: "17px",
                        fontWeight: "500",
                        color: colors.textPrimary,
                        letterSpacing: "-0.01em"
                    }}>
                        Tracspeed
                    </h2>
                </div>

                {/* Nav items with underline indicator */}
                <div style={{ display: "flex", gap: "4px", height: "68px" }}>
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    position: "relative",
                                    padding: "0 16px",
                                    height: "68px",
                                    backgroundColor: "transparent",
                                    color: isActive ? colors.textPrimary : colors.textMuted,
                                    border: "none",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: isActive ? "600" : "400",
                                    fontFamily: fonts.body,
                                    transition: "color 0.15s"
                                }}
                                onMouseEnter={e => { if (!isActive) e.target.style.color = colors.textSecondary }}
                                onMouseLeave={e => { if (!isActive) e.target.style.color = colors.textMuted }}
                            >
                                {item.label}
                                {isActive && (
                                    <div style={{
                                        position: "absolute",
                                        bottom: 0,
                                        left: "16px",
                                        right: "16px",
                                        height: "2px",
                                        backgroundColor: colors.accent,
                                        borderRadius: "2px 2px 0 0"
                                    }} />
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                        onClick={() => navigate("/profile")}
                        style={{
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            backgroundColor: getAvatarColor(),
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#1a1210",
                            cursor: "pointer"
                        }}
                    >
                        {userName ? userName.charAt(0).toUpperCase() : "?"}
                    </div>
                    <span style={{ color: colors.textSecondary, fontSize: "14px" }}>{userName}</span>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: "7px 16px",
                        backgroundColor: "transparent",
                        color: colors.textMuted,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.pill,
                        cursor: "pointer",
                        fontSize: "13px",
                        transition: "all 0.15s"
                    }}
                    onMouseEnter={e => {
                        e.target.style.color = colors.danger
                        e.target.style.borderColor = colors.danger
                    }}
                    onMouseLeave={e => {
                        e.target.style.color = colors.textMuted
                        e.target.style.borderColor = colors.border
                    }}
                >
                    Log out
                </button>
            </div>
        </nav>
    )
}