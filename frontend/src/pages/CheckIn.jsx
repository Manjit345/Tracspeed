import { useState, useEffect } from "react"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"

const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export default function CheckIn() {
    const [goals, setGoals] = useState([])
    const [goalForm, setGoalForm] = useState({ description: "", target_duration: "" })
    const [sessionForm, setSessionForm] = useState({ goal_id: "", duration: "", notes: "" })
    const [message, setMessage] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchGoals = async () => {
        try {
            const data = await api.getTodayGoals()
            setGoals(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Failed to fetch goals", err)
        }
    }

    useEffect(() => {
        fetchGoals()
    }, [])

    const handleCreateGoal = async () => {
        if (!goalForm.description.trim()) {
            setMessage({ type: "error", text: "Please describe your goal" })
            return
        }

        setLoading(true)
        try {
            const today = getLocalDateString()
            await api.createGoal({
                date: today,
                description: goalForm.description,
                target_duration: goalForm.target_duration ? parseInt(goalForm.target_duration) : null
            })
            setGoalForm({ description: "", target_duration: "" })
            setMessage({ type: "success", text: "Goal added" })
            fetchGoals()
        } catch (err) {
            setMessage({ type: "error", text: "Failed to add goal" })
        } finally {
            setLoading(false)
        }
    }

    const handleLogSession = async () => {
        if (!sessionForm.duration) {
            setMessage({ type: "error", text: "Please enter a duration" })
            return
        }

        setLoading(true)
        try {
            await api.logSession({
                goal_id: sessionForm.goal_id || null,
                duration: parseInt(sessionForm.duration),
                notes: sessionForm.notes || null
            })
            setSessionForm({ goal_id: "", duration: "", notes: "" })
            setMessage({ type: "success", text: "Session logged" })
        } catch (err) {
            setMessage({ type: "error", text: "Failed to log session" })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (goalId, status) => {
        try {
            await api.updateGoalStatus(goalId, status)
            fetchGoals()
        } catch (err) {
            console.error("Failed to update goal", err)
        }
    }

    const inputStyle = {
        width: "100%",
        padding: "10px 14px",
        backgroundColor: "#0f1117",
        border: "1px solid #2a2f3e",
        borderRadius: "6px",
        color: "#ffffff",
        fontSize: "14px",
        outline: "none"
    }

    const labelStyle = {
        fontSize: "13px",
        color: "#9e9e9e",
        display: "block",
        marginBottom: "6px"
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#0f1117" }}>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "700px", margin: "0 auto" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "32px" }}>
                    Check In
                </h1>

                {message && (
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: "6px",
                        marginBottom: "24px",
                        backgroundColor: message.type === "success" ? "#1b5e20" : "#b71c1c",
                        color: message.type === "success" ? "#4caf50" : "#f44336",
                        fontSize: "14px"
                    }}>
                        {message.text}
                    </div>
                )}

                {/* Add Goal */}
                <div style={{
                    backgroundColor: "#1e2130",
                    borderRadius: "8px",
                    padding: "24px",
                    marginBottom: "24px"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", marginBottom: "16px" }}>
                        Set a Goal
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>What will you work on?</label>
                            <input
                                type="text"
                                placeholder="e.g. Finish chapter 3 of the ML course"
                                value={goalForm.description}
                                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Target duration (minutes, optional)</label>
                            <input
                                type="number"
                                placeholder="60"
                                value={goalForm.target_duration}
                                onChange={(e) => setGoalForm({ ...goalForm, target_duration: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <button
                            onClick={handleCreateGoal}
                            disabled={loading}
                            style={{
                                padding: "10px",
                                backgroundColor: "#4f46e5",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: loading ? "not-allowed" : "pointer"
                            }}
                        >
                            Add Goal
                        </button>
                    </div>
                </div>

                {/* Today's Goals with status update */}
                {goals.length > 0 && (
                    <div style={{
                        backgroundColor: "#1e2130",
                        borderRadius: "8px",
                        padding: "24px",
                        marginBottom: "24px"
                    }}>
                        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", marginBottom: "16px" }}>
                            Update Goal Status
                        </h3>
                        {goals.map(goal => (
                            <div key={goal.id} style={{
                                padding: "12px 0",
                                borderBottom: "1px solid #2a2f3e",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <p style={{ color: "#ffffff", fontSize: "14px" }}>{goal.description}</p>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {["completed", "partial", "missed"].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleUpdateStatus(goal.id, status)}
                                            style={{
                                                padding: "4px 10px",
                                                fontSize: "12px",
                                                backgroundColor: goal.status === status ? "#4f46e5" : "#2a2f3e",
                                                color: "#ffffff",
                                                border: "none",
                                                borderRadius: "12px",
                                                cursor: "pointer"
                                            }}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Log Session */}
                <div style={{
                    backgroundColor: "#1e2130",
                    borderRadius: "8px",
                    padding: "24px"
                }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff", marginBottom: "16px" }}>
                        Log a Session
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>Link to goal (optional)</label>
                            <select
                                value={sessionForm.goal_id}
                                onChange={(e) => setSessionForm({ ...sessionForm, goal_id: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">No specific goal</option>
                                {goals.map(goal => (
                                    <option key={goal.id} value={goal.id}>{goal.description}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Duration (minutes)</label>
                            <input
                                type="number"
                                placeholder="25"
                                value={sessionForm.duration}
                                onChange={(e) => setSessionForm({ ...sessionForm, duration: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Notes (optional)</label>
                            <input
                                type="text"
                                placeholder="What did you work on?"
                                value={sessionForm.notes}
                                onChange={(e) => setSessionForm({ ...sessionForm, notes: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <button
                            onClick={handleLogSession}
                            disabled={loading}
                            style={{
                                padding: "10px",
                                backgroundColor: "#4f46e5",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "14px",
                                fontWeight: "600",
                                cursor: loading ? "not-allowed" : "pointer"
                            }}
                        >
                            Log Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}