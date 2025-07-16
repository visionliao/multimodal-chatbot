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
import { WelcomeScreen } from "@/components/welcome-screen"
import { useLiveKit } from "@/components/livekit/LiveKitProvider"
import useChatAndTranscription from "@/hooks/useChatAndTranscription";
import { toastAlert } from "@/components/ui/alert-toast";
import { signIn, signOut, useSession, SessionProvider } from "next-auth/react"
import { useIsMobile } from "@/components/ui/use-mobile";
import { useRouter } from 'next/navigation';
import { saveChatToDB, saveMessageToDB, getChatsByUserId, getMessagesByChatId, updateChatTitle, deleteChatById } from '@/lib/db/utils';
import { RoomEvent } from 'livekit-client';


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
  const isMobile = useIsMobile();
  // 基础状态 - 默认没有聊天记录
  // 聊天主逻辑
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isWaitingForReply, setIsWaitingForReply] = useState(false) // 等待AI回复状态

  // 侧边栏收起/展开状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  // 根据 isMobile 响应式调整 sidebarCollapsed
  useEffect(() => {
    setSidebarCollapsed(isMobile);
  }, [isMobile]);

  // 对话框状态
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedChatId, setSelectedChatId] = useState<string>("")
  const [newTitle, setNewTitle] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null) // 用于自动滚动到底部
  const inputRef = useRef<HTMLInputElement>(null) // 用于自动获取焦点

  // 增加临时对话 tempChat 状态
  const [tempChat, setTempChat] = useState<Chat | null>(null);

  // 新增：修改昵称弹窗状态和输入
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [newNickname, setNewNickname] = useState("");

  const { room, connected, connectRoom } = useLiveKit()
  const { send, messages: livekitMessages } = useChatAndTranscription();

  // 记录已插入的转录消息ID，避免重复
  const insertedTranscriptionIds = useRef<Set<string>>(new Set());
  // 记录最后一条livekit回复消息和当前聊天id
  const lastBotMessage = useRef<{ message: string; chatId: string | null } | null>(null);

  // LiveKit 连接状态：'connecting'|'connected'|'disconnected'
  const [livekitStatus, setLivekitStatus] = useState<'connecting'|'connected'|'disconnected'>('disconnected');

  useEffect(() => {
    if (!room) return;
    console.log("lhf room连接状态改变：", room.state)
    // 初始状态
    setLivekitStatus(room.state === 'connected' ? 'connected' : (room.state === 'connecting' ? 'connecting' : 'disconnected'));
    const handleConnected = () => setLivekitStatus('connected');
    const handleDisconnected = () => setLivekitStatus('disconnected');
    const handleReconnecting = () => setLivekitStatus('connecting');
    room.on(RoomEvent.Connected, handleConnected);
    room.on(RoomEvent.Disconnected, handleDisconnected);
    room.on(RoomEvent.Reconnecting, handleReconnecting);
    return () => {
      room.off(RoomEvent.Connected, handleConnected);
      room.off(RoomEvent.Disconnected, handleDisconnected);
      room.off(RoomEvent.Reconnecting, handleReconnecting);
    };
  }, [room]);

  const { data: session, status } = useSession();
  // 类型断言扩展 user 字段
  const user = session && session.user ? (session.user as typeof session.user & { nickname?: string; username?: string; user_id?: number }) : undefined;

  // 登录后自动加载聊天记录
  useEffect(() => {
    if (user && user.user_id) {
      //console.log("lhf 触发登录事件")
      getChatsByUserId(user).then(async (chats) => {
        // chats: [{ chat_id, user_id, title, created_at, updated_at }]
        // 批量获取每个聊天的消息
        const chatList = await Promise.all(
          chats.map(async (c: any) => {
            const messagesRaw = await getMessagesByChatId(user, c.chat_id);
            // 转换为前端 Message 结构
            const messages = messagesRaw.map((m: any) => ({
              id: m.message_id,
              content: m.content,
              sender: m.message_source === 0 ? "user" : "bot",
              type: m.type === 0 ? "text" : m.type === 1 ? "file" : "text", // 这里只区分文本/文件，后续可扩展
              fileName: m.type === 1 ? m.file_name : undefined,
              timestamp: m.created_at ? new Date(m.created_at) : new Date(),
            }));
            return {
              id: c.chat_id,
              title: c.title,
              messages,
              lastMessage: messages.length > 0 ? messages[messages.length - 1].content : '',
              timestamp: c.updated_at ? new Date(c.updated_at) : new Date(),
            };
          })
        );
        setChats(chatList);
      });
    }
  }, [user]);

  // currentChat 优先 tempChat，否则用 chats+currentChatId
  const currentChat = tempChat ? tempChat : chats.find((chat) => chat.id === currentChatId);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // 监听当前聊天变化，自动滚动到底部
  useEffect(() => {
    if (currentChat && currentChat.messages.length > 0) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [currentChat])

  // 监听聊天切换，自动滚动到底部
  useEffect(() => {
    if (currentChatId) {
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  }, [currentChatId])

  // 监听livekit回复的语音转文本useEffect：
  useEffect(() => {
    if (!currentChatId) return;
    const currentChat = chats.find(chat => chat.id === currentChatId);
    if (!currentChat) return;

    // 找到最新一条 bot 流式消息
    const botStream = livekitMessages
      .filter(msg => msg.from && room && msg.from.identity !== room.localParticipant.identity)
      .slice(-1)[0]; // 只取最后一条

    if (!botStream || !botStream.message) return;
    // 判断是否是上一个聊天的缓存消息，因为监听livekitMessages，只要发送消息会马上获得上一次最后的流式数据
    if (
      lastBotMessage.current &&
      lastBotMessage.current.message === botStream.message &&
      lastBotMessage.current.chatId !== currentChatId
    ) {
      console.log("lhf 忽略历史缓存消息:", botStream.message);
      return; //属于上一个聊天的消息，不插入 UI
    }
    // 是新的消息 or 属于当前聊天的消息，更新 lastBotMessage
    lastBotMessage.current = {
      message: botStream.message,
      chatId: currentChatId,
    };
    // 持久化
    saveChatToDB(user, currentChatId, botStream.message);
    saveMessageToDB(user, botStream.id, currentChatId, botStream.message, 1, 0);

    setChats(prev =>
      prev.map(chat => {
        if (chat.id === currentChatId) {
          const lastMsg = chat.messages[chat.messages.length - 1];
          // 只有当最后一条消息是bot且id相同才更新，否则插入新消息
          if (lastMsg && lastMsg.sender === "bot" && lastMsg.id === botStream.id) {
            // 更新最后一条 bot 消息内容
            const newMessages = [...chat.messages];
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: botStream.message,
              timestamp: new Date(),
            };
            return { ...chat, messages: newMessages };
          } else {
            // 只在botStream.id不存在于当前消息时插入新消息
            const exists = chat.messages.some(m => m.id === botStream.id);
            if (exists) return chat;
            setTimeout(() => {
              inputRef.current?.focus();
            }, 0);
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: botStream.id || `msg_${Date.now()}`,
                  content: botStream.message,
                  sender: "bot" as "bot",
                  timestamp: new Date(),
                  type: "text" as "text",
                  fileName: undefined,
                },
              ],
            };
          }
        }
        return chat;
      })
    );
  }, [livekitMessages, room]);

  // 监听用户自己的语音转文字消息，插入到聊天流
  useEffect(() => {
    if (!room || !room.localParticipant) return;
    const myIdentity = room.localParticipant.identity;

    // 只处理 isTranscription 为 true 的消息
    const myTranscriptions = livekitMessages.filter(
      (msg) =>
        msg.from &&
        msg.from.identity === myIdentity &&
        msg.message &&
        (msg as any).isTranscription
    );
    if (!myTranscriptions.length) return;

    // 逐条处理语音片段，确保触发 AI 回复等逻辑
    myTranscriptions.forEach((msg) => {
      if (insertedTranscriptionIds.current.has(msg.id)) {
        // console.log("lhf 已处理过该语音片段，跳过:", msg.id);
        return;
      }
      // console.log("lhf 正在处理语音片段:", msg);

      // 标记为已处理
      insertedTranscriptionIds.current.add(msg.id);

      // 每次插入都会触发 setChats，从而触发下游逻辑（如 AI 回复）
      setChats((prevChats) => {
        if (tempChat) {
          const firstMessageTitle = msg.message.trim().slice(0, 30);
          const mergedChat: Chat = {
            ...tempChat,
            title: firstMessageTitle || "新对话",
            messages: [...tempChat.messages, {
              id: msg.id,
              content: msg.message,
              sender: 'user' as const,
              timestamp: new Date(msg.timestamp),
              type: 'text' as const,
            }],
            lastMessage: msg.message,
            timestamp: new Date(),
          };
          setCurrentChatId(mergedChat.id);
          setTempChat(null);
          return [mergedChat, ...prevChats];
        } else if (prevChats.length === 0) {
          const firstMessageTitle = msg.message.trim().slice(0, 30);
          const newChatId = `chat_${Date.now()}`;
          const newChat: Chat = {
            id: newChatId,
            title: firstMessageTitle || '新对话',
            messages: [{
              id: msg.id,
              content: msg.message,
              sender: 'user' as const,
              timestamp: new Date(msg.timestamp),
              type: 'text' as const,
            }],
            lastMessage: msg.message,
            timestamp: new Date(),
          };
          setCurrentChatId(newChatId);
          return [newChat];
        } else if (currentChatId) {
          return prevChats.map((chat) => {
            if (chat.id === currentChatId) {
              const alreadyExists = chat.messages.some((m) => m.id === msg.id);
              if (alreadyExists) return chat;
              return {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: msg.id,
                    content: msg.message,
                    sender: 'user' as const,
                    timestamp: new Date(msg.timestamp),
                    type: 'text' as const,
                  },
                ],
                lastMessage: msg.message,
                timestamp: new Date(),
              };
            }
            return chat;
          });
        }
        // 没有 currentChatId 但有聊天，默认插入第一个聊天并切换
        const fallbackId = prevChats[0].id;
        setCurrentChatId(fallbackId);
        return prevChats.map((chat, idx) => {
          if (idx === 0) {
            const alreadyExists = chat.messages.some((m) => m.id === msg.id);
            if (alreadyExists) return chat;
            return {
              ...chat,
              messages: [
                ...chat.messages,
                {
                  id: msg.id,
                  content: msg.message,
                  sender: 'user' as const,
                  timestamp: new Date(msg.timestamp),
                  type: 'text' as const,
                },
              ],
              lastMessage: msg.message,
              timestamp: new Date(),
            };
          }
          return chat;
        });
      });
    });

    // UI 显示更新部分：只显示最后一条语音内容
    const lastTranscription = myTranscriptions[myTranscriptions.length - 1];
    const transcriptionId = lastTranscription.id;
    const fullText = lastTranscription.message;
    // console.log(`lhf 当前聊天id: ${currentChatId}`);
    // console.log(`lhf 语音转文字的唯一ID: ${transcriptionId}`);
    // console.log(`lhf 拼接后的完整文本: "${fullText}"`);
    if(currentChatId) {
      saveChatToDB(user, currentChatId, fullText);
      saveMessageToDB(user, transcriptionId, currentChatId, fullText, 0, 0);
    }

    setChats((prevChats) => {
      return prevChats.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        // 查找是否已有该转录id的气泡
        const idx = chat.messages.findIndex(
          (m) => m.id === transcriptionId && m.sender === "user" && m.type === "text"
        );
        if (idx !== -1) {
          // 更新内容
          const newMessages = [...chat.messages];
          newMessages[idx] = {
            ...newMessages[idx],
            content: fullText,
            timestamp: new Date(),
          };
          return { ...chat, messages: newMessages, lastMessage: fullText, timestamp: new Date() };
        } else {
          // 插入新气泡（只在没有时插入）
          return {
            ...chat,
            messages: [
              ...chat.messages,
              {
                id: transcriptionId,
                content: fullText,
                sender: "user",
                timestamp: new Date(),
                type: "text",
              },
            ],
            lastMessage: fullText,
            timestamp: new Date(),
          };
        }
      });
    });

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }, 100);
  }, [livekitMessages, room, tempChat]);

  // 发送消息
  const sendMessage = async () => {
    console.log('lhf 发送消息 currentChatId:', currentChatId);
    if (!inputValue.trim() || isWaitingForReply) return;
    setIsWaitingForReply(true);

    // 发送到 livekit
    if (room && connected && room.state === 'connected') {
      try {
        await send(inputValue);
      } catch (e) {
        console.error("发送到 livekit 失败", e);
      }
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    }

    // 发送消息 只在 chats.length === 0 时新建聊天
    if (tempChat) {
      const firstMessageTitle = inputValue.trim().slice(0, 30);
      const mergedChat: Chat = {
        ...tempChat,
        title: firstMessageTitle || "新对话",
        messages: [...tempChat.messages, newMessage],
        lastMessage: inputValue,
        timestamp: new Date(),
      };
      setChats((prev) => {
        const result = [mergedChat, ...prev];
        return result;
      });
      console.log("lhf 新建聊天 mergedChat.id：", mergedChat.id);
      setCurrentChatId(mergedChat.id);
      setTempChat(null);
      setIsWaitingForReply(false); // 立即解锁
      saveChatToDB(user, mergedChat.id, inputValue);
      newMessage.id = `msg_${Date.now()}`;
      saveMessageToDB(user, newMessage.id, mergedChat.id, inputValue, 0, 0);
    } else if (chats.length === 0) {
      const firstMessageTitle = inputValue.trim().slice(0, 30);
      const newChatId = `chat_${Date.now()}`;
      const newChat: Chat = {
        id: newChatId,
        title: firstMessageTitle || "新对话",
        messages: [newMessage],
        lastMessage: inputValue,
        timestamp: new Date(),
      };
      setChats([newChat]);
      console.log("lhf 新建聊天 newChatId：", newChatId);
      setCurrentChatId(newChatId);
      setIsWaitingForReply(false); // 立即解锁
      saveChatToDB(user, newChatId, inputValue);
      newMessage.id = `msg_${Date.now()}`;
      saveMessageToDB(user, newMessage.id, newChatId, inputValue, 0, 0);
    } else if (currentChatId) {
      console.log("lhf 已有聊天 currentChatId：", currentChatId);
      saveChatToDB(user, currentChatId, inputValue);
      saveMessageToDB(user, newMessage.id, currentChatId, inputValue, 0, 0);
      // 更新现有聊天记录
      setChats((prev) => {
        const result = prev.map((chat) => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: inputValue,
              timestamp: new Date(),
            };
          }
          return chat;
        });
        return result;
      });
      setIsWaitingForReply(false); // 立即解锁
    }

    setInputValue("")

    // 模拟AI回复，包含错误处理和超时
    const errorTimeout = setTimeout(() => {
      if (isWaitingForReply) {
        const errorReply: Message = {
          id: `msg_${Date.now() + 2}`,
          content: "抱歉，回复超时了，请稍后重试。",
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
                  messages: [...chat.messages, errorReply],
                }
              }
              return chat
            }),
          )
        }

        setIsWaitingForReply(false) // 超时后重置状态
        // 自动获取输入框焦点
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    }, 10000)

    // 清理函数
    return () => {
      clearTimeout(errorTimeout)
    }
  }

  // 重命名聊天
  const renameChat = async () => {
    if (!newTitle.trim() || !selectedChatId) return;
    // 先请求后端
    const res = await updateChatTitle(user, selectedChatId, newTitle.trim());
    if (res && res.success) {
      setChats((prev) => prev.map((chat) => (chat.id === selectedChatId ? { ...chat, title: newTitle.trim() } : chat)));
      setShowRenameDialog(false);
      setNewTitle("");
      setSelectedChatId("");
    } else {
      alert("重命名失败");
    }
  }

  // 删除聊天
  const deleteChat = async () => {
    if (!selectedChatId) return;
    const res = await deleteChatById(user, selectedChatId);
    if (res && res.success) {
      setChats((currentChats) => {
        // 过滤掉要删除的聊天
        const newChats = currentChats.filter((chat) => chat.id !== selectedChatId);
        // 如果删除的是当前选中的聊天，需要重新选择
        if (currentChatId === selectedChatId) {
          if (newChats.length === 0) {
            setCurrentChatId(null);
            setTempChat(null);
          } else {
            // 找到被删除聊天在原数组中的位置
            const deletedIndex = currentChats.findIndex((chat) => chat.id === selectedChatId);
            // 选择相邻的聊天
            let nextIndex = deletedIndex;
            if (nextIndex >= newChats.length) {
              nextIndex = newChats.length - 1;
            }
            const nextChatId = newChats[nextIndex]?.id;
            setCurrentChatId(nextChatId || null);
          }
        }
        return newChats;
      });
      setShowDeleteDialog(false);
      setSelectedChatId("");
    } else {
      alert("删除失败");
    }
  }

  // 语音录制
  const toggleRecording = async () => {
    if (isRecording) {
      // 关闭麦克风
      try {
        console.log('lhf 尝试关闭麦克风');
        await room.localParticipant.setMicrophoneEnabled(false);
        setIsRecording(false);
        console.log('lhf 麦克风已关闭');
      } catch (error) {
        console.error('lhf 关闭麦克风失败', error);
        toastAlert({
          title: "关闭麦克风失败",
          description: error instanceof Error && error.message ? error.message : String(error) || "请检查设备权限",
        });
      }
    } else {
      // 检查设备
      console.log('lhf 尝试检测麦克风设备');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === "audioinput");
      console.log('lhf 检测结果 hasMic:', hasMic, devices);
      if (!hasMic) {
        toastAlert({
          title: "未检测到麦克风",
          description: "请插入麦克风设备后重试",
        });
        return;
      }
      // 打开麦克风
      try {
        console.log('lhf 尝试打开麦克风');
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsRecording(true);
        console.log('lhf 麦克风已打开');
      } catch (error) {
        console.error('lhf 麦克风授权失败', error);
        toastAlert({
          title: "麦克风授权失败",
          description: error instanceof Error && error.message ? error.message : String(error) || "请检查设备权限",
        });
      }
    }
  };

  // 文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || isWaitingForReply) return // 等待回复时不能上传文件

    setIsWaitingForReply(true) // 设置等待回复状态

    const fileMessage: Message = {
      id: `msg_${Date.now()}`,
      content: `已上传文件: ${file.name}`,
      sender: "user",
      timestamp: new Date(),
      type: "file",
      fileName: file.name,
    }

    // 如果是临时聊天状态，需要先创建真正的聊天记录
    if (tempChat) { // 如果当前是临时聊天，则新建一个
      const firstMessageTitle = `文件: ${file.name.slice(0, 20)}`;
      const newChatId = `chat_${Date.now()}`;
      const mergedChat: Chat = {
        ...tempChat,
        id: newChatId,
        title: firstMessageTitle,
        messages: [...tempChat.messages, fileMessage],
        lastMessage: `文件: ${file.name}`,
        timestamp: new Date(),
      };
      setChats((prev) => [mergedChat, ...prev]);
      setCurrentChatId(newChatId);
      setTempChat(null);
    } else if (chats.length === 0) { // 如果当前没有聊天，则新建一个
      const firstMessageTitle = `文件: ${file.name.slice(0, 20)}`;
      const newChatId = `chat_${Date.now()}`;
      const newChat: Chat = {
        id: newChatId,
        title: firstMessageTitle,
        messages: [fileMessage],
        lastMessage: `文件: ${file.name}`,
        timestamp: new Date(),
      };
      setChats([newChat]);
      setCurrentChatId(newChatId);
    } else if (currentChatId) {
      // 更新现有聊天记录
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

    // 模拟AI对文件的回复
    setTimeout(() => {
      const botReply: Message = {
        id: `msg_${Date.now() + 1}`,
        content: `我已经收到您上传的文件"${file.name}"，正在为您分析处理中...`,
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

      setIsWaitingForReply(false) // 回复完成，重置状态
      // 自动获取输入框焦点
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }, 2000)
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

  // 事件处理函数提前
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  // 发送预设消息
  const sendPresetMessage = (question: string) => {
    setIsWaitingForReply(true)
    const firstMessageTitle = question.trim().slice(0, 30);
    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: question,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    }
    if (tempChat) {
      const mergedChat: Chat = {
        ...tempChat,
        title: firstMessageTitle || "新对话",
        messages: [...tempChat.messages, newMessage],
        lastMessage: question,
        timestamp: new Date(),
      };
      setChats((prev) => [mergedChat, ...prev]);
      setCurrentChatId(mergedChat.id);
      setTempChat(null);
    } else if (chats.length === 0) {
      const newChatId = `chat_${Date.now()}`;
      const newChat: Chat = {
        id: newChatId,
        title: firstMessageTitle || "新对话",
        messages: [newMessage],
        lastMessage: question,
        timestamp: new Date(),
      };
      setChats([newChat]);
      setCurrentChatId(newChatId);
    } else if (currentChatId) {
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id === currentChatId) {
            return {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: question,
              timestamp: new Date(),
            };
          }
          return chat;
        }),
      );
    }
    setInputValue("");
    setTimeout(() => {
      const botReply: Message = {
        id: `msg_${Date.now() + 1}`,
        content: "这是一个预设答案，用于测试。", // 实际预设答案需要从后端获取
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
      setIsWaitingForReply(false)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }, 1000)
  }

  // 新建对话时，创建 tempChat（AI欢迎语），currentChatId=null
  const createNewChat = (presetQuestion?: string) => {
    connectRoom();
    const newChatId = `chat_${Date.now()}`;
    console.log('lhf 新建聊天窗口 newChatId:', newChatId);
    const welcomeMsg: Message = {
      id: `msg_${Date.now()}`,
      content: "您好！我是您的Spark AI助手，有任何关于Spark公寓的问题都可以咨询我。",
      sender: "bot",
      timestamp: new Date(),
      type: "text",
    };
    const newTempChat: Chat = {
      id: newChatId,
      title: "新对话",
      messages: [welcomeMsg],
      lastMessage: "",
      timestamp: new Date(),
    };
    setTempChat(newTempChat);
    setCurrentChatId(null);
    setInputValue(presetQuestion || "");
    setTimeout(() => {
      inputRef.current?.focus();
      if (presetQuestion) {
        sendPresetMessage(presetQuestion);
      }
    }, 100);
  };

  const selectChat = (chatId: string) => {
    console.log('lhf 切换聊天窗口 chatId:', chatId);
    setTempChat(null);
    setCurrentChatId(chatId)
    setTimeout(() => {
      scrollToBottom()
      inputRef.current?.focus()
    }, 200)
    if (room && room.state === 'disconnected') {
      console.log("lhf 切换聊天尝试连接room")
      connectRoom();
    }
  }

  const backToWelcome = async () => {
    if (room && room.state !== 'disconnected') {
      try {
        await room.disconnect();
      } catch (e) {
        console.error('回到欢迎界面，断开 livekit 失败', e);
      }
    }
    setCurrentChatId(null);
    setTempChat(null);
  }

  const router = useRouter();

  // 修改昵称弹窗相关逻辑
  const handleNicknameChange = async () => {
    if (!newNickname.trim()) return;
    const res = await fetch("/api/user", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: newNickname })
    });
    if (res.ok) {
      // 临时更新本地 UI 昵称
      if (session?.user) {
        (session.user as any).nickname = newNickname;
      }
      setShowNicknameDialog(false);
      setNewNickname("");
    } else {
      alert("昵称修改失败");
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 左下角浮动图标按钮，仅在侧边栏关闭时显示 */}
      {sidebarCollapsed && (
        <div
          className="fixed left-4 bottom-4 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer z-50"
          title="展开侧边栏"
          onClick={toggleSidebar}
        >
          {user ? (
            <span className="text-white text-lg font-bold select-none">
              {(() => {
                const ch = (user.nickname?.trim() || user.username?.trim() || user.name?.trim() || user.email?.trim() || "")[0] || "";
                return /[a-zA-Z]/.test(ch) ? ch.toUpperCase() : ch;
              })()}
            </span>
          ) : (
            <User className="h-6 w-6 text-white" />
          )}
        </div>
      )}
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
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
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
                                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
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

            {/* 登录/已登录区域 */}
            <div className="p-4 border-t">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 shadow"
                      title="修改昵称"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setShowNicknameDialog(true)}
                    >
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">
                      {user.nickname?.trim() || user.username?.trim() || user.name?.trim() || user.email}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="退出登录"
                    onClick={async () => {
                      if (room && room.state !== 'disconnected') {
                        try { await room.disconnect(); } catch (e) { console.error('断开 livekit 失败', e); }
                      }
                      await signOut({ redirect: false });
                      window.location.href = '/';
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={async () => {
                    if (room && room.state !== 'disconnected') {
                      try { await room.disconnect(); } catch (e) { console.error('断开 livekit 失败', e); }
                    }
                    signIn(undefined, { callbackUrl: '/login' });
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" /> 登录
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
                      {livekitStatus === 'connected' && (
                        <>
                          <span className="text-blue-600 font-semibold">在线</span> • 支持文本、语音、文档
                        </>
                      )}
                      {livekitStatus === 'disconnected' && '离线'}
                      {livekitStatus === 'connecting' && '正在连接'}
                      {user && (
                        <span className="ml-2">
                          • 已登录为 <span className="font-semibold">{user.nickname?.trim() || user.username?.trim() || user.name?.trim() || user.email}</span>
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
                  {/* AI思考中loading气泡 */}
                  {isWaitingForReply && (
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col space-y-1 max-w-[70%]">
                        <div className="rounded-lg px-4 py-2 bg-muted animate-pulse">
                          <span className="text-sm text-muted-foreground">AI正在思考...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* 用于自动滚动到底部的锚点 */}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 输入区域 */}
              <div className="border-t p-4">
                <div className="max-w-4xl mx-auto">
                  {/* 语音提示信息，放在输入框上方 */}
                  {isRecording && (
                    <div className="mb-2 text-center">
                      <span className="text-sm text-muted-foreground animate-pulse">
                        🔴 正在语音对话...点击停止按钮结束本次语音对话
                      </span>
                    </div>
                  )}
                  <div className="flex items-end space-x-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0"
                      disabled={isWaitingForReply || isRecording}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>

                    <Button
                      size="icon"
                      variant={isRecording ? "destructive" : "outline"}
                      onClick={toggleRecording}
                      className="shrink-0"
                      disabled={isWaitingForReply && !isRecording}
                    >
                      {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>

                    <div className="flex-1 relative">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={
                          isWaitingForReply ? "等待AI回复中..." : isRecording ? "正在语音对话中..." : "输入消息..."
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !isWaitingForReply &&
                            !isRecording &&
                            !(e.nativeEvent as any).isComposing
                          ) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        className="pr-12"
                        disabled={isWaitingForReply || isRecording}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (!isWaitingForReply && !isRecording && inputValue.trim()) sendMessage();
                        }}
                        disabled={!inputValue.trim() || isWaitingForReply || isRecording}
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
                    disabled={isWaitingForReply || isRecording}
                  />
                </div>
              </div>
            </>
          ) : (
            <WelcomeScreen onStartChat={createNewChat} />
          )}
        </div>

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

        {/* 修改昵称弹窗 */}
        <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center w-full">修改昵称</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-base font-medium">当前昵称</div>
              {!(user?.nickname?.trim()) ? (
                <div className="text-muted-foreground">还没有昵称</div>
              ) : (
                <div className="text-primary font-semibold">{user.nickname}</div>
              )}
              <div className="text-base font-medium mt-2">新昵称</div>
              <Input
                value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                placeholder="请输入新昵称"
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleNicknameChange}
              >
                确定
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
