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
    }
  }
}

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => void
  t: typeof translations.en
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
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