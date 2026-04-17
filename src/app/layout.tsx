import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PatchParty — Choose your patch, skip the vibe',
  description:
    'Five parallel AI agents implement your GitHub issue. You pick the winner.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  )
}
