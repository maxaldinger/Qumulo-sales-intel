import type { Metadata } from 'next'
import Script from 'next/script'
import './globals.css'

export const metadata: Metadata = {
  title: 'Q-Intel | Qumulo Sales Intelligence',
  description: 'Account research, stakeholder mapping, and displacement intelligence for the Qumulo commercial Southwest territory.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Pre-hydration theme initializer — runs before React renders so
            the page paints in the user's saved theme without a flash. */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
