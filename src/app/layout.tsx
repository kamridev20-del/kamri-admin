import Providers from '@/components/Providers'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/theme.css'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KAMRI Admin - Dashboard Dropshipping',
  description: 'Dashboard administrateur pour la plateforme KAMRI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  )
}