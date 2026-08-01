import { useState, useEffect } from "react"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const COLORS = {
    completed: "#4caf50",
    partial: "#ff9800",
    missed: "#f44336",
    pending: "#6b7280"
}

export default function Analytics() {
    const [overview, setOverview] = useState(null)
    const [trend, setTrend] = useState([])
    const [activity, setActivity] = useState([])
    const [breakdown, setBreakdown] = useState(null)
    const [recentSessions, setRecentSessions] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [overviewData, trendData, activityData, breakdownData, recentData] = await Promise.all([
                    api.getOverview(),
                    api.getCompletionTrend(),
                    api.getSessionActivity(),
                    api.getGoalBreakdown(),
                    api.getRecentActivity()
                ])
                setOverview(overviewData)
                setTrend(trendData.trend || [])
                setActivity(activityData.activity || [])
                setBreakdown(breakdownData.breakdown || {})
                setRecentSessions(recentData.sessions || [])
            } catch (err) {
                console.error("Failed to load analytics", err)
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const cardStyle = {
        backgroundColor: "#1e2130",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid #2a2f3e"
    }

    const statCardStyle = {
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    }

    const chartTitleStyle = {
        fontSize: "15px",
        fontWeight: "600",
        color: "#ffffff",
        marginBottom: "16px"
    }

    const pieData = breakdown ? [
        { name: "Completed", value: breakdown.completed, color: COLORS.completed },
        { name: "Partial", value: breakdown.partial, color: COLORS.partial },
        { name: "Missed", value: breakdown.missed, color: COLORS.missed },
        { name: "Pending", value: breakdown.pending, color: COLORS.pending }
    ].filter(d => d.value > 0) : []

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: "#0f1117" }}>
                <Navbar />
                <div style={{ padding: "40px", color: "#6b7280" }}>Loading analytics...</div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#0f1117" }}>
            <Navbar />

            <div style={{ padding: "40px", maxWidth: "1100px", margin: "0 auto" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
                    Analytics
                </h1>
                <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "32px" }}>
                    Your progress over the last 30 days
                </p>

                {/* Hero Stats Row */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px",
                    marginBottom: "24px"
                }}>
                    <div style={statCardStyle}>
                        <span style={{ color: "#6b7280", fontSize: "13px" }}>Completion Rate</span>
                        <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: "700" }}>
                            {overview?.completion_rate}%
                        </span>
                    </div>
                    <div style={statCardStyle}>
                        <span style={{ color: "#6b7280", fontSize: "13px" }}>Current Streak</span>
                        <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: "700" }}>
                            {overview?.current_streak} <span style={{ fontSize: "16px", color: "#6b7280" }}>days</span>
                        </span>
                    </div>
                    <div style={statCardStyle}>
                        <span style={{ color: "#6b7280", fontSize: "13px" }}>Total Sessions</span>
                        <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: "700" }}>
                            {overview?.total_sessions}
                        </span>
                    </div>
                    <div style={statCardStyle}>
                        <span style={{ color: "#6b7280", fontSize: "13px" }}>Time Invested</span>
                        <span style={{ color: "#ffffff", fontSize: "32px", fontWeight: "700" }}>
                            {Math.round((overview?.total_minutes || 0) / 60 * 10) / 10}
                            <span style={{ fontSize: "16px", color: "#6b7280" }}> hrs</span>
                        </span>
                    </div>
                </div>

                {/* Charts Row */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: "16px",
                    marginBottom: "16px"
                }}>
                    {/* Completion Trend */}
                    <div style={cardStyle}>
                        <p style={chartTitleStyle}>Completion Rate Trend</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                                <YAxis stroke="#6b7280" fontSize={12} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#1e2130", border: "1px solid #2a2f3e", borderRadius: "8px" }}
                                    labelStyle={{ color: "#ffffff" }}
                                />
                                <Line type="monotone" dataKey="completion_rate" stroke="#4f46e5" strokeWidth={2} dot={{ fill: "#4f46e5" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Goal Breakdown Pie */}
                    <div style={cardStyle}>
                        <p style={chartTitleStyle}>Goal Breakdown</p>
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={4}
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: "#1e2130", border: "1px solid #2a2f3e", borderRadius: "8px" }} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span style={{ color: "#9e9e9e", fontSize: "12px" }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p style={{ color: "#6b7280", fontSize: "13px", padding: "60px 0", textAlign: "center" }}>
                                No goal data yet
                            </p>
                        )}
                    </div>
                </div>

                {/* Session Activity Bar Chart */}
                <div style={{ ...cardStyle, marginBottom: "16px" }}>
                    <p style={chartTitleStyle}>Daily Activity (Last 14 Days)</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3e" />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                            <YAxis stroke="#6b7280" fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#1e2130", border: "1px solid #2a2f3e", borderRadius: "8px" }}
                                labelStyle={{ color: "#ffffff" }}
                            />
                            <Bar dataKey="minutes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Activity Feed */}
                <div style={cardStyle}>
                    <p style={chartTitleStyle}>Recent Sessions</p>
                    {recentSessions.length === 0 ? (
                        <p style={{ color: "#6b7280", fontSize: "13px" }}>No sessions logged yet</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {recentSessions.map(session => (
                                <div key={session.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "10px 0",
                                    borderBottom: "1px solid #2a2f3e"
                                }}>
                                    <div>
                                        <p style={{ color: "#ffffff", fontSize: "13px" }}>
                                            {session.notes || "No notes"}
                                        </p>
                                        <p style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>
                                            {new Date(session.logged_at).toLocaleDateString("en-US", {
                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </p>
                                    </div>
                                    <span style={{
                                        color: "#4f46e5",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        backgroundColor: "#1a1d2e",
                                        padding: "4px 10px",
                                        borderRadius: "12px"
                                    }}>
                                        {session.duration} min
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}