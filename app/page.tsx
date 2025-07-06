"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  User,
  Bot,
  LogIn,
  LogOut,
  MoreHorizontal,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AuthDialog } from "@/components/auth-dialog"
import { WelcomeScreen } from "@/components/welcome-screen"

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
  type: "text" | "file" | "audio"
  fileName?: string
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  lastMessage: string
  timestamp: Date
}

interface AppUser {
  id: string
  username: string
  phone?: string
  email?: string
}

export default function MultimodalChatbot() {
  // 基础状态 - 默认没有聊天记录
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)

  // 侧边栏收起/展开状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 对话框状态
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string>("")
  const [newTitle, setNewTitle] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 从localStorage恢复用户信息
  useEffect(() => {
    const savedUser = localStorage.getItem("chatbot_user")
    if (savedUser) {
      try {
        setAppUser(JSON.parse(savedUser))
      } catch (error) {
        console.error("Failed to parse saved user:", error)
        localStorage.removeItem("chatbot_user")
      }
    }
  }, [])

  // 获取当前聊天
  const currentChat = chats.find((chat) => chat.id === currentChatId)

  // 切换侧边栏收起/展开
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // 创建新聊天
  const createNewChat = () => {
    const newChatId = `chat_${Date.now()}`
    const newChat: Chat = {
      id: newChatId,
      title: "新对话",
      messages: [
        {
          id: `msg_${Date.now()}`,
          content: "您好！我是您的Spark AI助手，有任何关于Spark公寓的问题都可以咨询我。",
          sender: "bot",
          timestamp: new Date(),
          type: "text",
        },
      ],
      lastMessage: "",
      timestamp: new Date(),
    }

    setChats((prev) => [newChat, ...prev])
    setCurrentChatId(newChatId)
  }

  // 选择聊天
  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  // 发送消息
  const sendMessage = () => {
    if (!inputValue.trim() || !currentChatId) return

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    }

    // 更新聊天记录
    setChats((prev) =>
      prev.map((chat) => {
        if (chat.id === currentChatId) {
          const updatedMessages = [...chat.messages, newMessage]
          return {
            ...chat,
            messages: updatedMessages,
            lastMessage: inputValue,
            timestamp: new Date(),
            title: chat.title === "新对话" ? inputValue.slice(0, 30) : chat.title,
          }
        }
        return chat
      }),
    )

    setInputValue("")

    // 模拟AI回复
    setTimeout(() => {
      const botReply: Message = {
        id: `msg_${Date.now() + 1}`,
        content: "我收到了您的消息。这是一个模拟回复，在实际应用中会连接到AI服务。",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, botReply],
            }
          }
          return chat
        }),
      )
    }, 1000)
  }

  // 重命名聊天
  const renameChat = () => {
    if (!newTitle.trim() || !selectedChatId) return

    setChats((prev) => prev.map((chat) => (chat.id === selectedChatId ? { ...chat, title: newTitle.trim() } : chat)))

    setShowRenameDialog(false)
    setNewTitle("")
    setSelectedChatId("")
  }

  // 删除聊天
  const deleteChat = () => {
    if (!selectedChatId) return

    // 使用函数式更新，确保获取最新状态
    setChats((currentChats) => {
      // 过滤掉要删除的聊天
      const newChats = currentChats.filter((chat) => chat.id !== selectedChatId)

      // 如果删除的是当前选中的聊天，需要重新选择
      if (currentChatId === selectedChatId) {
        if (newChats.length === 0) {
          setCurrentChatId(null)
        } else {
          // 找到被删除聊天在原数组中的位置
          const deletedIndex = currentChats.findIndex((chat) => chat.id === selectedChatId)

          // 选择相邻的聊天
          let nextIndex = deletedIndex
          if (nextIndex >= newChats.length) {
            nextIndex = newChats.length - 1
          }

          const nextChatId = newChats[nextIndex]?.id
          setCurrentChatId(nextChatId || null)
        }
      }

      return newChats
    })

    // 关闭对话框并重置状态
    setShowDeleteDialog(false)
    setSelectedChatId("")
  }

  // 语音录制
  const toggleRecording = () => {
    if (!isRecording) {
      // 开始录音
      setIsRecording(true)
    } else {
      // 停止录音并发送消息
      setIsRecording(false)

      if (currentChatId) {
        // 模拟语音消息
        const voiceMessage: Message = {
          id: `msg_${Date.now()}`,
          content: "语音消息已录制完成",
          sender: "user",
          timestamp: new Date(),
          type: "audio",
        }

        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === currentChatId) {
              return {
                ...chat,
                messages: [...chat.messages, voiceMessage],
                lastMessage: "语音消息",
                timestamp: new Date(),
              }
            }
            return chat
          }),
        )
      }
    }
  }

  // 文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && currentChatId) {
      const fileMessage: Message = {
        id: `msg_${Date.now()}`,
        content: `已上传文件: ${file.name}`,
        sender: "user",
        timestamp: new Date(),
        type: "file",
        fileName: file.name,
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, fileMessage],
              lastMessage: `文件: ${file.name}`,
              timestamp: new Date(),
            }
          }
          return chat
        }),
      )

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  // 时间分组
  const getTimeGroup = (date: Date) => {
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 1) return "当天"
    if (diffDays <= 30) return "最近30天"
    return "最近半年"
  }

  const groupChatsByTime = (chats: Chat[]) => {
    const groups: { [key: string]: Chat[] } = {}

    chats.forEach((chat) => {
      const group = getTimeGroup(chat.timestamp)
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(chat)
    })

    return groups
  }

  const chatGroups = groupChatsByTime(chats)

  // 登录处理
  const handleLogin = (userData: AppUser) => {
    setAppUser(userData)
    // 保存到localStorage
    localStorage.setItem("chatbot_user", JSON.stringify(userData))
    // 这里可以加载用户的聊天记录
  }

  // 登出处理
  const handleLogout = () => {
    setAppUser(null)
    setChats([])
    setCurrentChatId(null)
    localStorage.removeItem("chatbot_user")
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 - 可收起 */}
      <div
        className={`
          relative bg-muted/30 border-r flex flex-col transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"}
        `}
      >
        {/* 收起/展开按钮 */}
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
          className={`
            absolute top-1/2 -translate-y-1/2 -right-3 z-10 h-6 w-6 rounded-full border bg-background shadow-md
            hover:bg-accent transition-all duration-200
          `}
          title={sidebarCollapsed ? "展开聊天记录" : "收起聊天记录"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* 侧边栏内容 */}
        <div className="flex flex-col h-full min-w-80">
          {/* 侧边栏头部 */}
          <div className="p-4 border-b">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
              onClick={createNewChat}
            >
              <Plus className="h-4 w-4 mr-2" />
              新建对话
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            {chats.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(chatGroups).map(([groupName, chats]) => (
                  <div key={groupName}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">{groupName}</h3>
                    <div className="space-y-1">
                      {chats.map((chat) => (
                        <div
                          key={chat.id}
                          className={`group cursor-pointer hover:bg-accent rounded-lg p-3 transition-colors relative ${
                            currentChatId === chat.id ? "bg-accent" : ""
                          }`}
                          onClick={() => selectChat(chat.id)}
                        >
                          <p className="text-sm truncate pr-10">{chat.title}</p>
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedChatId(chat.id)
                                    setNewTitle(chat.title)
                                    setShowRenameDialog(true)
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  重命名
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedChatId(chat.id)
                                    setShowDeleteDialog(true)
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  删除此对话
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-sm">暂无聊天记录</p>
              </div>
            )}
          </ScrollArea>

          {/* 登录区域 */}
          <div className="p-4 border-t">
            {appUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{appUser.username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full bg-transparent"
                size="sm"
                onClick={() => setShowAuthDialog(true)}
              >
                <LogIn className="h-4 w-4 mr-2" />
                登录
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 展开按钮 - 当侧边栏收起时显示 */}
      {sidebarCollapsed && (
        <Button
          size="icon"
          variant="ghost"
          onClick={toggleSidebar}
          className="absolute top-1/2 -translate-y-1/2 left-4 z-10 h-8 w-8 rounded-full border bg-background shadow-md hover:bg-accent"
          title="展开聊天记录"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* 聊天头部 */}
            <div className="border-b p-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback>
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">AI助手</h1>
                  <p className="text-sm text-muted-foreground">
                    在线 • 支持文本、语音、文档
                    {appUser && (
                      <span className="ml-2">
                        • 已登录为 {appUser.username}
                        {appUser.phone && ` (${appUser.phone})`}
                        {appUser.email && ` (${appUser.email})`}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* 消息区域 */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {currentChat.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.sender === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>

                    <div className={`flex flex-col space-y-1 max-w-[70%]`}>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          message.sender === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                        }`}
                      >
                        {message.type === "file" && (
                          <div className="flex items-center space-x-2 mb-1">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm font-medium">{message.fileName}</span>
                          </div>
                        )}
                        {message.type === "audio" && (
                          <div className="flex items-center space-x-2 mb-1">
                            <Mic className="h-4 w-4" />
                            <span className="text-sm font-medium">语音消息</span>
                          </div>
                        )}
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <span
                        className={`text-xs text-muted-foreground ${
                          message.sender === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* 输入区域 */}
            <div className="border-t p-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="shrink-0"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant={isRecording ? "destructive" : "outline"}
                    onClick={toggleRecording}
                    className="shrink-0"
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>

                  <div className="flex-1 relative">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="输入消息..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      className="pr-12"
                    />
                    <Button
                      size="icon"
                      onClick={sendMessage}
                      disabled={!inputValue.trim()}
                      className="absolute right-1 top-1 h-8 w-8"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                />

                {isRecording && (
                  <div className="mt-2 text-center">
                    <span className="text-sm text-muted-foreground animate-pulse">
                      🔴 正在录制语音...点击停止按钮结束录制
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <WelcomeScreen onStartChat={createNewChat} />
        )}
      </div>

      {/* 登录注册对话框 */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} onLogin={handleLogin} />

      {/* 重命名对话框 */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chat-title">对话标题</Label>
              <Input
                id="chat-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="请输入新的对话标题"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              取消
            </Button>
            <Button onClick={renameChat}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>您确定要删除这个对话吗？此操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
