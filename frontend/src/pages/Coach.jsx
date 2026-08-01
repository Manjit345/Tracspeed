import { useState, useEffect, useRef } from "react"
import Navbar from "../components/Navbar"
import { api, sendMessageStream } from "../lib/api"
import { colors, fonts, radius } from "../theme"

export default function Coach() {
    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(true)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await api.getHistory()
                setMessages(data.messages || [])
            } catch (err) {
                console.error("Failed to load history", err)
            } finally {
                setLoadingHistory(false)
            }
        }
        fetchHistory()
    }, [])

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage = { role: "user", content: input, created_at: new Date().toISOString() }
        setMessages(prev => [...prev, userMessage])
        setInput("")
        setLoading(true)

        setMessages(prev => [...prev, { role: "assistant", content: "", created_at: new Date().toISOString() }])

        try {
            await sendMessageStream(
                userMessage.content,
                (chunk) => {
                    setMessages(prev => {
                        const updated = [...prev]
                        updated[updated.length - 1] = {
                            ...updated[updated.length - 1],
                            content: updated[updated.length - 1].content + chunk
                        }
                        return updated
                    })
                },
                () => setLoading(false)
            )
        } catch (err) {
            setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: "I'm having trouble responding right now. Please try again."
                }
                return updated
            })
            setLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const RexAvatar = () => (
        <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            backgroundColor: colors.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: fonts.heading,
            fontSize: "13px",
            fontWeight: "600",
            color: "#1a1210",
            flexShrink: 0
        }}>
            R
        </div>
    )

    const TypingDots = () => (
        <div style={{ display: "flex", gap: "4px", padding: "4px 0" }}>
            {[0, 1, 2].map(i => (
                <span key={i} style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: colors.textMuted,
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`
                }} />
            ))}
            <style>{`@keyframes pulse { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }`}</style>
        </div>
    )

    return (
        <div style={{ minHeight: "100vh", backgroundColor: colors.bg, display: "flex", flexDirection: "column", fontFamily: fonts.body }}>
            <Navbar />

            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                maxWidth: "720px",
                margin: "0 auto",
                width: "100%",
                padding: "32px 24px 0 24px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "28px" }}>
                    <RexAvatar />
                    <h1 style={{
                        fontFamily: fonts.heading,
                        fontSize: "22px",
                        fontWeight: "500",
                        color: colors.textPrimary,
                        letterSpacing: "-0.01em"
                    }}>
                        Rex
                    </h1>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "18px",
                    paddingBottom: "24px"
                }}>
                    {loadingHistory && (
                        <p style={{ color: colors.textMuted, fontSize: "14px" }}>Loading conversation...</p>
                    )}

                    {!loadingHistory && messages.length === 0 && (
                        <div style={{
                            display: "flex",
                            gap: "12px",
                            alignItems: "flex-start"
                        }}>
                            <RexAvatar />
                            <div style={{
                                backgroundColor: colors.surface,
                                border: `1px solid ${colors.border}`,
                                borderRadius: `4px ${radius.card} ${radius.card} ${radius.card}`,
                                padding: "14px 18px",
                                color: colors.textSecondary,
                                fontSize: "14px",
                                lineHeight: "1.6",
                                maxWidth: "80%"
                            }}>
                                Tell me what you're working on today, or ask me how you're doing with your goals. I'll remember it.
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isUser = msg.role === "user"
                        const isLast = idx === messages.length - 1
                        const isEmptyLoading = !isUser && msg.content === "" && loading && isLast

                        return (
                            <div
                                key={idx}
                                style={{
                                    display: "flex",
                                    gap: "12px",
                                    alignItems: "flex-start",
                                    flexDirection: isUser ? "row-reverse" : "row"
                                }}
                            >
                                {!isUser && <RexAvatar />}
                                <div style={{
                                    backgroundColor: isUser ? colors.accent : colors.surface,
                                    border: isUser ? "none" : `1px solid ${colors.border}`,
                                    color: isUser ? "#1a1210" : colors.textPrimary,
                                    padding: "13px 17px",
                                    borderRadius: isUser
                                        ? `${radius.card} 4px ${radius.card} ${radius.card}`
                                        : `4px ${radius.card} ${radius.card} ${radius.card}`,
                                    fontSize: "14px",
                                    lineHeight: "1.6",
                                    maxWidth: "78%"
                                }}>
                                    {isEmptyLoading ? <TypingDots /> : msg.content}
                                </div>
                            </div>
                        )
                    })}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    display: "flex",
                    gap: "12px",
                    padding: "18px 0 24px 0",
                    borderTop: `1px solid ${colors.border}`
                }}>
                    <input
                        type="text"
                        placeholder="Message Rex..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: "13px 18px",
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.border}`,
                            borderRadius: radius.card,
                            color: colors.textPrimary,
                            fontSize: "14px",
                            outline: "none",
                            fontFamily: fonts.body
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        style={{
                            padding: "13px 26px",
                            backgroundColor: loading || !input.trim() ? colors.surfaceRaised : colors.accent,
                            color: loading || !input.trim() ? colors.textMuted : "#1a1210",
                            border: "none",
                            borderRadius: radius.card,
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: loading || !input.trim() ? "not-allowed" : "pointer"
                        }}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    )
}