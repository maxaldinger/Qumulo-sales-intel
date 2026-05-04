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

const COLORS: Record<string, string> = {
  finserv: '#3b82f6',
  healthcare: '#10b981',
  manufacturing: '#eab308',
  energy: '#f97316',
  government: '#14b8a6',
  technology: '#8b5cf6',
}

export default function TerritoryMap({ accounts }: { accounts: MapAccount[] }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return

    const map = L.map(ref.current, { center: [39.8, -98.6], zoom: 4 })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '\u00a9 CARTO',
      maxZoom: 18,
    }).addTo(map)

    const valid = accounts.filter(a => a.lat && a.lng)
    valid.forEach(a => {
      const color = COLORS[a.vertical_id] || '#94a3b8'
      L.circleMarker([a.lat, a.lng], {
        radius: 10,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        fillOpacity: 0.85,
      })
        .bindTooltip(
          `<div style="font-family:ui-sans-serif,system-ui,sans-serif;font-size:12px;line-height:1.5">
            <strong>${a.company}</strong><br/>
            <span style="color:#94a3b8">${a.hq_city}, ${a.hq_state}</span><br/>
            <span style="color:#34d399;font-family:ui-monospace,monospace">${a.est_acv}</span>
          </div>`,
          { direction: 'top', offset: [0, -8], className: 'territory-tooltip' }
        )
        .addTo(map)
    })

    if (valid.length > 1) {
      map.fitBounds(
        L.latLngBounds(valid.map(a => [a.lat, a.lng] as [number, number])),
        { padding: [40, 40], maxZoom: 6 }
      )
    }

    return () => { map.remove() }
  }, [accounts])

  return (
    <>
      <style>{`
        .territory-tooltip {
          background: #1e293b !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important;
          color: #fff !important;
        }
        .territory-tooltip::before {
          border-top-color: #1e293b !important;
        }
        .leaflet-container { background: #0a0e1a !important; }
      `}</style>
      <div ref={ref} className="w-full h-[500px] rounded-xl overflow-hidden border border-white/10" />
    </>
  )
}
