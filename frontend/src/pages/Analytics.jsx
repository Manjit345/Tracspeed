import { useState, useEffect } from "react"
import Navbar from "../components/Navbar"
import { api } from "../lib/api"
import { colors, fonts, radius } from "../theme"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const CHART_COLORS = {
    completed: colors.success,
    partial: colors.warning,
    missed: colors.danger,
    pending: colors.textMuted
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
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: "26px",
        border: `1px solid ${colors.border}`
    }

    const statCardStyle = {
        ...cardStyle,
        display: "flex",
        flexDirection: "column",
        gap: "8px"
    }

    const chartTitleStyle = {
        fontFamily: fonts.heading,
        fontSize: "16px",
        fontWeight: "500",
        color: colors.textPrimary,
        marginBottom: "18px"
    }

    const pieData = breakdown ? [
        { name: "Completed", value: breakdown.completed, color: CHART_COLORS.completed },
        { name: "Partial", value: breakdown.partial, color: CHART_COLORS.partial },
        { name: "Missed", value: breakdown.missed, color: CHART_COLORS.missed },
        { name: "Pending", value: breakdown.pending, color: CHART_COLORS.pending }
    ].filter(d => d.value > 0) : []

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: fonts.body }}>
                <Navbar />
                <div style={{ padding: "40px", color: colors.textMuted }}>Loading analytics...</div>
            </div>
        )
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, fontFamily: fonts.body }}>
            <Navbar />

            <div style={{ padding: "48px 40px", maxWidth: "1100px", margin: "0 auto" }}>
                <h1 style={{
                    fontFamily: fonts.heading,
                    fontSize: "30px",
                    fontWeight: "500",
                    color: colors.textPrimary,
                    marginBottom: "8px",
                    letterSpacing: "-0.01em"
                }}>
                    Analytics
                </h1>
                <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "36px" }}>
                    Your progress over the last 30 days
                </p>

                {/* Hero Stats Row */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px",
                    marginBottom: "20px"
                }}>
                    <div style={statCardStyle}>
                        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>Completion rate</span>
                        <span style={{ color: colors.accent, fontSize: "32px", fontWeight: "600", fontFamily: fonts.heading }}>
                            {overview?.completion_rate}%
                        </span>
                    </div>
                    <div style={statCardStyle}>
                        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>Current streak</span>
                        <span style={{ color: colors.accent, fontSize: "32px", fontWeight: "600", fontFamily: fonts.heading }}>
                            {overview?.current_streak} <span style={{ fontSize: "16px", color: colors.textMuted, fontFamily: fonts.body }}>days</span>
                        </span>
                    </div>
                    <div style={statCardStyle}>
                        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>Total sessions</span>
                        <span style={{ color: colors.accent, fontSize: "32px", fontWeight: "600", fontFamily: fonts.heading }}>
                            {overview?.total_sessions}
                        </span>
                    </div>
                    <div style={statCardStyle}>
                        <span style={{ color: colors.textSecondary, fontSize: "13px" }}>Time invested</span>
                        <span style={{ color: colors.accent, fontSize: "32px", fontWeight: "600", fontFamily: fonts.heading }}>
                            {Math.round((overview?.total_minutes || 0) / 60 * 10) / 10}
                            <span style={{ fontSize: "16px", color: colors.textMuted, fontFamily: fonts.body }}> hrs</span>
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
                        <p style={chartTitleStyle}>Completion rate trend</p>
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={trend}>
                                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                                <XAxis dataKey="date" stroke={colors.textMuted} fontSize={12} />
                                <YAxis stroke={colors.textMuted} fontSize={12} domain={[0, 100]} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: radius.sm }}
                                    labelStyle={{ color: colors.textPrimary }}
                                />
                                <Line type="monotone" dataKey="completion_rate" stroke={colors.accent} strokeWidth={2} dot={{ fill: colors.accent }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Goal Breakdown Pie */}
                    <div style={cardStyle}>
                        <p style={chartTitleStyle}>Goal breakdown</p>
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
                                    <Tooltip contentStyle={{ backgroundColor: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: radius.sm }} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value) => <span style={{ color: colors.textSecondary, fontSize: "12px" }}>{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p style={{ color: colors.textMuted, fontSize: "13px", padding: "60px 0", textAlign: "center" }}>
                                No goal data yet
                            </p>
                        )}
                    </div>
                </div>

                {/* Session Activity Bar Chart */}
                <div style={{ ...cardStyle, marginBottom: "16px" }}>
                    <p style={chartTitleStyle}>Daily activity (last 14 days)</p>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                            <XAxis dataKey="date" stroke={colors.textMuted} fontSize={12} />
                            <YAxis stroke={colors.textMuted} fontSize={12} />
                            <Tooltip
                                contentStyle={{ backgroundColor: colors.surfaceRaised, border: `1px solid ${colors.border}`, borderRadius: radius.sm }}
                                labelStyle={{ color: colors.textPrimary }}
                            />
                            <Bar dataKey="minutes" fill={colors.accent} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Activity Feed */}
                <div style={cardStyle}>
                    <p style={chartTitleStyle}>Recent sessions</p>
                    {recentSessions.length === 0 ? (
                        <p style={{ color: colors.textMuted, fontSize: "13px" }}>No sessions logged yet</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {recentSessions.map(session => (
                                <div key={session.id} style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "11px 0",
                                    borderBottom: `1px solid ${colors.border}`
                                }}>
                                    <div>
                                        <p style={{ color: colors.textPrimary, fontSize: "13px" }}>
                                            {session.notes || "No notes"}
                                        </p>
                                        <p style={{ color: colors.textMuted, fontSize: "11px", marginTop: "2px" }}>
                                            {new Date(session.logged_at).toLocaleDateString("en-US", {
                                                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                            })}
                                        </p>
                                    </div>
                                    <span style={{
                                        color: colors.accent,
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        backgroundColor: colors.accentMuted,
                                        padding: "5px 12px",
                                        borderRadius: radius.pill
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