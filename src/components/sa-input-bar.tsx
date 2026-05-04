'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import DescriptionSelect from './sa-description-select'

/* ── Types ──────────────────────────────────────────────── */

export type Tool =
  | 'email'
  | 'lou'
  | 'objections'
  | 'threading'
  | 'proposal'
  | 'fit'
  | 'deck'
  | 'meddpicc'
  | 'general'

export type Tone =
  | 'Direct and confident'
  | 'Consultative and warm'
  | 'Formal and professional'
  | 'Casual and conversational'

export type Methodology =
  | 'MEDDPICC'
  | 'Challenger Sale'
  | 'SPIN Selling'
  | 'Solution Selling'
  | 'None / Custom'

export interface StagedImage {
  file: File
  preview: string
}

/* ── Constants ──────────────────────────────────────────── */

const TOOLS: { id: Tool; label: string; color: string }[] = [
  { id: 'general', label: 'Ask Anything', color: '#9AA3B0' },
  { id: 'email', label: 'Email', color: '#10B981' },
  { id: 'lou', label: 'LOU', color: '#3B82F6' },
  { id: 'fit', label: 'Product Fit', color: '#06B6D4' },
  { id: 'objections', label: 'Objections', color: '#EF4444' },
  { id: 'threading', label: 'Threading', color: '#8B5CF6' },
  { id: 'proposal', label: 'Proposal', color: '#EC4899' },
  { id: 'deck', label: 'Deck', color: '#7C3AED' },
  { id: 'meddpicc', label: 'MEDDPICC', color: '#F59E0B' },
]

const TONE_OPTIONS = [
  {
    value: 'Direct and confident',
    label: 'Direct and confident',
    shortLabel: 'Direct',
    description: 'Short sentences, no hedging, strong CTAs',
  },
  {
    value: 'Consultative and warm',
    label: 'Consultative and warm',
    shortLabel: 'Consultative',
    description: 'Question-led, empathetic, collaborative',
  },
  {
    value: 'Formal and professional',
    label: 'Formal and professional',
    shortLabel: 'Formal',
    description: 'Structured, precise, no contractions',
  },
  {
    value: 'Casual and conversational',
    label: 'Casual and conversational',
    shortLabel: 'Casual',
    description: 'Sounds human, short, punchy',
  },
]

const METHODOLOGY_OPTIONS = [
  {
    value: 'MEDDPICC',
    label: 'MEDDPICC',
    shortLabel: 'MEDDPICC',
    description: 'Probes for Metrics, Economic Buyer, etc.',
  },
  {
    value: 'Challenger Sale',
    label: 'Challenger Sale',
    shortLabel: 'Challenger',
    description: 'Teach, Tailor, Take Control',
  },
  {
    value: 'SPIN Selling',
    label: 'SPIN Selling',
    shortLabel: 'SPIN',
    description: 'Situation \u2192 Problem \u2192 Implication \u2192 Need-Payoff',
  },
  {
    value: 'Solution Selling',
    label: 'Solution Selling',
    shortLabel: 'Solution',
    description: 'Diagnose pain, build vision, map solution',
  },
  {
    value: 'None / Custom',
    label: 'None / Custom',
    shortLabel: 'Custom',
    description: 'No framework, general principles',
  },
]

/* ── Component ──────────────────────────────────────────── */

interface Props {
  onSend: (text: string, tool: Tool) => void
  onToolChange: (tool: Tool) => void
  activeTool: Tool
  disabled?: boolean
  tone: Tone
  methodology: Methodology
  onToneChange: (tone: Tone) => void
  onMethodologyChange: (methodology: Methodology) => void
  hideTextarea?: boolean
}

export default function SAInputBar({
  onSend,
  onToolChange,
  activeTool,
  disabled,
  tone,
  methodology,
  onToneChange,
  onMethodologyChange,
  hideTextarea,
}: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* Auto-resize textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [text])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed, activeTool)
    setText('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* ── Tool pills ── */
  const toolPills = (
    <div className="flex flex-wrap gap-2">
      {TOOLS.map((t) => {
        const isActive = activeTool === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToolChange(t.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer
              ${isActive
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300'
              }`}
            style={isActive ? {} : undefined}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: t.color }} />
            {t.label}
          </button>
        )
      })}
    </div>
  )

  /* ── Selectors row ── */
  const selectors = (
    <div className="flex items-end gap-4">
      <DescriptionSelect
        label="Tone"
        value={tone}
        options={TONE_OPTIONS}
        onChange={(v) => onToneChange(v as Tone)}
      />
      <DescriptionSelect
        label="Methodology"
        value={methodology}
        options={METHODOLOGY_OPTIONS}
        onChange={(v) => onMethodologyChange(v as Methodology)}
      />
    </div>
  )

  /* ── hideTextarea mode (used beneath builders) ── */
  if (hideTextarea) {
    return (
      <div className="border-t border-white/10 px-4 py-3 space-y-3">
        {toolPills}
        {selectors}
      </div>
    )
  }

  /* ── Full input bar ── */
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      {/* Textarea + send */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you need help with?"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-white text-sm placeholder-slate-500
                     focus:outline-none leading-relaxed"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-sherpa text-white
                     hover:bg-[#005068] disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                     cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Tool pills */}
      {toolPills}

      {/* Tone + methodology selectors */}
      {selectors}
    </div>
  )
}
