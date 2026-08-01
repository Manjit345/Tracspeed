import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"
import { colors, fonts, radius } from "../theme"

export default function Dashboard() {
    const navigate = useNavigate()
    const [goals, setGoals] = useState([])
    const [unresolvedGoals, setUnresolvedGoals] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchGoals = async () => {
            setLoading(true)
            try {
                const [todayData, unresolvedData] = await Promise.all([
                    api.getTodayGoals(),
                    api.getUnresolvedGoals()
                ])
                setGoals(Array.isArray(todayData) ? todayData : [])
                const todayIds = new Set((Array.isArray(todayData) ? todayData : []).map(g => g.id))
                setUnresolvedGoals(
                    (Array.isArray(unresolvedData) ? unresolvedData : []).filter(g => !todayIds.has(g.id))
                )
            } catch (err) {
                console.error("Failed to fetch goals", err)
            } finally {
                setLoading(false)
            }
        }
        fetchGoals()
    }, [])

    const completedCount = goals.filter(g => g.status === "completed").length
    const totalCount = goals.length

    const cardStyle = {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: "28px",
        border: `1px solid ${colors.border}`
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: fonts.body }}>
            <Navbar />

            <div style={{ padding: "48px 40px", maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{
                    fontFamily: fonts.heading,
                    fontSize: "30px",
                    fontWeight: "500",
                    color: colors.textPrimary,
                    marginBottom: "8px",
                    letterSpacing: "-0.01em"
                }}>
                    Today's overview
                </h1>
                {/* Rex greeting */}
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    marginBottom: "32px",
                    padding: "20px 24px",
                    backgroundColor: colors.accentMuted,
                    borderRadius: radius.card,
                    border: `1px solid ${colors.accent}33`
                }}>
                    <div style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: colors.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: fonts.heading,
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#1a1210",
                        flexShrink: 0
                    }}>
                        R
                    </div>
                    <div>
                        <p style={{ color: colors.textPrimary, fontSize: "14px", lineHeight: "1.5" }}>
                            {totalCount === 0
                                ? "You haven't set anything for today. What are you actually going to work on?"
                                : completedCount === totalCount
                                    ? "Everything's done for today. Good work — don't let it slip tomorrow."
                                    : `${totalCount - completedCount} thing${totalCount - completedCount !== 1 ? "s" : ""} still open today. Let's not leave it for tonight.`}
                        </p>
                    </div>
                </div>

                {/* Today's Goals */}
                <div style={{ ...cardStyle, marginBottom: "20px" }}>
                    <h3 style={{
                        fontFamily: fonts.heading,
                        fontSize: "17px",
                        fontWeight: "500",
                        color: colors.textPrimary,
                        marginBottom: "18px"
                    }}>
                        Today's goals
                    </h3>

                    {loading && <p style={{ color: colors.textMuted, fontSize: "14px" }}>Loading...</p>}

                    {!loading && goals.length === 0 && (
                        <p style={{ color: colors.textMuted, fontSize: "14px" }}>
                            No goals set for today. Head to Check In to set one.
                        </p>
                    )}

                    {!loading && goals.map(goal => (
                        <div key={goal.id} style={{
                            padding: "14px 0",
                            borderBottom: `1px solid ${colors.border}`,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <p style={{ color: colors.textPrimary, fontSize: "14px" }}>{goal.description}</p>
                                <p style={{ color: colors.textMuted, fontSize: "12px", marginTop: "3px" }}>
                                    {goal.target_duration ? `${goal.target_duration} min target` : "No duration set"}
                                </p>
                            </div>
                            <span style={{
                                fontSize: "11px",
                                fontWeight: "600",
                                letterSpacing: "0.03em",
                                textTransform: "uppercase",
                                padding: "5px 12px",
                                borderRadius: radius.pill,
                                backgroundColor: goal.status === "completed" ? colors.successBg : colors.surfaceRaised,
                                color: goal.status === "completed" ? colors.success : colors.textSecondary
                            }}>
                                {goal.status}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Carried Over */}
                {!loading && unresolvedGoals.length > 0 && (
                    <div style={{
                        ...cardStyle,
                        marginBottom: "20px",
                        borderLeft: `3px solid ${colors.warning}`
                    }}>
                        <h3 style={{
                            fontFamily: fonts.heading,
                            fontSize: "17px",
                            fontWeight: "500",
                            color: colors.textPrimary,
                            marginBottom: "4px"
                        }}>
                            Carried over
                        </h3>
                        <p style={{ color: colors.textMuted, fontSize: "12px", marginBottom: "18px" }}>
                            These didn't get resolved yet and are still yours to finish
                        </p>
                        {unresolvedGoals.map(goal => (
                            <div key={goal.id} style={{
                                padding: "14px 0",
                                borderBottom: `1px solid ${colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <div>
                                    <p style={{ color: colors.textPrimary, fontSize: "14px" }}>{goal.description}</p>
                                    <p style={{ color: colors.textMuted, fontSize: "12px", marginTop: "3px" }}>
                                        Originally set for {goal.date}
                                    </p>
                                </div>
                                <span style={{
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    letterSpacing: "0.03em",
                                    textTransform: "uppercase",
                                    padding: "5px 12px",
                                    borderRadius: radius.pill,
                                    backgroundColor: goal.status === "missed" ? colors.dangerBg : colors.warningBg,
                                    color: goal.status === "missed" ? colors.danger : colors.warning
                                }}>
                                    {goal.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Quick Actions */}
                <div style={{ display: "flex", gap: "16px" }}>
                    <button
                        onClick={() => navigate("/checkin")}
                        style={{
                            flex: 1,
                            padding: "18px",
                            backgroundColor: colors.accent,
                            color: "#1a1210",
                            border: "none",
                            borderRadius: radius.card,
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                            transition: "background-color 0.15s"
                        }}
                        onMouseEnter={e => e.target.style.backgroundColor = colors.accentHover}
                        onMouseLeave={e => e.target.style.backgroundColor = colors.accent}
                    >
                        Set goals / log session
                    </button>
                    <button
                        onClick={() => navigate("/coach")}
                        style={{
                            flex: 1,
                            padding: "18px",
                            backgroundColor: "transparent",
                            color: colors.textPrimary,
                            border: `1px solid ${colors.borderStrong}`,
                            borderRadius: radius.card,
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Talk to Rex
                    </button>
                </div>
            </div>
        </div>
    )
}