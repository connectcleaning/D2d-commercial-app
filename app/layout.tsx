import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'D2D Commercial Leads',
  description: 'Capture commercial cleaning leads fast, in the field.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="bg-slate-900 min-h-screen text-slate-100">
        {children}
      </body>
    </html>
  )
}
