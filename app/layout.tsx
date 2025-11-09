import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LiveKitProvider } from "@/components/livekit/LiveKitProvider"
import { Toaster } from '@/components/ui/sonner';
import SessionLayout from "./session-layout"
import { LanguageProvider } from "@/lib/contexts/language-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spark AI Chatbot",
  description: "支持文本、语音、文档的智能聊天助手",
  generator: 'vision-liao'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <LanguageProvider>
          <SessionLayout>
            <LiveKitProvider>
              {children}
            </LiveKitProvider>
          </SessionLayout>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  )
}
