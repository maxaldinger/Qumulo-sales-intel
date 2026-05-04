'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  tool: string
  dealName: string | null
  context: string
  placeholder?: string
}

export default function SAFollowUpChat({ tool, dealName, context, placeholder }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [inputHeight, setInputHeight] = useState(38)
  const isDragging = useRef(false)
  const dragStart = useRef({ y: 0, height: 0 })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStart.current.y - e.clientY
      setInputHeight(Math.max(38, Math.min(300, dragStart.current.height + delta)))
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleResizeStart = (e: React.MouseEvent) => {
    isDragging.current = true
    dragStart.current = { y: e.clientY, height: inputHeight }
    e.preventDefault()
  }

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      // Build the messages payload. For the first user message, prepend
      // a context exchange so the model has builder context.
      let apiMessages: Message[]
      if (messages.length === 0) {
        apiMessages = [
          { role: 'user', content: context },
          { role: 'assistant', content: 'Understood. I have the full context for this builder. How can I help you refine it?' },
          userMsg,
        ]
      } else {
        apiMessages = [
          { role: 'user', content: context },
          { role: 'assistant', content: 'Understood. I have the full context for this builder. How can I help you refine it?' },
          ...updated,
        ]
      }

      const res = await fetch('/api/sa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, tool }),
      })

      if (!res.ok) throw new Error('Chat request failed')

      const data = await res.json()
      const assistantMsg: Message = { role: 'assistant', content: data.content ?? data.message ?? '' }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="border-t border-white/10 bg-white/[0.02]">
      {/* Message history */}
      {messages.length > 0 && (
        <div ref={scrollRef} className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap
                  ${msg.role === 'user'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-300'
                  }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resize handle — drag up to expand */}
      <div
        className="flex justify-center py-1.5 cursor-ns-resize group select-none"
        onMouseDown={handleResizeStart}
      >
        <div className="w-8 h-1 rounded-full bg-white/10 group-hover:bg-cyan-500/40 transition-colors" />
      </div>

      {/* Input area */}
      <div className="px-4 pb-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? `Ask a follow-up about this ${tool}...`}
            style={{ height: inputHeight }}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2
                       text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50
                       transition-colors"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-sherpa
                       text-white hover:bg-[#005068] disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
