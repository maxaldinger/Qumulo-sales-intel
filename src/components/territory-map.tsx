'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapAccount {
  company: string
  lat: number
  lng: number
  est_acv: string
  vertical: string
  vertical_id: string
  hq_city: string
  hq_state: string
}

interface Props {
  accounts: MapAccount[]
  /** Set of company names already in the Account Planning tab. */
  planAccountNames?: Set<string>
  /** Called when the user clicks the popup's "Add to Plan" button. */
  onAddToPlan?: (company: string) => void
}

const COLORS: Record<string, string> = {
  finserv: '#3b82f6',
  healthcare: '#10b981',
  manufacturing: '#eab308',
  energy: '#f97316',
  government: '#14b8a6',
  technology: '#8b5cf6',
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default function TerritoryMap({ accounts, planAccountNames, onAddToPlan }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  // Stash the latest callback in a ref so the leaflet click handler always
  // fires the current closure even if React re-renders between mounts.
  const onAddRef = useRef(onAddToPlan)
  onAddRef.current = onAddToPlan
  const planSetRef = useRef(planAccountNames ?? new Set<string>())
  planSetRef.current = planAccountNames ?? new Set<string>()

  useEffect(() => {
    if (!ref.current) return

    const map = L.map(ref.current, { center: [39.8, -98.6], zoom: 4 })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CARTO',
      maxZoom: 18,
    }).addTo(map)

    const valid = accounts.filter(a => a.lat && a.lng)
    valid.forEach(a => {
      const color = COLORS[a.vertical_id] || '#94a3b8'
      const inPlan = planSetRef.current.has(a.company)
      const safeName = escapeHtml(a.company)
      const safeLoc = escapeHtml(`${a.hq_city || ''}${a.hq_city && a.hq_state ? ', ' : ''}${a.hq_state || ''}`)
      const safeAcv = escapeHtml(a.est_acv || '')

      const planBtnHtml = inPlan
        ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:500;background:rgba(16,185,129,0.1);color:#6ee7b7;border:1px solid rgba(16,185,129,0.2)">In Plan</span>`
        : `<button data-add-to-plan="${safeName}" type="button" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:500;color:#67e8f9;border:1px solid rgba(34,211,238,0.3);background:transparent;cursor:pointer;font-family:inherit">+ Add to Plan</button>`

      const popupHtml = `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.5;min-width:180px">
        <strong style="display:block;margin-bottom:2px">${safeName}</strong>
        <span style="color:#94a3b8;font-size:11px">${safeLoc}</span><br/>
        <span style="color:#34d399;font-family:ui-monospace,monospace">${safeAcv}</span>
        <span style="margin-left:6px;padding:1px 6px;border-radius:9999px;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;background:rgba(245,158,11,0.1);color:#fcd34d;border:1px solid rgba(245,158,11,0.3)">hypothesis</span>
        <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08)">${planBtnHtml}</div>
      </div>`

      L.circleMarker([a.lat, a.lng], {
        radius: 10,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.85,
      })
        .bindPopup(popupHtml, { className: 'territory-popup', closeButton: false })
        .addTo(map)
    })

    if (valid.length > 1) {
      map.fitBounds(
        L.latLngBounds(valid.map(a => [a.lat, a.lng] as [number, number])),
        { padding: [40, 40], maxZoom: 6 }
      )
    }

    // Event delegation for the in-popup Add-to-Plan button.
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const btn = target?.closest?.('[data-add-to-plan]') as HTMLButtonElement | null
      if (!btn) return
      const company = btn.getAttribute('data-add-to-plan')
      if (!company) return
      e.preventDefault()
      e.stopPropagation()
      onAddRef.current?.(company)
      // Mark visually until the next render; the parent re-render with the
      // updated planAccountNames prop will redraw the popup content.
      btn.disabled = true
      btn.textContent = 'Added ✓'
      btn.style.opacity = '0.7'
    }
    ref.current.addEventListener('click', onClick)

    return () => {
      ref.current?.removeEventListener('click', onClick)
      map.remove()
    }
  }, [accounts])

  return (
    <>
      <style>{`
        .territory-popup .leaflet-popup-content-wrapper {
          background: #1e293b !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          border-radius: 8px !important;
          color: #fff !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
        }
        .territory-popup .leaflet-popup-content { margin: 10px 14px !important; }
        .territory-popup .leaflet-popup-tip { background: #1e293b !important; }
        .territory-popup [data-add-to-plan]:hover {
          background: rgba(34, 211, 238, 0.1) !important;
          color: #a5f3fc !important;
        }
        .leaflet-container { background: #0a0e1a !important; }
      `}</style>
      <div ref={ref} className="w-full h-[500px] rounded-xl overflow-hidden border border-white/10" />
    </>
  )
}
