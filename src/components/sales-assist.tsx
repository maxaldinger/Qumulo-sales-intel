'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, ArrowDownNarrowWide, RefreshCw } from 'lucide-react'
import SAInputBar, { type Tool, type Tone, type Methodology } from './sa-input-bar'
import SALouBuilder from './sa-lou-builder'
import SAThreadingBuilder from './sa-threading-builder'
import SAProposalBuilder from './sa-proposal-builder'
import SAProductFitBuilder from './sa-product-fit-builder'
import SADeckBuilder from './sa-deck-builder'
import SAMeddpiccBuilder from './sa-meddpicc-builder'

/* ── Types ──────────────────────────────────────────────── */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tool: Tool
  tone: Tone
  methodology: Methodology
}

/* ── Quick-action chips shown on the welcome screen ──── */

const QUICK_ACTIONS = [
  { label: 'Draft a cold email', tool: 'email' as Tool, prompt: 'Draft a cold outreach email for a new prospect.' },
  { label: 'Handle an objection', tool: 'objections' as Tool, prompt: 'Help me handle a pricing objection.' },
  { label: 'Ask anything', tool: 'general' as Tool, prompt: '' },
]

/* ── Helpers ─────────────────────────────────────────────── */

let _id = 0
function uid() {
  return `msg-${Date.now()}-${++_id}`
}

const TOOL_COLORS: Record<string, string> = {
  general: '#9AA3B0',
  email: '#10B981',
  lou: '#3B82F6',
  fit: '#06B6D4',
  objections: '#EF4444',
  threading: '#8B5CF6',
  proposal: '#EC4899',
  deck: '#7C3AED',
  meddpicc: '#F59E0B',
}

const TOOL_LABELS: Record<string, string> = {
  general: 'Ask Anything',
  email: 'Email',
  lou: 'LOU',
  fit: 'Product Fit',
  objections: 'Objections',
  threading: 'Threading',
  proposal: 'Proposal',
  deck: 'Deck',
  meddpicc: 'MEDDPICC',
}

/* Chat-based tools render the message view; builder tools render their builder */
const CHAT_TOOLS: Tool[] = ['email', 'objections', 'general']
const BUILDER_TOOLS: Tool[] = ['lou', 'threading', 'proposal', 'fit', 'deck', 'meddpicc']

/* ── Component ──────────────────────────────────────────── */

export default function SalesAssist() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTool, setActiveTool] = useState<Tool>('general')
  const [tone, setTone] = useState<Tone>('Direct and confident')
  const [methodology, setMethodology] = useState<Methodology>('MEDDPICC')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  /* ── Send a chat message ── */
  const sendMessage = async (text: string, tool: Tool) => {
    if (!text.trim() || loading) return

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      tool,
      tone,
      methodology,
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const apiMessages = updated.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/sa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          tool,
          tone,
          methodology,
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const data = await res.json()

      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: data.content ?? data.message ?? '',
        tool,
        tone,
        methodology,
      }

      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          tool,
          tone,
          methodology,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  /* ── Copy helper ── */
  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  /* ── Regenerate last assistant message ── */
  const handleRegenerate = () => {
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user')
    if (lastUserIdx === -1) return
    const idx = messages.length - 1 - lastUserIdx
    const lastUser = messages[idx]
    // Remove everything after the last user message and re-send
    setMessages(messages.slice(0, idx))
    sendMessage(lastUser.content, lastUser.tool)
  }

  /* ── "Make it shorter" ── */
  const handleShorter = () => {
    sendMessage('Make the previous response shorter and more concise.', activeTool)
  }

  /* ── Handle tool change ── */
  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool)
  }

  /* ── Builder view ── */
  if (BUILDER_TOOLS.includes(activeTool)) {
    const builderProps = {
      tone,
      methodology,
      dealName: null as string | null,
    }

    return (
      <div className="flex flex-col h-full">
        {/* Top pill bar */}
        <div className="flex-shrink-0">
          <SAInputBar
            onSend={sendMessage}
            onToolChange={handleToolChange}
            activeTool={activeTool}
            disabled={loading}
            tone={tone}
            methodology={methodology}
            onToneChange={setTone}
            onMethodologyChange={setMethodology}
            hideTextarea
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTool === 'lou' && <SALouBuilder {...builderProps} />}
          {activeTool === 'threading' && <SAThreadingBuilder {...builderProps} />}
          {activeTool === 'proposal' && <SAProposalBuilder {...builderProps} />}
          {activeTool === 'fit' && <SAProductFitBuilder {...builderProps} />}
          {activeTool === 'deck' && <SADeckBuilder {...builderProps} />}
          {activeTool === 'meddpicc' && <SAMeddpiccBuilder {...builderProps} />}
        </div>

        {/* Bottom pill bar */}
        <div className="flex-shrink-0">
          <SAInputBar
            onSend={sendMessage}
            onToolChange={handleToolChange}
            activeTool={activeTool}
            disabled={loading}
            tone={tone}
            methodology={methodology}
            onToneChange={setTone}
            onMethodologyChange={setMethodology}
            hideTextarea
          />
        </div>
      </div>
    )
  }

  /* ── Chat view (email / objections / general) ── */
  const showWelcome = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Top pill bar */}
      <div className="flex-shrink-0">
        <SAInputBar
          onSend={sendMessage}
          onToolChange={handleToolChange}
          activeTool={activeTool}
          disabled={loading}
          tone={tone}
          methodology={methodology}
          onToneChange={setTone}
          onMethodologyChange={setMethodology}
          hideTextarea
        />
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        {showWelcome ? (
          /* ── Welcome screen ── */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <h2 className="text-2xl font-bold text-white mb-2">What do you need?</h2>
            <p className="text-slate-400 text-sm mb-8">
              Your AI sales engineer &mdash; built for reps, by a rep.
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {QUICK_ACTIONS.map((qa) => (
                <button
                  key={qa.label}
                  type="button"
                  onClick={() => {
                    setActiveTool(qa.tool)
                    if (qa.prompt) sendMessage(qa.prompt, qa.tool)
                  }}
                  className="px-4 py-2 rounded-full border border-white/10 text-sm text-slate-400
                             hover:border-cyan-500/50 hover:text-cyan-400 transition-colors cursor-pointer"
                >
                  {qa.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Message bubbles ── */
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-white/5 border border-white/10 text-slate-300'
                    }`}
                >
                  {/* Tool badge + meta on assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 text-[10px] uppercase tracking-wider text-slate-500">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: TOOL_COLORS[msg.tool] || '#9AA3B0' }}
                      />
                      <span>{TOOL_LABELS[msg.tool] || msg.tool}</span>
                      <span className="text-slate-600">|</span>
                      <span>{msg.tone.split(' ')[0]}</span>
                      <span className="text-slate-600">|</span>
                      <span>{msg.methodology.split(' ')[0]}</span>
                    </div>
                  )}

                  {msg.content}

                  {/* Action buttons on assistant messages */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300
                                   transition-colors cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <><Check className="w-3 h-3" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3" /> Copy</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleShorter}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300
                                   transition-colors cursor-pointer"
                      >
                        <ArrowDownNarrowWide className="w-3 h-3" /> Shorter
                      </button>
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300
                                   transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" /> Regenerate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
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
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 px-4 pb-4">
        <SAInputBar
          onSend={sendMessage}
          onToolChange={handleToolChange}
          activeTool={activeTool}
          disabled={loading}
          tone={tone}
          methodology={methodology}
          onToneChange={setTone}
          onMethodologyChange={setMethodology}
        />
      </div>
    </div>
  )
}
