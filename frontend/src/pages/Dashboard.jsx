import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import { api, sendMessageStream } from "../lib/api"
import { colors, fonts, radius } from "../theme"

export default function Dashboard() {
    const navigate = useNavigate()
    const [goals, setGoals] = useState([])
    const [unresolvedGoals, setUnresolvedGoals] = useState([])
    const [loading, setLoading] = useState(true)

    // Embedded Rex mini-chat state
    const [chatMessages, setChatMessages] = useState([])
    const [chatInput, setChatInput] = useState("")
    const [chatLoading, setChatLoading] = useState(false)
    const [chatHistoryLoading, setChatHistoryLoading] = useState(true)
    const chatEndRef = useRef(null)

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

    useEffect(() => {
        const fetchRecentChat = async () => {
            try {
                const data = await api.getHistory()
                const allMessages = data.messages || []
                // Only show the last 3 messages on Dashboard — full history lives on Coach page
                setChatMessages(allMessages.slice(-3))
            } catch (err) {
                console.error("Failed to load chat history", err)
            } finally {
                setChatHistoryLoading(false)
            }
        }
        fetchRecentChat()
    }, [])

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [chatMessages])

    const handleChatSend = async () => {
        if (!chatInput.trim() || chatLoading) return

        const userMessage = { role: "user", content: chatInput }
        setChatMessages(prev => [...prev, userMessage, { role: "assistant", content: "" }])
        setChatInput("")
        setChatLoading(true)

        try {
            await sendMessageStream(
                userMessage.content,
                (chunk) => {
                    setChatMessages(prev => {
                        const updated = [...prev]
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: updated[updated.length - 1].content + chunk
                        }
                        return updated
                    })
                },
                () => {
                    setChatLoading(false)
                    // Refresh goals in case Rex's conversation led to a goal update
                    api.getTodayGoals().then(data => setGoals(Array.isArray(data) ? data : []))
                }
            )
        } catch (err) {
            setChatMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = { ...updated[updated.length - 1], content: "Having trouble responding. Try again." }
                return updated
            })
            setChatLoading(false)
        }
    }

    const handleChatKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleChatSend()
        }
    }

    const completedCount = goals.filter(g => g.status === "completed").length
    const totalCount = goals.length

    const cardStyle = {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: "28px",
        border: `1px solid ${colors.border}`
    }

    const RexAvatar = ({ size = 44 }) => (
        <div style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            backgroundColor: colors.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.heading,
            fontSize: `${size * 0.4}px`,
            fontWeight: "600",
            color: "#1a1210",
            flexShrink: 0
        }}>
            R
        </div>
    )

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
                <p style={{ color: colors.textSecondary, fontSize: "14px", marginBottom: "28px" }}>
                    {totalCount > 0
                        ? `${completedCount} of ${totalCount} goals completed today`
                        : "No goals set for today yet"}
                </p>

                {/* Embedded Rex mini-chat — replaces static greeting */}
                <div style={{
                    ...cardStyle,
                    marginBottom: "24px",
                    backgroundColor: colors.accentMuted,
                    border: `1px solid ${colors.accent}33`
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <RexAvatar />
                        <div>
                            <p style={{ color: colors.textPrimary, fontSize: "14px", fontWeight: "600" }}>Rex</p>
                            <p style={{ color: colors.textMuted, fontSize: "12px" }}>
                                {totalCount === 0 ? "Nothing set for today yet" : `${totalCount - completedCount} thing${totalCount - completedCount !== 1 ? "s" : ""} still open`}
                            </p>
                        </div>
                    </div>

                    {chatHistoryLoading ? (
                        <p style={{ color: colors.textMuted, fontSize: "13px" }}>Loading...</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px", maxHeight: "220px", overflowY: "auto" }}>
                            {chatMessages.length === 0 && (
                                <p style={{ color: colors.textSecondary, fontSize: "13px", lineHeight: "1.5" }}>
                                    What are you actually going to work on today?
                                </p>
                            )}
                            {chatMessages.map((msg, idx) => (
                                <div key={idx} style={{
                                    alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                                    maxWidth: "85%",
                                    backgroundColor: msg.role === "user" ? colors.accent : colors.surface,
                                    color: msg.role === "user" ? "#1a1210" : colors.textPrimary,
                                    padding: "9px 13px",
                                    borderRadius: msg.role === "user" ? `${radius.sm} 3px ${radius.sm} ${radius.sm}` : `3px ${radius.sm} ${radius.sm} ${radius.sm}`,
                                    fontSize: "13px",
                                    lineHeight: "1.5"
                                }}>
                                    {msg.content || "..."}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>
                    )}

                    <div style={{ display: "flex", gap: "8px" }}>
                        <input
                            type="text"
                            placeholder="Talk to Rex..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={handleChatKeyPress}
                            disabled={chatLoading}
                            style={{
                                flex: 1,
                                padding: "10px 14px",
                                backgroundColor: colors.surface,
                                border: `1px solid ${colors.border}`,
                                borderRadius: radius.sm,
                                color: colors.textPrimary,
                                fontSize: "13px",
                                outline: "none",
                                fontFamily: fonts.body
                            }}
                        />
                        <button
                            onClick={handleChatSend}
                            disabled={chatLoading || !chatInput.trim()}
                            style={{
                                padding: "10px 18px",
                                backgroundColor: chatLoading || !chatInput.trim() ? colors.surfaceRaised : colors.accent,
                                color: chatLoading || !chatInput.trim() ? colors.textMuted : "#1a1210",
                                border: "none",
                                borderRadius: radius.sm,
                                fontSize: "13px",
                                fontWeight: "600",
                                cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer"
                            }}
                        >
                            Send
                        </button>
                    </div>

                    <p
                        onClick={() => navigate("/coach")}
                        style={{ color: colors.textMuted, fontSize: "11px", marginTop: "12px", cursor: "pointer", textAlign: "right" }}
                    >
                        Open full conversation →
                    </p>
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
                            These didn't get resolved yet — still yours to finish
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
                            backgroundColor: "transparent",
                            color: colors.textPrimary,
                            border: `1px solid ${colors.borderStrong}`,
                            borderRadius: radius.card,
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer"
                        }}
                    >
                        Set goals / log session
                    </button>
                </div>
            </div>
        </div>
    )
}