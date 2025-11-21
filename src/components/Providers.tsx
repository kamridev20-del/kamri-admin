"use client"

import AuthGuard from '@/components/AuthGuard'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import React from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AuthGuard>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthGuard>
      </ThemeProvider>
    </AuthProvider>
  )
}
