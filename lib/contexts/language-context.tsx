"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react'

export type Language = 'en' | 'zh'

export const translations = {
  en: {
    title: "Hi, I'm your Spark AI Assistant",
    subtitle: "Feel free to ask me any questions about Spark Apartments",
    features: {
      customerService: {
        title: "CS",
        description: "Customer Service",
        defaultMessage: "Hello, I'm a customer"
      },
      operations: {
        title: "OP",
        description: "Operations Management",
        defaultMessage: "Hello, I'm from the operations team"
      },
      assetManagement: {
        title: "AM",
        description: "Asset Management Team",
        defaultMessage: "Hello, I'm from the asset management team"
      }
    },
    startChatButton: "Start Chat",
    communicationText: "You can communicate with me through text, voice, or by uploading documents",
    presetQuestionsTitle: "You can ask me:",
    presetQuestions: [
      "What are the rental prices for Spark apartments?",
      "What types of apartment units are available?",
      "Is the transportation around the apartment convenient?",
      "What procedures are required for move-in?"
    ],
    sidebar: {
      newChatButton: "New Chat",
      expandTooltip: "Expand sidebar",
      collapseTooltip: "Collapse sidebar",
      today: "Today",
      last30Days: "Last 30 days",
      last6Months: "Last 6 months",
      noChats: "No chat history",
      rename: "Rename",
      delete: "Delete",
      loginButton: "Login",
      logoutButton: "Logout",
      editNicknameTooltip: "Edit nickname",
      logoutTooltip: "Logout"
    },
    dialogs: {
      renameChat: {
        title: "Rename Chat",
        label: "Chat Title",
        placeholder: "Enter new chat title",
        cancel: "Cancel",
        confirm: "Confirm"
      },
      deleteChat: {
        title: "Confirm Delete",
        description: "Are you sure you want to delete this chat? This action cannot be undone.",
        cancel: "Cancel",
        delete: "Delete"
      },
      editNickname: {
        title: "Edit Nickname",
        currentLabel: "Current Nickname",
        noNickname: "No nickname yet",
        newLabel: "New Nickname",
        placeholder: "Enter new nickname",
        confirm: "Confirm"
      }
    },
    chat: {
      header: {
        aiAssistant: "AI Assistant",
        status: {
          offline: "Offline",
          connecting: "Connecting...",
          online: "Online",
          features: "Supports text, voice, documents"
        },
        backToWelcome: "Back to welcome screen",
        loggedInAs: "Logged in as"
      },
      input: {
        placeholder: "Type your message... (Shift+Enter for new line)",
        waitingForReply: "Waiting for AI response...",
        voiceRecording: "In voice conversation...",
        sendButton: "Send"
      },
      voice: {
        recordingHint: "🔴 Voice conversation in progress... Click stop to end",
        thinking: "AI is thinking...",
        connectingError: "Connection issue detected, attempting auto-reconnect...",
        notReadyToChat: "Connecting to server, please wait...",
        micNotFound: "No microphone detected, please connect a microphone device",
        micAuthFailed: "Microphone authorization failed",
        micCloseFailed: "Failed to close microphone",
        micOpenFailed: "Failed to open microphone"
      },
      fileUpload: {
        sizeLimit: "File size exceeds limit",
        sizeLimitDesc: "Please select a file no larger than 10MB",
        uploadFailed: "File upload failed",
        uploadFailedDesc: "Server returned error",
        networkError: "Network connection error",
        cancel: "Cancel"
      },
      message: {
        timeoutError: "Sorry, the response timed out, please try again later."
      },
      alerts: {
        renameFailed: "Rename failed",
        deleteFailed: "Delete failed",
        nicknameUpdateFailed: "Nickname update failed"
      },
      defaults: {
        newChatTitle: "New Chat",
        devicePermissionCheck: "Please check device permissions"
      },
      aiGreeting: "Hello, I am Spark AI, your personal AI assistant. How can I help you?",
      loading: "Loading user session..."
    }
  },
  zh: {
    title: "Hi，我是您的 Spark AI 助手",
    subtitle: "有任何关于 Spark 公寓的问题都可以咨询我",
    features: {
      customerService: {
        title: "Customer Service",
        description: "客户服务",
        defaultMessage: "你好，我是客户"
      },
      operations: {
        title: "Operations",
        description: "运营管理",
        defaultMessage: "你好，我是运营团队"
      },
      assetManagement: {
        title: "Asset Management",
        description: "资管团队",
        defaultMessage: "你好，我是资管团队"
      }
    },
    startChatButton: "开始对话",
    communicationText: "您可以通过文字、语音或上传文档的方式与我交流",
    presetQuestionsTitle: "您可以这样问我：",
    presetQuestions: [
      "Spark公寓的租金价格如何？",
      "有哪些户型可以选择？",
      "公寓周边的交通便利吗？",
      "入住需要什么手续？"
    ],
    sidebar: {
      newChatButton: "新建对话",
      expandTooltip: "展开聊天记录",
      collapseTooltip: "收起聊天记录",
      today: "当天",
      last30Days: "最近30天",
      last6Months: "最近半年",
      noChats: "暂无聊天记录",
      rename: "重命名",
      delete: "删除",
      loginButton: "登录",
      logoutButton: "退出登录",
      editNicknameTooltip: "修改昵称",
      logoutTooltip: "退出登录"
    },
    dialogs: {
      renameChat: {
        title: "重命名对话",
        label: "对话标题",
        placeholder: "请输入新的对话标题",
        cancel: "取消",
        confirm: "确认"
      },
      deleteChat: {
        title: "确认删除",
        description: "您确定要删除这个对话吗？此操作无法撤销。",
        cancel: "取消",
        delete: "删除"
      },
      editNickname: {
        title: "修改昵称",
        currentLabel: "当前昵称",
        noNickname: "还没有昵称",
        newLabel: "新昵称",
        placeholder: "请输入新昵称",
        confirm: "确定"
      }
    },
    chat: {
      header: {
        aiAssistant: "AI助手",
        status: {
          offline: "离线",
          connecting: "正在连接...",
          online: "在线",
          features: "支持文本、语音、文档"
        },
        backToWelcome: "回到欢迎界面",
        loggedInAs: "已登录为"
      },
      input: {
        placeholder: "输入消息...（Shift+Enter换行）",
        waitingForReply: "等待AI回复中...",
        voiceRecording: "正在语音对话中...",
        sendButton: "发送"
      },
      voice: {
        recordingHint: "🔴 正在语音对话...点击停止按钮结束本次语音对话",
        thinking: "AI正在思考...",
        connectingError: "检测到数据发送失败，正在尝试自动重连...",
        notReadyToChat: "正在连接服务器，请稍候...",
        micNotFound: "未检测到麦克风，请插入麦克风设备后重试",
        micAuthFailed: "麦克风授权失败",
        micCloseFailed: "关闭麦克风失败",
        micOpenFailed: "麦克风授权失败"
      },
      fileUpload: {
        sizeLimit: "文件大小超出限制",
        sizeLimitDesc: "请选择不超过 10MB 的文件",
        uploadFailed: "文件上传失败",
        uploadFailedDesc: "服务器返回错误",
        networkError: "网络连接错误",
        cancel: "取消"
      },
      message: {
        timeoutError: "抱歉，回复超时了，请稍后重试。"
      },
      alerts: {
        renameFailed: "重命名失败",
        deleteFailed: "删除失败",
        nicknameUpdateFailed: "昵称修改失败"
      },
      defaults: {
        newChatTitle: "新对话",
        devicePermissionCheck: "请检查设备权限"
      },
      aiGreeting: "您好，我是Spark AI 您的专属AI助理，请问有什么可以帮您？",
      loading: "正在加载用户会话..."
    }
  }
}

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: typeof translations.en
  locale: string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  const locale = language === 'zh' ? 'zh-CN' : 'en-US'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language], locale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}