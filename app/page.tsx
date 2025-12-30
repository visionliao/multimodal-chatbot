"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
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
  FileText,
  Image,
  FileIcon,
  X,
  FileQuestion,
  CheckCircle2,
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
import { useLanguage } from "@/lib/contexts/language-context";
import {
  saveChatToDB,
  saveMessageToDB,
  getChatsByUserId,
  getMessagesByChatId,
  updateChatTitle,
  deleteChatById,
  savePictureToDB,
  saveDocumentToDB,
  getPictureFileName,
  getDocumentFileName,
  saveTempMessageToDB } from '@/lib/db/utils';
import showdown from 'showdown';
import { ConnectionError } from 'livekit-client';

// 1. 图片映射关系配置
const IMAGE_MAPPING: Record<string, string[]> = {
  "STD.jpg": ["n29_01.jpg", "n29_02.jpg"],
  "STE.jpg": ["s35_01.jpg", "s35_02.jpg", "s35_03.jpg", "s35_04.jpg"],
  "1BD.jpg": ["n46_01.jpg", "n46_02.jpg", "n46_03.jpg", "n46_04.jpg"],
  "1BP.jpg": ["n59_01.jpg", "n59_02.jpg", "n59_03.jpg", "n59_04.jpg"],
  "STP.jpg": ["s50_01.jpg", "s50_02.jpg", "s50_03.jpg"],
  "2BD.jpg": ["s74_01.jpg", "s74_02.jpg", "s74_03.jpg", "s74_04.jpg", "s74_05.jpg"],
  "3BR.jpg": ["s74_01.jpg", "s74_02.jpg", "s74_03.jpg", "s74_04.jpg", "s74_05.jpg"],
  // 如果后端返回了 Commonarea 里的原名（如 gym.jpg），默认保留原名
};

// 2. 公区图片模糊匹配逻辑 (根据你的要求定制)
const resolveCommonAreaImage = (rawName: string): string => {
  const lowerName = rawName.toLowerCase().trim();

  // 规则 1: 包含 yoga -> yoga_room.jpg
  if (lowerName.includes("yoga")) return "yoga_room.jpg";

  // 规则 2: 包含 kitchen -> privatekitchen.jpg
  if (lowerName.includes("kitchen")) return "privatekitchen.jpg";

  // 规则 3: 包含 pool01 -> pool.jpg
  // 注意：如果只是 pool.jpg 也会走默认逻辑，这里专门处理错误的 POOL01
  if (lowerName.includes("pool01")) return "pool.jpg";

  // 规则 4: 包含 telephone 或 booth -> telephone_booth.jpg
  if (lowerName.includes("telephone") || lowerName.includes("booth")) return "telephone_booth.jpg";

  // 规则 5: 包含 music -> music_room.jpg
  if (lowerName.includes("music")) return "music_room.jpg";

  // 补充规则 (基于你的日志): 处理 Bar.jpg -> bar.jpg, KTV.jpg -> ktv.jpg
  // 你的文件系统中 bar.jpg, ktv.jpg, patio.jpg 都是小写的，
  // 所以默认情况下，我们把名字转成全小写返回即可解决大部分 404。
  return lowerName;
};

// 2. 解析消息内容的函数
interface ParsedContent {
  text: string;
  images: string[];
}

