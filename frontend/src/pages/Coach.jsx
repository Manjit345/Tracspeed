import { useState, useEffect, useRef } from "react"
import Navbar from "../components/Navbar"
import { api, sendMessageStream } from "../lib/api"

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

        // Add an empty assistant message that fills progressively as chunks arrive
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

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#0f1117", display: "flex", flexDirection: "column" }}>
            <Navbar />

            <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                maxWidth: "700px",
                margin: "0 auto",
                width: "100%",
                padding: "24px 24px 0 24px"
            }}>
                <h1 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "20px" }}>
                    Rex
                </h1>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                    paddingBottom: "20px"
                }}>
                    {loadingHistory && (
                        <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading conversation...</p>
                    )}

                    {!loadingHistory && messages.length === 0 && (
                        <div style={{
                            backgroundColor: "#1e2130",
                            borderRadius: "8px",
                            padding: "20px",
                            color: "#9e9e9e",
                            fontSize: "14px"
                        }}>
                            Hey, I'm Rex. Tell me what you're working on today, or ask me how you're doing with your goals.
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                                maxWidth: "80%"
                            }}
                        >
                            <div style={{
                                backgroundColor: msg.role === "user" ? "#4f46e5" : "#1e2130",
                                color: "#ffffff",
                                padding: "12px 16px",
                                borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                fontSize: "14px",
                                lineHeight: "1.5",
                                minHeight: msg.role === "assistant" && msg.content === "" ? "20px" : "auto"
                            }}>
                                {msg.content || (msg.role === "assistant" ? "..." : "")}
                            </div>
                        </div>
                    ))}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    display: "flex",
                    gap: "12px",
                    padding: "16px 0",
                    borderTop: "1px solid #2a2f3e"
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
                            padding: "12px 16px",
                            backgroundColor: "#1e2130",
                            border: "1px solid #2a2f3e",
                            borderRadius: "8px",
                            color: "#ffffff",
                            fontSize: "14px",
                            outline: "none"
                        }}
                    />
                    <button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: loading || !input.trim() ? "#2a2f3e" : "#4f46e5",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "8px",
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