'use client'

import { ReactNode } from 'react'
import { ToastProvider } from "@/src/components/ui/Toast";

interface ClientLayoutProps {
  children: ReactNode
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  )
}
