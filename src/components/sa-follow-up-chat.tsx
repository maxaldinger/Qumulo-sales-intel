'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Maximize2, Minimize2, X } from 'lucide-react'

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
  const [historyHeight, setHistoryHeight] = useState(420)
  const [expanded, setExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ y: 0, height: 0 })

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Lock body scroll while expanded modal is open
  useEffect(() => {
    if (expanded) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
      window.addEventListener('keydown', onKey)
      return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
    }
  }, [expanded])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStart.current.y - e.clientY
      setHistoryHeight(Math.max(160, Math.min(900, dragStart.current.height + delta)))
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
    dragStart.current = { y: e.clientY, height: historyHeight }
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
      const apiMessages: Message[] = [
        { role: 'user', content: context },
        { role: 'assistant', content: 'Understood. I have the full context for this builder. How can I help you refine it?' },
        ...updated,
      ]

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

  const Bubble = ({ msg }: { msg: Message }) => (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
  )

  const TypingDots = () => (
    <div className="flex justify-start">
      <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )

  // ── Expanded full-screen overlay ────────────────────────────────
  if (expanded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/70 backdrop-blur-sm p-4 sm:p-8">
        <div className="w-full max-w-5xl mx-auto flex flex-col rounded-xl border border-white/10 bg-[#0f1729] shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Follow-up Chat</span>
              <span className="text-xs text-slate-400">{tool}{dealName ? ` · ${dealName}` : ''}</span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Collapse (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-12">
                Ask a follow-up about this {tool}. Press Esc or the X to collapse.
              </p>
            )}
            {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
            {loading && <TypingDots />}
          </div>

          {/* Input */}
          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder ?? `Ask a follow-up about this ${tool}...`}
                rows={3}
                className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2
                           text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50
                           transition-colors leading-relaxed"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="flex items-center justify-center w-10 h-10 rounded-lg bg-sherpa
                           text-white hover:bg-[#005068] disabled:opacity-40 disabled:cursor-not-allowed
                           transition-colors cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Enter to send · Shift+Enter for newline · Esc to collapse</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Inline collapsed view ────────────────────────────────────────
  return (
    <div className="border-t border-white/10 bg-white/[0.02] rounded-b-xl">
      {/* Header bar with expand toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
        <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Follow-up Chat</span>
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          title="Expand chat to full screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          Expand
        </button>
      </div>

      {/* Resize handle */}
      <div
        className="flex justify-center py-1 cursor-ns-resize group select-none border-b border-white/5"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <div className="w-10 h-1 rounded-full bg-white/10 group-hover:bg-cyan-500/40 transition-colors" />
      </div>

      {/* Message history */}
      <div
        ref={scrollRef}
        className="overflow-y-auto px-4 py-3 space-y-3"
        style={{ height: historyHeight }}
      >
        {messages.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-8">
            Ask a follow-up about this {tool}. Drag the handle above to resize, or click Expand for a full view.
          </p>
        )}
        {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
        {loading && <TypingDots />}
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? `Ask a follow-up about this ${tool}...`}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2
                       text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50
                       transition-colors leading-relaxed"
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-sherpa
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
