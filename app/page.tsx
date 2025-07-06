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
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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

  // 临时聊天状态 - 用于新对话但还没有真正发送消息的情况
  const [tempChat, setTempChat] = useState<Chat | null>(null)
  const [isInTempChat, setIsInTempChat] = useState(false)

  // 侧边栏收起/展开状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // 对话框状态
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string>("")
  const [newTitle, setNewTitle] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  const currentChat = isInTempChat && tempChat ? tempChat : chats.find((chat) => chat.id === currentChatId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    if (currentChat && currentChat.messages.length > 0) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [currentChat]) // Updated dependency to currentChat

  useEffect(() => {
    if (currentChatId || isInTempChat) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [currentChatId, isInTempChat])

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  const createNewChat = (presetQuestion?: string) => {
    const newChatId = `chat_${Date.now()}`
    const newTempChat: Chat = {
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

    setTempChat(newTempChat)
    setIsInTempChat(true)
    setCurrentChatId(null)

    if (presetQuestion) {
      setInputValue(presetQuestion)
      setTimeout(() => {
        sendPresetMessage(presetQuestion, newTempChat)
      }, 100)
    }
  }

  const sendPresetMessage = (question: string, tempChatData: Chat) => {
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: question,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    }

    const realChat: Chat = {
      ...tempChatData,
      messages: [...tempChatData.messages, newMessage],
      lastMessage: question,
      timestamp: new Date(),
      title: question.slice(0, 30),
    }

    setChats((prev) => [realChat, ...prev])
    setCurrentChatId(realChat.id)
    setIsInTempChat(false)
    setTempChat(null)
    setInputValue("")

    setTimeout(() => {
      const botReply: Message = {
        id: `msg_${Date.now() + 1}`,
        content: getPresetAnswer(question),
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === realChat.id) {
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

  const getPresetAnswer = (question: string): string => {
    const answers: { [key: string]: string } = {
      "Spark公寓的租金价格如何？":
        "Spark公寓的租金根据户型和楼层有所不同。一室一厅的月租金在3000-4000元之间，两室一厅在4500-6000元之间，三室两厅在6500-8500元之间。具体价格会根据装修标准、楼层高低、朝向等因素有所调整。我们还提供灵活的租期选择和优惠政策。",
      "有哪些户型可以选择？":
        "Spark公寓提供多种户型选择：\n\n• 一室一厅（45-55㎡）：适合单身人士或情侣\n• 两室一厅（70-85㎡）：适合小家庭或合租\n• 三室两厅（95-120㎡）：适合大家庭\n• 复式公寓（130-150㎡）：豪华选择\n\n所有户型都配备现代化装修，家具家电齐全，拎包即可入住。",
      "公寓周边的交通便利吗？":
        "Spark公寓的交通非常便利：\n\n🚇 地铁：步行5分钟到地铁站，可直达市中心\n🚌 公交：楼下就有多条公交线路\n🚗 自驾：临近主干道，出行方便\n🚲 共享单车：周边有多个共享单车停放点\n\n另外，公寓还提供免费班车服务，定时往返商业区和交通枢纽。",
      "入住需要什么手续？":
        "入住Spark公寓的手续很简单：\n\n📋 所需材料：\n• 身份证原件及复印件\n• 收入证明或工作证明\n• 押金（通常为1-2个月租金）\n\n✅ 办理流程：\n1. 预约看房\n2. 签订租赁合同\n3. 缴纳押金和首月租金\n4. 办理入住手续\n5. 领取门卡和钥匙\n\n整个过程通常在1-2个工作日内完成。我们还提供在线办理服务，让您更加便捷。",
    }

    return answers[question] || "感谢您的提问！我会为您提供详细的信息。如果您有其他问题，随时可以咨询我。"
  }

  const selectChat = (chatId: string) => {
    setCurrentChatId(chatId)
    setIsInTempChat(false)
    setTempChat(null)
    setTimeout(() => {
      scrollToBottom()
    }, 200)
  }

  const backToWelcome = () => {
    setCurrentChatId(null)
    setIsInTempChat(false)
    setTempChat(null)
  }

  const sendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    }

    if (isInTempChat && tempChat) {
      const realChat: Chat = {
        ...tempChat,
        messages: [...tempChat.messages, newMessage],
        lastMessage: inputValue,
        timestamp: new Date(),
        title: inputValue.slice(0, 30),
      }

      setChats((prev) => [realChat, ...prev])
      setCurrentChatId(realChat.id)
      setIsInTempChat(false)
      setTempChat(null)
    } else if (currentChatId) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === currentChatId) {
            const updatedMessages = [...chat.messages, newMessage]
            return {
              ...chat,
              messages: updatedMessages,
              lastMessage: inputValue,
              timestamp: new Date(),
            }
          }
          return chat
        }),
      )
    }

    setInputValue("")

    setTimeout(() => {
      const botReply: Message = {
        id: `msg_${Date.now() + 1}`,
        content: "我收到了您的消息。这是一个模拟回复，在实际应用中会连接到AI服务。",
        sender: "bot",
        timestamp: new Date(),
        type: "text",
      }

      if (currentChatId) {
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
      }
    }, 1000)
  }

  const renameChat = () => {
    if (!newTitle.trim() || !selectedChatId) return

    setChats((prev) => prev.map((chat) => (chat.id === selectedChatId ? { ...chat, title: newTitle.trim() } : chat)))

    setShowRenameDialog(false)
    setNewTitle("")
    setSelectedChatId("")
  }

  const deleteChat = () => {
    if (!selectedChatId) return

    setChats((currentChats) => {
      const newChats = currentChats.filter((chat) => chat.id !== selectedChatId)

      if (currentChatId === selectedChatId) {
        if (newChats.length === 0) {
          setCurrentChatId(null)
        } else {
          const deletedIndex = currentChats.findIndex((chat) => chat.id === selectedChatId)

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

    setShowDeleteDialog(false)
    setSelectedChatId("")
  }

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true)
    } else {
      setIsRecording(false)

      const voiceMessage: Message = {
        id: `msg_${Date.now()}`,
        content: "语音消息已录制完成",
        sender: "user",
        timestamp: new Date(),
        type: "audio",
      }

      if (isInTempChat && tempChat) {
        const realChat: Chat = {
          ...tempChat,
          messages: [...tempChat.messages, voiceMessage],
          lastMessage: "语音消息",
          timestamp: new Date(),
          title: "语音对话",
        }

        setChats((prev) => [realChat, ...prev])
        setCurrentChatId(realChat.id)
        setIsInTempChat(false)
        setTempChat(null)
      } else if (currentChatId) {
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const fileMessage: Message = {
      id: `msg_${Date.now()}`,
      content: `已上传文件: ${file.name}`,
      sender: "user",
      timestamp: new Date(),
      type: "file",
      fileName: file.name,
    }

    if (isInTempChat && tempChat) {
      const realChat: Chat = {
        ...tempChat,
        messages: [...tempChat.messages, fileMessage],
        lastMessage: `文件: ${file.name}`,
        timestamp: new Date(),
        title: `文件: ${file.name.slice(0, 20)}`,
      }

      setChats((prev) => [realChat, ...prev])
      setCurrentChatId(realChat.id)
      setIsInTempChat(false)
      setTempChat(null)
    } else if (currentChatId) {
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
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

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

  const handleLogin = (userData: AppUser) => {
    setAppUser(userData)
    localStorage.setItem("chatbot_user", JSON.stringify(userData))
  }

  const handleLogout = () => {
    setAppUser(null)
    setChats([])
    setCurrentChatId(null)
    setIsInTempChat(false)
    setTempChat(null)
    localStorage.removeItem("chatbot_user")
  }

  return (
    <div className="flex h-screen bg-background">
      <div
        className={`
          relative bg-muted/30 border-r flex flex-col transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"}
        `}
      >
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

        <div className="flex flex-col h-full min-w-80">
          <div className="p-4 border-b">
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
              onClick={() => createNewChat()}
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

      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            <div className="border-b p-4">
              <div className="flex items-center space-x-3">
                <div
                  className="relative w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105"
                  onClick={backToWelcome}
                  title="回到欢迎界面"
                >
                  <Sparkles className="h-5 w-5 text-white" />
                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>
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
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
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
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

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

      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} onLogin={handleLogin} />

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
