import { useState, useEffect } from "react"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"
import { colors, fonts, radius } from "../theme"

// Returns today's date in local timezone as YYYY-MM-DD, avoiding the UTC
// conversion bug that occurs with new Date().toISOString()
const getLocalDateString = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
}

export default function CheckIn() {
    const [goals, setGoals] = useState([])
    const [unresolvedGoals, setUnresolvedGoals] = useState([])
    const [goalForm, setGoalForm] = useState({ description: "", target_duration: "" })
    const [sessionForm, setSessionForm] = useState({ goal_id: "", duration: "", notes: "" })
    const [message, setMessage] = useState(null)
    const [loading, setLoading] = useState(false)

    const fetchGoals = async () => {
        try {
            const [todayData, unresolvedData] = await Promise.all([
                api.getTodayGoals(),
                api.getUnresolvedGoals()
            ])
            const today = Array.isArray(todayData) ? todayData : []
            setGoals(today)
            const todayIds = new Set(today.map(g => g.id))
            setUnresolvedGoals(
                (Array.isArray(unresolvedData) ? unresolvedData : []).filter(g => !todayIds.has(g.id))
            )
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
            fetchGoals()
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

    const cardStyle = {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: "28px",
        border: `1px solid ${colors.border}`
    }

    const sectionTitleStyle = {
        fontFamily: fonts.heading,
        fontSize: "17px",
        fontWeight: "500",
        color: colors.textPrimary,
        marginBottom: "18px"
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

    const primaryButtonStyle = {
        padding: "12px",
        backgroundColor: colors.accent,
        color: "#1a1210",
        border: "none",
        borderRadius: radius.sm,
        fontSize: "14px",
        fontWeight: "600",
        cursor: loading ? "not-allowed" : "pointer"
    }

    const statusButtonStyle = (isActive) => ({
        padding: "5px 12px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: isActive ? colors.accent : colors.surfaceRaised,
        color: isActive ? "#1a1210" : colors.textSecondary,
        border: "none",
        borderRadius: radius.pill,
        cursor: "pointer"
    })

    const allGoals = [...goals, ...unresolvedGoals]

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: fonts.body }}>
            <Navbar />

            <div style={{ padding: "48px 40px", maxWidth: "700px", margin: "0 auto" }}>
                <h1 style={{
                    fontFamily: fonts.heading,
                    fontSize: "30px",
                    fontWeight: "500",
                    color: colors.textPrimary,
                    marginBottom: "36px",
                    letterSpacing: "-0.01em"
                }}>
                    Check in
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

                {/* Add Goal */}
                <div style={{ ...cardStyle, marginBottom: "20px" }}>
                    <h3 style={sectionTitleStyle}>Set a goal</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
                        <button onClick={handleCreateGoal} disabled={loading} style={primaryButtonStyle}>
                            Add goal
                        </button>
                    </div>
                </div>

                {/* Update Goal Status — today's + carried over */}
                {allGoals.length > 0 && (
                    <div style={{ ...cardStyle, marginBottom: "20px" }}>
                        <h3 style={sectionTitleStyle}>Update goal status</h3>
                        {goals.map(goal => (
                            <div key={goal.id} style={{
                                padding: "13px 0",
                                borderBottom: `1px solid ${colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <p style={{ color: colors.textPrimary, fontSize: "14px" }}>{goal.description}</p>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {["completed", "partial", "missed"].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleUpdateStatus(goal.id, status)}
                                            style={statusButtonStyle(goal.status === status)}
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {unresolvedGoals.map(goal => (
                            <div key={goal.id} style={{
                                padding: "13px 0",
                                borderBottom: `1px solid ${colors.border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}>
                                <div>
                                    <p style={{ color: colors.textPrimary, fontSize: "14px" }}>{goal.description}</p>
                                    <p style={{ color: colors.textMuted, fontSize: "11px", marginTop: "2px" }}>
                                        from {goal.date}
                                    </p>
                                </div>
                                <div style={{ display: "flex", gap: "6px" }}>
                                    {["completed", "partial", "missed"].map(status => (
                                        <button
                                            key={status}
                                            onClick={() => handleUpdateStatus(goal.id, status)}
                                            style={statusButtonStyle(goal.status === status)}
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
                <div style={cardStyle}>
                    <h3 style={sectionTitleStyle}>Log a session</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        <div>
                            <label style={labelStyle}>Link to goal (optional)</label>
                            <select
                                value={sessionForm.goal_id}
                                onChange={(e) => setSessionForm({ ...sessionForm, goal_id: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">No specific goal</option>
                                {goals.length > 0 && (
                                    <optgroup label="Today">
                                        {goals.map(goal => (
                                            <option key={goal.id} value={goal.id}>{goal.description}</option>
                                        ))}
                                    </optgroup>
                                )}
                                {unresolvedGoals.length > 0 && (
                                    <optgroup label="Carried over">
                                        {unresolvedGoals.map(goal => (
                                            <option key={goal.id} value={goal.id}>{goal.description} (from {goal.date})</option>
                                        ))}
                                    </optgroup>
                                )}
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
                        <button onClick={handleLogSession} disabled={loading} style={primaryButtonStyle}>
                            Log session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}