const parseMessageWithImages = (content: string): ParsedContent => {
  const regex = /show_image\s*:\s*\[([\s\S]*?)\]/;
  const match = content.match(regex);

  let text = content;
  const resultImages: string[] = [];
  const MAX_IMAGES = 6; // 限制为6张

  if (match) {
    // 1. 截取掉 show_image 部分
    text = content.replace(match[0], "").trim();

    // 2. 解析图片列表
    const rawListString = match[1];
    if (rawListString && rawListString.trim().length > 0) {
      // 提取原始名称并去重分类
      const rawNames = Array.from(new Set(
        rawListString
          .split(",")
          .map(s => s.trim().replace(/['"]/g, ""))
          .filter(s => s.length > 0)
      ));

      const categoryCount = rawNames.length;

      if (categoryCount > 0) {
        // 全局去重集合
        const globalUsedImages = new Set<string>();

        // 3. 计算配额
        // 比如 6 张图，2 个房型 -> 每个房型分 3 张
        const baseQuota = Math.floor(MAX_IMAGES / categoryCount);
        const remainder = MAX_IMAGES % categoryCount;

        // 4. 遍历分类分配图片
        rawNames.forEach((name, index) => {
          let candidates: string[] = [];

          // 获取候选图（不再打乱，保持默认顺序）
          if (IMAGE_MAPPING[name]) {
            candidates = IMAGE_MAPPING[name];
          } else {
            candidates = [resolveCommonAreaImage(name)];
          }

          // 计算当前分类的配额
          const currentQuota = baseQuota + (index < remainder ? 1 : 0);

          // 挑选图片 (去重)
          let pickedCount = 0;
          for (const img of candidates) {
            // 配额满了就停
            if (pickedCount >= currentQuota) break;

            // 如果这张图之前没被选过，就选中它
            if (!globalUsedImages.has(img)) {
              globalUsedImages.add(img);
              resultImages.push(img);
              pickedCount++;
            }
          }
        });
      }
    }
  }

  return { text, images: resultImages };
};

interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date | string
  // 0: text, 1: image, 2: txt, 3: pdf, 4: doc, 5: unknown
  type: number
  fileName?: string
}

interface Chat {
  id: string
  title: string
  messages: Message[]
  lastMessage: string
  timestamp: Date
}

export default function MultimodalChatbot() {
  const isMobile = useIsMobile();
  const { t, locale } = useLanguage();
  // 基础状态 - 默认没有聊天记录
  // 聊天主逻辑
  const [chats, setChats] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isWaitingForReply, setIsWaitingForReply] = useState(false) // 等待AI回复状态

  // 侧边栏收起/展开状态
  //const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const inputRef = useRef<HTMLTextAreaElement>(null) // 用于自动获取焦点

  // 增加临时对话 tempChat 状态
  const [tempChat, setTempChat] = useState<Chat | null>(null);

  // 新增：修改昵称弹窗状态和输入
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [newNickname, setNewNickname] = useState("");

  const { room, connectRoom, isReadyToChat, connected: isClientConnected, isAgentConnected, forceReconnect } = useLiveKit()
  const { send, messages: livekitMessages } = useChatAndTranscription();

  // 记录已插入的转录消息ID，避免重复
  const insertedTranscriptionIds = useRef<Set<string>>(new Set());
  // 记录最后一条livekit回复消息和当前聊天id
  const lastBotMessage = useRef<{ message: string; chatId: string | null } | null>(null);
  // 用于标记当前对话是否已超时，如果超时，后续到达的流式消息将被忽略
  const isResponseTimeout = useRef(false);

  const { data: session, status } = useSession();
  const router = useRouter();
  // 类型断言扩展 user 字段
  const user = session && session.user ? (session.user as typeof session.user & { nickname?: string; username?: string; user_id?: number }) : undefined;

  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  // 思考耗时计时器
  const [thinkingTime, setThinkingTime] = useState(0);
  // 用于存储超时定时器的 Ref
  const responseTimeoutTimer = useRef<NodeJS.Timeout | null>(null);
  // 超时时长配置 60秒
  const RESPONSE_TIMEOUT_MS = 60000;

  // 处理思考时间的计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isWaitingForReply) {
      // 开始等待：重置时间为 0，并启动定时器
      setThinkingTime(0);
      interval = setInterval(() => {
        setThinkingTime((prev) => prev + 1);
      }, 1000);
    } else {
      // 结束等待：重置时间 (可选，也可以留着最后的时间，但为了下次干净显示，建议重置)
      setThinkingTime(0);
    }

    // 清理函数：组件卸载或状态变化时清除定时器
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingForReply]);

  useEffect(() => {
    return () => {
      if (responseTimeoutTimer.current) {
        clearTimeout(responseTimeoutTimer.current);
      }
    };
  }, []);

  // --- 用于检测 root 用户并重定向 ---
  useEffect(() => {
    // 仅在会话状态确定后执行检查
    if (status === 'authenticated') {
      // 检查用户角色是否为 'root'
      if ((session?.user as any)?.role === 'root') {
        // 如果是 root 用户，重定向到超级用户控制台
        router.push('/root-dashboard');
      }
    }
  }, [session, status, router]);

  // 登录后自动加载聊天记录
  useEffect(() => {
    if (user && user.user_id && (user as any).role !== 'root') {
      //console.log("lhf 触发登录事件")
      getChatsByUserId(user).then(async (chats) => {
        // chats: [{ chat_id, user_id, title, created_at, updated_at }]
        // 批量获取每个聊天的消息
        const chatList = await Promise.all(
          chats.map(async (c: any) => {
            const messagesRaw = await getMessagesByChatId(user, c.chat_id);
            // 批量查文件名
            const messages = await Promise.all(messagesRaw.map(async (m: any) => {
              let fileName: string | null | undefined = undefined;
              if (m.type && m.type !== 0) {
                if (m.type === 1) {
                  // 图片
                  fileName = await getPictureFileName(user, m.message_id);
                } else {
                  // 文档
                  fileName = await getDocumentFileName(user, m.message_id);
                }
              }
              return {
                id: m.message_id,
                content: m.content,
                sender: m.message_source === 0 ? "user" : "bot",
                type: m.type,
                fileName: fileName || undefined,
                timestamp: m.created_at,
              };
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
      lastBotMessage.current.message === botStream.message
    ) {
      console.log("lhf 忽略历史缓存消息:", botStream.message);
      return; //属于上一个聊天的消息，不插入 UI
    }

    // 检查是否已经超时。如果超时标记为 true，则直接忽略这条迟到的消息
    if (isResponseTimeout.current) {
      console.log("lhf 忽略超时后的迟到消息");
      return;
    }

    if (responseTimeoutTimer.current) {
      clearTimeout(responseTimeoutTimer.current);
      responseTimeoutTimer.current = null;
    }

    // 收到第一条有效消息，停止“正在思考”动画，解锁输入框
    setIsWaitingForReply(false);

    // 是新的消息 or 属于当前聊天的消息，更新 lastBotMessage
    lastBotMessage.current = {
      message: botStream.message,
      chatId: currentChatId,
    };
    // 持久化
    (async () => {
      if (user) {
        await saveChatToDB(user, currentChatId, botStream.message);
        await saveMessageToDB(user, botStream.id, currentChatId, botStream.message, 1, 0);
      } else {
        await saveTempMessageToDB(botStream.id, botStream.message, 1, 0);
      }
    })();

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
              //timestamp: new Date(),
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
                  type: 0,
                  fileName: undefined,
                },
              ],
            };
          }
        }
        return chat;
      })
    );
  }, [livekitMessages, room, currentChatId]);

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
            title: firstMessageTitle || t.chat.defaults.newChatTitle,
            messages: [...tempChat.messages, {
              id: msg.id,
              content: msg.message,
              sender: 'user' as const,
              timestamp: new Date(msg.timestamp),
              type: 0,
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
            title: firstMessageTitle || t.chat.defaults.newChatTitle,
            messages: [{
              id: msg.id,
              content: msg.message,
              sender: 'user' as const,
              timestamp: new Date(msg.timestamp),
              type: 0,
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
                    type: 0,
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
                  type: 0,
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
      (async () => {
        if (user) {
          await saveChatToDB(user, currentChatId, fullText);
          await saveMessageToDB(user, transcriptionId, currentChatId, fullText, 0, 0);
        } else {
          await saveTempMessageToDB(transcriptionId, fullText, 0, 0);
        }
      })();
    }

    setChats((prevChats) => {
      return prevChats.map((chat) => {
        if (chat.id !== currentChatId) return chat;
        // 查找是否已有该转录id的气泡
        const idx = chat.messages.findIndex(
          (m) => m.id === transcriptionId && m.sender === "user" && m.type === 0
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
                type: 0,
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
    if (!isReadyToChat) {
      toastAlert({ title: t.chat.voice.notReadyToChat, description: '' });
      console.log(`[sendMessage] Not ready to chat. Attempting to reconnect.`);
      // 调用智能的 connectRoom 方法，它会处理所有重连逻辑
      await connectRoom();
      return;
    }
    if ((!inputValue.trim() && !selectedFile) || isWaitingForReply || (selectedFile && (!uploadedFileInfo || isUploading))) return;
    setIsWaitingForReply(true);
    isResponseTimeout.current = false;

    // 发送到 livekit
    if (room && isReadyToChat) {
      try {
        // 构建带日期的消息发送给 LiveKit，但不影响本地显示和存储
        // 获取当前日期 YYYY-MM-DD
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;

        const messageToAgent = `[当前日期: ${formattedDate}]\n${inputValue}`;
        await send(messageToAgent);
      } catch (e) {
        console.error("发送到 livekit 失败", e);
        if (e instanceof ConnectionError && e.message.includes('Publisher connection')) {
          toastAlert({
            title: t.chat.voice.connectingError,
            description: t.chat.voice.connectingError,
          });
          // 调用我们的新函数来强制完全重连
          await forceReconnect();
          // 解锁UI
          setIsWaitingForReply(false);
          // 停止执行此函数的其余部分
          return;
        }
      }
    }

    let type = 0;
    let fileName = undefined;
    let filePath = undefined;
    if (selectedFile && uploadedFileInfo) {
      const mime = selectedFile.type;
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (mime.startsWith("image/")) type = 1;
      else if (mime === "text/plain") type = 2;
      else if (mime === "application/pdf") type = 3;
      else if (mime === "application/msword" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") type = 4;
      else if (!mime) {
        if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext || "")) type = 1;
        else if (["txt", "md"].includes(ext || "")) type = 2;
        else if (["pdf"].includes(ext || "")) type = 3;
        else if (["doc", "docx"].includes(ext || "")) type = 4;
        else type = 5;
      } else {
        type = 5;
      }
      fileName = uploadedFileInfo.file_name;
      filePath = uploadedFileInfo.file_path;
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
      type,
      ...(fileName ? { fileName } : {})
    }

    let realMessageId = newMessage.id;
    let targetChatId = currentChatId || "";

    // 发送消息 只在 chats.length === 0 时新建聊天
    if (tempChat) {
      const firstMessageTitle = inputValue.trim().slice(0, 30);
      const mergedChat: Chat = {
        ...tempChat,
        title: firstMessageTitle || t.chat.defaults.newChatTitle,
        messages: [...tempChat.messages, newMessage],
        lastMessage: inputValue,
        timestamp: new Date(),
      };
      targetChatId = mergedChat.id;
      setChats((prev) => {
        const result = [mergedChat, ...prev];
        return result;
      });
      setCurrentChatId(mergedChat.id);
      setTempChat(null);
      // setIsWaitingForReply(false); // 立即解锁
      if (user) {
        await saveChatToDB(user, mergedChat.id, inputValue);
        newMessage.id = `msg_${Date.now()}`;
        const res = await saveMessageToDB(user, newMessage.id, mergedChat.id, inputValue, 0, type);
        if (res && res.message_id) realMessageId = res.message_id;
        // 插入图片/文档表
        if (selectedFile && uploadedFileInfo) {
          if (type === 1) {
            await savePictureToDB(user, realMessageId, filePath || '', fileName || '', '');
          } else {
            await saveDocumentToDB(user, realMessageId, filePath || '', fileName || '', '');
          }
        }
      } else {
        await saveTempMessageToDB(newMessage.id, inputValue, 0, type);
      }
    } else if (chats.length === 0) {
      const firstMessageTitle = inputValue.trim().slice(0, 30);
      const newChatId = `chat_${Date.now()}`;
      const newChat: Chat = {
        id: newChatId,
        title: firstMessageTitle || t.chat.defaults.newChatTitle,
        messages: [newMessage],
        lastMessage: inputValue,
        timestamp: new Date(),
      };
      targetChatId = newChatId;
      setChats([newChat]);
      setCurrentChatId(newChatId);
      // setIsWaitingForReply(false); // 立即解锁
      if (user) {
        await saveChatToDB(user, newChatId, inputValue);
        newMessage.id = `msg_${Date.now()}`;
        const res = await saveMessageToDB(user, newMessage.id, newChatId, inputValue, 0, type);
        if (res && res.message_id) realMessageId = res.message_id;
        if (selectedFile && uploadedFileInfo) {
          if (type === 1) {
            await savePictureToDB(user, realMessageId, filePath || '', fileName || '', '');
          } else {
            await saveDocumentToDB(user, realMessageId, filePath || '', fileName || '', '');
          }
        }
      } else {
        await saveTempMessageToDB(newMessage.id, inputValue, 0, type);
      }
    } else if (currentChatId) {
      targetChatId = currentChatId;
      if (user) {
        await saveChatToDB(user, currentChatId, inputValue);
        const res = await saveMessageToDB(user, newMessage.id, currentChatId, inputValue, 0, type);
        if (res && res.message_id) realMessageId = res.message_id;
        if (selectedFile && uploadedFileInfo) {
          if (type === 1) {
            await savePictureToDB(user, realMessageId, filePath || '', fileName || '', '');
          } else {
            await saveDocumentToDB(user, realMessageId, filePath || '', fileName || '', '');
          }
        }
      } else {
        await saveTempMessageToDB(newMessage.id, inputValue, 0, type);
      }
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
      // setIsWaitingForReply(false); // 立即解锁
    }

    setInputValue("");
    setSelectedFile(null);
    setFileUploadProgress(0);
    setUploadedFileInfo(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    // 重置textarea高度
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // 1. 如果有旧的定时器，先清除
    if (responseTimeoutTimer.current) {
      clearTimeout(responseTimeoutTimer.current);
    }

    // 2. 启动新的超时倒计时
    responseTimeoutTimer.current = setTimeout(() => {
      // 检查当前是否还在等待中
      if (isResponseTimeout.current === false) {
        console.warn(`AI 响应超时, ChatID: ${targetChatId}`);
        isResponseTimeout.current = true; // 拒绝后续消息
        setIsWaitingForReply(false);      // 解锁 UI
        setThinkingTime(0);               // 重置计时

        // 使用之前捕获的 targetChatId 确保消息插入正确的对话
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === targetChatId) {
               return {
                 ...chat,
                 messages: [
                   ...chat.messages,
                   {
                     id: `timeout_${Date.now()}`,
                     content: "响应超时，请重试。",
                     sender: "bot",
                     timestamp: new Date(),
                     type: 0
                   }
                 ]
               };
            }
            return chat;
          });
        });
      }
    }, RESPONSE_TIMEOUT_MS);
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
      alert(t.chat.alerts.renameFailed);
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
      alert(t.chat.alerts.deleteFailed);
    }
  }

  // 语音录制
  const toggleRecording = async () => {
    if (!isReadyToChat && !isRecording) {
      toastAlert({ title: t.chat.voice.notReadyToChat, description: '' });
      await connectRoom();
      return;
    }
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
          title: t.chat.voice.micCloseFailed,
          description: error instanceof Error && error.message ? error.message : String(error) || t.chat.defaults.devicePermissionCheck,
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
          title: t.chat.voice.micNotFound,
          description: t.chat.voice.micNotFound,
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
          title: t.chat.voice.micAuthFailed,
          description: error instanceof Error && error.message ? error.message : String(error) || t.chat.defaults.devicePermissionCheck,
        });
      }
    }
  };

  // 格式化时间
  const formatTime = (date: Date | string) => {
    // 情况一：处理从数据库来的、带有错误 'Z' 标签的字符串
    if (typeof date === 'string') {
      // 字符串格式: "2025-08-29T15:29:56.193Z"
      // 我们通过 'T' 分割，直接提取时间部分，忽略 'Z'
      const timePart = date.split('T')[1];
      if (timePart) {
        // 截取前8个字符 "HH:mm:ss"
        return timePart.substring(0, 8);
      }
    }

    // 情况二：处理用户刚发送的新消息 (这是一个正确的 Date 对象)
    if (date instanceof Date) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    // 兜底
    return "00:00:00";
  };

  // 时间分组
  const getTimeGroup = (date: Date) => {
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 1) return t.sidebar.today
    if (diffDays <= 30) return t.sidebar.last30Days
    return t.sidebar.last6Months
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
    console.log("lhf 发送预设消息：", question);
  }

  // 新建对话时，创建 tempChat（AI欢迎语），currentChatId=null
  const createNewChat = (presetQuestion?: string) => {
    connectRoom();
    const newChatId = `chat_${Date.now()}`;
    const welcomeMsg: Message = {
      id: `msg_${Date.now()}`,
      content: t.chat.aiGreeting,
      sender: "bot",
      timestamp: new Date(),
      type: 0,
    };
    const newTempChat: Chat = {
      id: newChatId,
      title: t.chat.defaults.newChatTitle,
      messages: [welcomeMsg],
      lastMessage: "",
      timestamp: new Date(),
    };
    setTempChat(newTempChat);
    setCurrentChatId(null);
    setInputValue(presetQuestion || "");
    // 重置textarea高度
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    setTimeout(() => {
      inputRef.current?.focus();
      if (presetQuestion) {
        sendPresetMessage(presetQuestion);
      }
    }, 100);
  };

  // 切换聊天窗口
  const selectChat = (chatId: string) => {
    setTempChat(null);
    setCurrentChatId(chatId)
    setTimeout(() => {
      scrollToBottom()
      inputRef.current?.focus()
    }, 200)
    if (isRecording) {
      toggleRecording();
    }
    if (room && room.state === 'disconnected') {
      console.log("lhf 切换聊天尝试连接room")
      connectRoom();
    }
  }

  // 返回欢迎界面
  const backToWelcome = async () => {
    /*if (room && room.state !== 'disconnected') {
      try {
        await room.disconnect();
      } catch (e) {
        console.error('回到欢迎界面，断开 livekit 失败', e);
      }
    }*/
    if (isRecording) {
      toggleRecording();
    }
    setCurrentChatId(null);
    setTempChat(null);
  }

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
      alert(t.chat.alerts.nicknameUpdateFailed);
    }
  };

  // 文件类型转int - 复用renderFileIcon的逻辑
  function renderFileIconByType(type: number) {
    switch(type) {
      case 1: return <Image className="w-5 h-5" />;
      case 2: return <FileText className="w-5 h-5" />;
      case 3: return <FileIcon className="w-5 h-5" />;
      case 4: return <FileIcon className="w-5 h-5" />;
      case 5: return <FileQuestion className="w-5 h-5" />;
      default: return null;
    }
  }

  // 根据type渲染文件图标
  function renderFileIcon(file: File) {
    const mime = file.type;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (mime.startsWith("image/")) return <Image className="w-5 h-5" />;
    if (mime === "text/plain") return <FileText className="w-5 h-5" />;
    if (mime === "application/pdf") return <FileIcon className="w-5 h-5" />;
    if (mime === "application/msword" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return <FileIcon className="w-5 h-5" />;
    // 兜底：如果 MIME type 为空，再用后缀
    if (!mime) {
      if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(ext || "")) return <Image className="w-5 h-5" />;
      if (["txt", "md"].includes(ext || "")) return <FileText className="w-5 h-5" />;
      if (["pdf"].includes(ext || "")) return <FileIcon className="w-5 h-5" />;
      if (["doc", "docx"].includes(ext || "")) return <FileIcon className="w-5 h-5" />;
    }
    // 其它未知类型
    return <FileQuestion className="w-5 h-5" />;
  };

  // 文件上传状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUploadProgress, setFileUploadProgress] = useState<number>(0);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ file_path: string; file_name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isWaitingForReply || isUploading) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB 限制
      toastAlert({ title: t.chat.fileUpload.sizeLimit, description: t.chat.fileUpload.sizeLimitDesc });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // 设置初始状态
    setSelectedFile(file);
    setFileUploadProgress(0); // 进度条暂时无法精确显示，先置为0
    setUploadedFileInfo(null);
    setIsUploading(true);

    try {
      // 使用 fetch API 进行流式上传
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          // 发送自定义请求头，供后端读取文件元数据
          'x-file-name': encodeURIComponent(file.name),
          'x-file-type': encodeURIComponent(file.type),
        },
        // 直接将 File 对象作为请求体，它本身就是可读流
        body: file,
        // 对于 Node.js v18+ 的 fetch，建议添加此项以确保流式传输
        // @ts-ignore - 'duplex' 在某些旧的TS定义中可能不存在，但在现代浏览器和Node.js中是支持的
        duplex: 'half',
      });

      setIsUploading(false); // 上传过程结束（无论成功或失败）

      if (response.ok) {
        // 如果服务器返回成功 (status 200-299)
        const res = await response.json();
        setUploadedFileInfo(res);
        setFileUploadProgress(100); // 标记为上传完成
      } else {
        // 如果服务器返回错误
        const error = await response.json().catch(() => ({ error: response.statusText }));
        toastAlert({ title: t.chat.fileUpload.uploadFailed, description: error.error || t.chat.fileUpload.uploadFailedDesc });
        setSelectedFile(null); // 清理状态
        setUploadedFileInfo(null);
      }
    } catch (error) {
      // 如果发生网络错误等
      setIsUploading(false);
      toastAlert({ title: t.chat.fileUpload.uploadFailed, description: t.chat.fileUpload.networkError });
      setSelectedFile(null);
      setUploadedFileInfo(null);
    } finally {
      // 确保文件输入被清空
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }

    // 选择文件后立即聚焦输入框 (保留您原有的逻辑)
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const converter = useMemo(() => new showdown.Converter({
    noHeaderId: true,       // 不为标题生成 id
    simplifiedAutoLink: true, // 简化自动链接
    strikethrough: true,      // 支持删除线
    tables: true,             // 支持表格
    ghCompatibleHeaderId: true,
  }), []);

  // --- 在 return 之前添加加载和重定向中的状态处理 ---
  // 这可以防止在重定向发生前短暂显示聊天界面，从而避免UI闪烁
  if (status === 'loading' || (status === 'authenticated' && (session?.user as any)?.role === 'root')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>{t.chat.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 左下角浮动图标按钮，仅在侧边栏关闭时显示 */}
      {sidebarCollapsed && (
        <div
          className="fixed left-4 bottom-4 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer z-50"
          title={t.sidebar.expandTooltip}
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
            title={sidebarCollapsed ? t.sidebar.expandTooltip : t.sidebar.collapseTooltip}
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
                {t.sidebar.newChatButton}
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
                            <p className="text-sm truncate pr-10">
                              {(chat.title.length > 15) ? `${chat.title.substring(0, 15)}...` : chat.title}
                            </p>
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
                                    {t.sidebar.rename}
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
                                    {t.sidebar.delete}
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
                  <p className="text-sm">{t.sidebar.noChats}</p>
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
                      title={t.sidebar.editNicknameTooltip}
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
                    title={t.sidebar.logoutTooltip}
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
                  <LogIn className="h-4 w-4 mr-2" /> {t.sidebar.loginButton}
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
            title={t.sidebar.expandTooltip}
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
                    title={t.chat.header.backToWelcome}
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border border-white flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div>
                    <h1 className="font-semibold">{t.chat.header.aiAssistant}</h1>
                    <p className="text-sm text-muted-foreground">
                      {(() => {
                          if (!isClientConnected) return <span className="text-red-600 font-semibold">{t.chat.header.status.offline}</span>;
                          if (!isAgentConnected) return <span className="text-orange-500 font-semibold">{t.chat.header.status.connecting}</span>;
                          return <>
                            <span className="text-blue-600 font-semibold">{t.chat.header.status.online}</span> • {t.chat.header.status.features}
                          </>;
                        })()}
                      {user && (
                        <span className="ml-2">
                          • {t.chat.header.loggedInAs} <span className="font-semibold">{user.nickname?.trim() || user.username?.trim() || user.name?.trim() || user.email}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 消息区域 */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {/* --- 带日期分组的渲染逻辑 --- */}
                  {currentChat.messages.reduce<React.ReactNode[]>((acc, message, index) => {
                    const lastMessage = index > 0 ? currentChat.messages[index - 1] : null;

                    // 辅助函数：从 Date 或 string 中获取 YYYY-MM-DD 格式的日期
                    const getMessageDate = (timestamp: Date | string) => {
                      // console.log("Processing timestamp:", timestamp, "| Type:", typeof timestamp);
                      // 情况一：处理新发送的消息 (Date 对象)
                      if (timestamp instanceof Date) {
                        const year = timestamp.getFullYear();
                        const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                        const day = String(timestamp.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                      }
                      // 情况二：处理历史消息 (字符串)
                      if (typeof timestamp === 'string' && timestamp.includes('T')) {
                        // 直接从 "2025-08-29T10:52:19.xxxZ" 中截取 "2025-08-29"
                        // 这是最可靠的方法，完全避免了时区转换问题。
                        return timestamp.split('T')[0];
                      }
                      // 兜底逻辑
                      return new Date().toISOString().split('T')[0];
                    };

                    const currentDate = getMessageDate(message.timestamp);
                    const lastDate = lastMessage ? getMessageDate(lastMessage.timestamp) : null;

                    // 如果是第一条消息，或者当前消息的日期与上一条不同，则插入日期分隔符
                    if (currentDate !== lastDate) {
                      acc.push(
                        <div key={`date-${currentDate}`} className="flex justify-center items-center my-4">
                          <span className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                            {new Date(currentDate).toLocaleDateString(locale, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              timeZone: 'UTC' // 强制使用UTC，确保日期不会因用户时区而偏移一天
                            })}
                          </span>
                        </div>
                      );
                    }

                    const { text: displayText, images: displayImages } = parseMessageWithImages(message.content);
                    // --- 渲染消息气泡 ---
                    acc.push(
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
                            {message.type !== 0 && (
                              <div className="flex items-center space-x-2 mb-1">
                                {renderFileIconByType(message.type)}
                                <span className="text-sm font-medium max-w-[160px] truncate inline-block align-middle">
                                  {message.fileName}
                                </span>
                              </div>
                            )}
                            {message.sender === 'bot' ? (
                              <div
                                dangerouslySetInnerHTML={{ __html: converter.makeHtml(displayText) }}
                              />
                            ) : (
                              <div className="whitespace-pre-line">{displayText}</div>
                            )}
                            {/* --- 图片网格展示 --- */}
                            {displayImages.length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                {displayImages.map((imgName, idx) => (
                                  <div
                                    key={idx}
                                    className="relative aspect-square overflow-hidden rounded-md cursor-pointer border border-gray-200 hover:opacity-90 transition-opacity group"
                                    onClick={() => setPreviewImage(imgName)}
                                  >
                                    {/* 这里的 src 指向我们刚写的 API，浏览器会自动根据 Header 进行缓存 */}
                                    <img
                                      src={`/api/chat-images/${imgName}`}
                                      alt="Room preview"
                                      className="object-cover w-full h-full"
                                      loading="lazy"
                                      // 如果加载失败（404），则隐藏该图片元素，避免显示裂图图标
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        // 或者替换为一张默认图：target.src = '/default-placeholder.jpg';
                                      }}
                                    />
                                    {/* 放大镜图标遮罩 */}
                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <div className="bg-black/50 p-1.5 rounded-full text-white">
                                          <Image className="w-4 h-4" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
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
                    );
                    return acc;
                  }, [])}
                  {/* AI思考中loading气泡 */}
                  {isWaitingForReply && (
                    <div className="flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {/* 头像部分 */}
                      <Avatar className="h-8 w-8 border border-primary/20">
                        <AvatarFallback className="bg-primary/5">
                          <Bot className="h-4 w-4 text-primary animate-pulse" />
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex flex-col space-y-1">
                        {/* 气泡主体 */}
                        <div className="relative overflow-hidden rounded-lg bg-muted/50 border border-primary/10 shadow-sm p-3">

                          <div className="flex items-center space-x-3">
                            {/* 左侧：动态波形动画 */}
                            <div className="flex items-center gap-1 h-4">
                              <span className="w-1 h-3 bg-primary/60 rounded-full animate-[bounce_1s_infinite_-0.2s]"></span>
                              <span className="w-1 h-5 bg-primary/80 rounded-full animate-[bounce_1s_infinite_-0.1s]"></span>
                              <span className="w-1 h-3 bg-primary/60 rounded-full animate-[bounce_1s_infinite]"></span>
                            </div>

                            {/* 右侧：文字描述 + 计时器 */}
                            <div className="flex flex-col justify-center min-w-[100px]"> {/* min-w 防止数字变化导致宽度抖动 */}
                              <span className="text-sm font-medium text-foreground/90 tabular-nums"> {/* tabular-nums 确保数字等宽 */}
                                Thinking... ({thinkingTime}s)
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                Spark AI is generating answers
                              </span>
                            </div>
                          </div>

                          {/* 底部流光条 */}
                          <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse" />
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
                  {/* 文件预览区域 */}
                  {selectedFile && (
                    <div className="relative inline-flex items-center p-2 pl-3 mb-2 bg-muted rounded-lg shadow-sm">
                      {/* 文件图标 */}
                      <div className="flex-shrink-0">
                        {renderFileIcon(selectedFile)}
                      </div>

                      {/* 文件名 (恢复自适应宽度，并设置最大宽度) */}
                      <span className="ml-2 text-sm max-w-[200px] truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </span>
                      {/* 状态显示区域 (紧跟在文件名后面) */}
                      <div className="ml-2 flex-shrink-0">
                        {isUploading && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {fileUploadProgress > 0 ? `${fileUploadProgress}%` : '...'}
                          </span>
                        )}
                        {!isUploading && uploadedFileInfo && (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        )}
                      </div>

                      {/* 删除/取消按钮 */}
                      <button
                        className="absolute -top-2 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-100 disabled:opacity-50"
                        onClick={() => setSelectedFile(null)}
                        title={t.chat.fileUpload.cancel}
                        type="button"
                        disabled={isUploading}
                      >
                        <X className="w-3 h-3 text-red-500" />
                      </button>
                    </div>
                  )}
                  {/* 语音提示信息，放在输入框上方 */}
                  {isRecording && (
                    <div className="mb-2 text-center">
                      <span className="text-sm text-muted-foreground animate-pulse">
                        {t.chat.voice.recordingHint}
                      </span>
                    </div>
                  )}
                  <div className="flex items-end space-x-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0"
                      disabled={Boolean(isWaitingForReply || isRecording || isUploading || (selectedFile && !uploadedFileInfo))}
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
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                        }}
                        placeholder={
                          isWaitingForReply ? t.chat.input.waitingForReply : isRecording ? t.chat.input.voiceRecording : t.chat.input.placeholder
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
                        className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-12 min-h-[40px] max-h-[120px]"
                        disabled={Boolean(isWaitingForReply || isRecording || isUploading || (selectedFile && !uploadedFileInfo))}
                        rows={1}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (!isWaitingForReply && !isRecording && inputValue.trim()) sendMessage();
                        }}
                        disabled={!inputValue.trim() || isWaitingForReply || isRecording || isUploading || Boolean(selectedFile && !uploadedFileInfo)}
                        className="absolute right-2 bottom-2 h-7 w-7"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    disabled={Boolean(isWaitingForReply || isRecording || isUploading || (selectedFile && !uploadedFileInfo))}
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
              <DialogTitle>{t.dialogs.renameChat.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chat-title">{t.dialogs.renameChat.label}</Label>
                <Input
                  id="chat-title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={t.dialogs.renameChat.placeholder}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                {t.dialogs.renameChat.cancel}
              </Button>
              <Button onClick={renameChat}>{t.dialogs.renameChat.confirm}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.dialogs.deleteChat.title}</AlertDialogTitle>
              <AlertDialogDescription>{t.dialogs.deleteChat.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.dialogs.deleteChat.cancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteChat}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t.dialogs.deleteChat.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 修改昵称弹窗 */}
        <Dialog open={showNicknameDialog} onOpenChange={setShowNicknameDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-center w-full">{t.dialogs.editNickname.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-base font-medium">{t.dialogs.editNickname.currentLabel}</div>
              {!(user?.nickname?.trim()) ? (
                <div className="text-muted-foreground">{t.dialogs.editNickname.noNickname}</div>
              ) : (
                <div className="text-primary font-semibold">{user.nickname}</div>
              )}
              <div className="text-base font-medium mt-2">{t.dialogs.editNickname.newLabel}</div>
              <Input
                value={newNickname}
                onChange={e => setNewNickname(e.target.value)}
                placeholder={t.dialogs.editNickname.placeholder}
              />
            </div>
            <DialogFooter>
              <Button
                onClick={handleNicknameChange}
              >
                {t.dialogs.editNickname.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 图片大图预览 Dialog */}
        <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
          <DialogContent className="max-w-4xl w-full p-1 bg-transparent border-none shadow-none text-white sm:max-w-[90vw] sm:h-[90vh] flex flex-col justify-center items-center">
            {/* 这里去掉了 DialogHeader/Title 以获得沉浸式体验，但要保留关闭能力 */}
            <div className="relative w-full h-full flex items-center justify-center">
              {previewImage && (
                <img
                  src={`/api/chat-images/${previewImage}`}
                  alt="Full preview"
                  className="max-w-full max-h-full object-contain rounded-md"
                />
              )}
              <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-2 right-2 bg-black/50 p-2 rounded-full hover:bg-black/70 text-white"
              >
                  <X className="w-6 h-6" />
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
  )
}
