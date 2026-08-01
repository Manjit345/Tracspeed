import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"

export default function Dashboard() {
    const navigate = useNavigate()
    const [goals, setGoals] = useState([])
    const [loading, setLoading] = useState(true)
    const [unresolvedGoals, setUnresolvedGoals] = useState([])

    useEffect(() => {
        const fetchGoals = async () => {
            setLoading(true)
            try {
                const [todayData, unresolvedData] = await Promise.all([
                    api.getTodayGoals(),
                    api.getUnresolvedGoals()
                ])
                setGoals(Array.isArray(todayData) ? todayData : [])
                // Exclude today's goals from the "carried over" list to avoid duplicates
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

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#0f1117" }}>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
                    Today's Overview
                </h1>
                <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "32px" }}>
                    {totalCount > 0
                        ? `${completedCount} of ${totalCount} goals completed today`
                        : "No goals set for today yet"}
                </p>

                {/* Today's Goals */}
                <div style={{
                    backgroundColor: "#1e2130",
                    borderRadius: "8px",
                    padding: "24px",
                    marginBottom: "24px"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", marginBottom: "16px" }}>
                        Today's Goals
                    </h3>

                    {loading && <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p>}

                    {!loading && goals.length === 0 && (
                        <p style={{ color: "#6b7280", fontSize: "14px" }}>
                            No goals set for today. Head to Check In to set one.
                        </p>
                    )}

                    {!loading && goals.map(goal => (
                        <div key={goal.id} style={{
                            padding: "12px 0",
                            borderBottom: "1px solid #2a2f3e",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <div>
                                <p style={{ color: "#ffffff", fontSize: "14px" }}>{goal.description}</p>
                                <p style={{ color: "#6b7280", fontSize: "12px" }}>
                                    {goal.target_duration ? `${goal.target_duration} min target` : "No duration set"}
                                </p>
                            </div>
                            <span style={{
                                fontSize: "12px",
                                padding: "4px 10px",
                                borderRadius: "12px",
                                backgroundColor: goal.status === "completed" ? "#1b5e20" : "#2a2f3e",
                                color: goal.status === "completed" ? "#4caf50" : "#9e9e9e"
                            }}>
                                {goal.status}
                            </span>
                        </div>
                    ))}
                </div>

                {!loading && unresolvedGoals.length > 0 && (
                    <div style={{
                        backgroundColor: "#1e2130",
                        borderRadius: "8px",
                        padding: "24px",
                        marginBottom: "24px",
                        borderLeft: "3px solid #ff9800"
                    }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", marginBottom: "4px" }}>
                            Carried Over
                        </h3>
                        <p style={{ color: "#6b7280", fontSize: "12px", marginBottom: "16px" }}>
                            These didn't get resolved yet — still yours to finish
                        </p>
                        {unresolvedGoals.map(goal => (
                            <div key={goal.id} style={{
                                padding: "12px 0",
                                borderBottom: "1px solid #2a2f3e",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <div>
                                    <p style={{ color: "#ffffff", fontSize: "14px" }}>{goal.description}</p>
                                    <p style={{ color: "#6b7280", fontSize: "12px" }}>
                                        Originally set for {goal.date}
                                    </p>
                                </div>
                                <span style={{
                                    fontSize: "12px",
                                    padding: "4px 10px",
                                    borderRadius: "12px",
                                    backgroundColor: goal.status === "missed" ? "#b71c1c" : "#3d2d0f",
                                    color: goal.status === "missed" ? "#f44336" : "#ff9800"
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
                            padding: "16px",
                            backgroundColor: "#4f46e5",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Set Goals / Log Session
                    </button>
                    <button
                        onClick={() => navigate("/coach")}
                        style={{
                            flex: 1,
                            padding: "16px",
                            backgroundColor: "#1e2130",
                            color: "#ffffff",
                            border: "1px solid #2a2f3e",
                            borderRadius: "8px",
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