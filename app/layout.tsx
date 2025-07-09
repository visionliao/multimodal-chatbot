import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LiveKitProvider } from "@/components/livekit/LiveKitProvider"
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Spark AI Chatbot",
  description: "支持文本、语音、文档的智能聊天助手",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>
        <LiveKitProvider>
          {children}
        </LiveKitProvider>
        <Toaster />
      </body>
    </html>
  )
}
