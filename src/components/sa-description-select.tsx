'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
  shortLabel: string
  description: string
}

interface Props {
  value: string
  options: Option[]
  onChange: (value: string) => void
  label: string
}

export default function DescriptionSelect({ value, options, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-transparent
                   text-sm text-slate-400 hover:border-white/20 transition-colors cursor-pointer"
      >
        <span>{selected?.shortLabel ?? value}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-72 rounded-xl border border-white/10 bg-[#0d1520]
                     shadow-lg shadow-black/40 overflow-hidden"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={`w-full text-left px-4 py-3 transition-colors cursor-pointer
                  ${isSelected ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>
                    {opt.label}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {opt.description}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
