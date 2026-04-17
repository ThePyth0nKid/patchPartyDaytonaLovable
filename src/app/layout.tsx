import './globals.css'
import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'PatchParty — Five patches. One click. Zero AI slop.',
  description:
    'Drop a GitHub issue, get five adversarial Claude agents writing five pull requests in parallel Daytona sandboxes. You pick the one you would ship.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    title: 'PatchParty — Five patches. One click. Zero AI slop.',
    description:
      'Five adversarial Claude agents race to implement your GitHub issue. You pick the winner. One click to PR.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
