import { useNavigate, useLocation } from "react-router-dom"
import { clearAuth, getUserName } from "../lib/supabase"

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
        { path: "/checkin", label: "Check In" },
        { path: "/coach", label: "Coach" },
        { path: "/analytics", label: "Analytics" }
    ]

    return (
        <nav style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 32px",
            backgroundColor: "#161b27",
            borderBottom: "1px solid #2a2f3e"
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "40px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#ffffff" }}>
                    Tracspeed
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                    {navItems.map(item => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: location.pathname === item.path ? "#2a2f3e" : "transparent",
                                color: location.pathname === item.path ? "#ffffff" : "#9e9e9e",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontSize: "14px",
                                fontWeight: location.pathname === item.path ? "600" : "400"
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ color: "#9e9e9e", fontSize: "14px" }}>{userName}</span>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: "8px 16px",
                        backgroundColor: "transparent",
                        color: "#f44336",
                        border: "1px solid #f44336",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px"
                    }}
                >
                    Logout
                </button>
            </div>
        </nav>
    )
}