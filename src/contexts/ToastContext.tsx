"use client"

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export type Toast = {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'info' | 'warning'
}

type ToastContextType = {
  toasts: Toast[]
  showToast: (t: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = String(Date.now())
    const toast = { id, ...t }
    setToasts((s) => [...s, toast])
    // auto remove
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 5000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((s) => s.filter((t) => t.id !== id))
  }, [])

  const value = useMemo(() => ({ toasts, showToast, removeToast }), [toasts, showToast, removeToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`max-w-sm w-full p-3 rounded shadow-md border ${t.type === 'success' ? 'bg-green-50 border-green-200' : t.type === 'error' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            {t.title && <div className="font-semibold text-sm mb-1">{t.title}</div>}
            {t.description && <div className="text-sm text-gray-700">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export default ToastContext
