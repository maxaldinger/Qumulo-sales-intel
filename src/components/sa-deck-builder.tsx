'use client'

import { useState } from 'react'
import { Presentation, Sparkles, RefreshCw, Copy, Check, ChevronDown, ChevronUp, StickyNote } from 'lucide-react'

interface Slide {
  title: string
  content: string
  speaker_notes: string
}

const DECK_TYPES = [
  { value: 'prospect', label: 'Prospect Deck', description: 'First meeting, company overview, value proposition' },
  { value: 'discovery', label: 'Discovery Deck', description: 'Discovery call framework, qualifying questions' },
  { value: 'proposal', label: 'Proposal Deck', description: 'Solution proposal, pricing, implementation plan' },
  { value: 'qbr', label: 'QBR Deck', description: 'Quarterly business review, usage metrics, roadmap' },
  { value: 'competitive', label: 'Competitive Deck', description: 'Competitive positioning, differentiation, win themes' },
]

interface Props {
  dealName: string | null
}

export default function SaDeckBuilder({ dealName }: Props) {
  const [mode, setMode] = useState<'input' | 'slides'>('input')
  const [deckType, setDeckType] = useState('prospect')
  const [notes, setNotes] = useState('')
  const [slides, setSlides] = useState<Slide[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedNotes, setExpandedNotes] = useState<number | null>(null)

  const selectedType = DECK_TYPES.find(dt => dt.value === deckType)

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const prompt = `Generate a ${selectedType?.label || deckType} presentation deck for ${dealName || 'a prospect'}.

Deck type: ${deckType}
Context/notes: ${notes || 'No additional notes provided.'}

Create 8-12 slides. For each slide provide a title, content (bullet points, concise, presentation-style), and speaker_notes (talking points for the presenter).

CRITICAL: Return ONLY a raw JSON array. No markdown fences. No backticks. No preamble text. No explanation. Start your response with [ and end with ].

Format: [{"title":"...","content":"...","speaker_notes":"..."}]`

      const r = await fetch('/api/sa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          tool: 'general',
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to generate deck')

      let content = d.message || d.response || ''
      // Strip markdown fences if present
      const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenceMatch) content = fenceMatch[1]
      content = content.trim()
      // Find the JSON array in the response
      const arrStart = content.indexOf('[')
      const arrEnd = content.lastIndexOf(']')
      if (arrStart === -1 || arrEnd === -1 || arrEnd <= arrStart) {
        throw new Error('Could not find slide array in response')
      }
      const jsonStr = content.slice(arrStart, arrEnd + 1)

      const parsed = JSON.parse(jsonStr)
      setSlides(
        parsed.map((s: any) => ({
          title: s.title || '',
          content: s.content || '',
          speaker_notes: s.speaker_notes || '',
        }))
      )
      setMode('slides')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const copyAll = async () => {
    const text = slides
      .map(
        (s, i) =>
          `--- SLIDE ${i + 1}: ${s.title} ---\n\n${s.content}\n\n[Speaker Notes]\n${s.speaker_notes}`
      )
      .join('\n\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const copySlide = async (slide: Slide) => {
    const text = `${slide.title}\n\n${slide.content}\n\n[Speaker Notes]\n${slide.speaker_notes}`
    await navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Deck Builder</h2>
        <p className="text-sm text-slate-400">
          Generate structured presentation slide content that you can copy into your deck tool.
        </p>
      </div>

      {mode === 'input' && (
        <div className="space-y-4">
          {/* Deck type selector */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Deck Type</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {DECK_TYPES.map(dt => (
                <button
                  key={dt.value}
                  onClick={() => setDeckType(dt.value)}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    deckType === dt.value
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <p className="text-sm font-medium">{dt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{dt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Context & Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any context: company details, pain points discussed, key stakeholders, industry..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 text-sm resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sherpa text-white font-medium text-sm hover:bg-[#005068] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Generating Slides...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Deck
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{error}</div>
      )}

      {mode === 'slides' && slides.length > 0 && (
        <div className="space-y-5">
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('input')}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
            >
              Edit Inputs
            </button>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-slate-500">{slides.length} slides</span>
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm hover:bg-cyan-500/20 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied All!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Slide cards */}
          <div className="space-y-4">
            {slides.map((slide, i) => (
              <div
                key={i}
                className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden"
              >
                {/* Slide header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                  <span className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-xs text-cyan-400 font-bold">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-white flex-1">{slide.title}</h3>
                  <button
                    onClick={() => copySlide(slide)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-colors"
                    title="Copy slide"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Slide content */}
                <div className="px-5 py-4">
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {slide.content}
                  </div>
                </div>

                {/* Speaker notes (collapsible) */}
                {slide.speaker_notes && (
                  <div className="border-t border-white/5">
                    <button
                      onClick={() => setExpandedNotes(expandedNotes === i ? null : i)}
                      className="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-slate-500 font-medium">Speaker Notes</span>
                      {expandedNotes === i ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-500 ml-auto" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 ml-auto" />
                      )}
                    </button>
                    {expandedNotes === i && (
                      <div className="px-5 pb-4">
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {slide.speaker_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
