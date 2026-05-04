import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Q-Intel | Qumulo Sales Intelligence',
  description: 'Account research, stakeholder mapping, and displacement intelligence for the Qumulo commercial Southwest territory.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-qumulo-ink min-h-screen antialiased">{children}</body>
    </html>
  )
}
