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
import {
  RoomEvent,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  type LocalTrackPublication,
  type LocalParticipant,
  DataPacket_Kind
} from 'livekit-client';


interface Message {
  id: string
  content: string
  sender: "user" | "bot"
  timestamp: Date
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

export const AI_ERROR_CODES = {
  // 1xxx: 会话/连接层错误
  SESSION_CRITICAL_ERROR: 1001,

  // 2xxx: 环境/配置层错误
  ENV_PROXY_CONFIG_ERROR: 2001,
  LLM_CONFIG_ERROR: 2002,
  TTS_CONFIG_ERROR: 2003,

  // 3xxx: LLM 运行时错误
  LLM_API_ERROR: 3001,
  LLM_TIMEOUT: 3101,

  // 4xxx: TTS 运行时错误
  TTS_API_ERROR: 4001,
  TTS_SERVICE_DEGRADED: 4101,
};

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

  // 监听room 连接状态
  useEffect(() => {
    if (!room) return;
    // 初始状态
    setLivekitStatus(room.state === 'connected' ? 'connected' : (room.state === 'connecting' ? 'connecting' : 'disconnected'));
    // room.name 在连接前就可用，是安全的房间标识符
    console.log(`%c[DEBUG] Attaching listeners to Room (Name: ${room.name})`, 'color: gray; font-style: italic;');

    // --- 1. 房间连接状态事件 ---
    const handleConnectionStateChange = () => {
        const state = room.state;
        console.log(`%c[DEBUG] Room Connection State Changed: %c${state}`, 'color: black;', `color: ${state === 'connected' ? 'green' : 'orange'}; font-weight: bold;`);
        setLivekitStatus('connecting');
        if (state === 'connected') {
            console.groupCollapsed('%c[DEBUG] Room Connected Details', 'color: green; font-weight: bold;');
            // ✅ 正确的做法：sid 属于 participant，而不是 room。
            // 在连接成功后，localParticipant 会被分配一个 sid。
            console.log('Local Participant SID:', room.localParticipant.sid);
            console.log('Room Name:', room.name);
            console.log('Full Room Object:', room);
            if (room.remoteParticipants.size > 0) {
                console.log('Remote participants already in room:', Array.from(room.remoteParticipants.values()).map(p => p.identity));
            } else {
                console.log('Waiting for remote participant (Agent) to join...');
            }
            console.groupEnd();
        }
    };

    // --- 2. 远程参与者事件 ---
    const handleParticipantConnected = (participant: RemoteParticipant) => {
        console.groupCollapsed(`%c[EVENT] Participant Connected: %c${participant.identity}`, 'color: blue; font-weight: bold;', 'color: black;');
        console.log('Participant SID:', participant.sid); // participant 对象上确实有 sid
        console.groupEnd();
        setLivekitStatus('connected');
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
        console.groupCollapsed(`%c[EVENT] Participant Disconnected: %c${participant.identity}`, 'color: lightcoral; font-weight: bold;', 'color: black;');
        console.log('Participant SID:', participant.sid);
        console.groupEnd();
        setLivekitStatus('disconnected');
    };

    // --- 3. 远程轨道事件 ---
    const handleRemoteTrackPublished = (publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log(`%c[EVENT] Remote Track PUBLISHED by ${participant.identity}: %c${publication.source}`, 'color: purple;', 'font-weight: bold;', `(Kind: ${publication.kind})`);
    };

    const handleTrackSubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log(`%c[EVENT] ✅ Track SUBSCRIBED to ${participant.identity}: %c${track.source}`, 'color: #00dd00; font-weight: bold;', 'font-weight: bold;', `(Kind: ${track.kind})`);
    };

    const handleTrackUnsubscribed = (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
        console.log(`%c[EVENT] ⚠️ Track UNSUBSCRIBED from ${participant.identity}: %c${track.source}`, 'color: #ff8c00; font-weight: bold;', 'font-weight: bold;', `(Kind: ${track.kind})`);
    };

    // --- 4. 本地轨道事件 ---
    const handleLocalTrackPublished = (publication: LocalTrackPublication, participant: LocalParticipant) => {
        console.log(`%c[EVENT] ✅ My Local Track PUBLISHED: %c${publication.source}`, 'color: teal; font-weight: bold;', 'font-weight: bold;', `(Participant: ${participant.identity}, Kind: ${publication.kind})`);
    };

    // --- 5. 数据通道事件 ---
    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      const decoder = new TextDecoder();
      const messageText = decoder.decode(payload);
      // 只处理来自远程参与者的数据
      if (!participant) return;

      try {
          // 尝试将消息解析为 JSON，这是我们约定的信令格式
          const data = JSON.parse(messageText);

          if (data.type === 'status') {
              // 如果是状态消息，就在控制台用更显眼的方式打印出来
              if (data.status === 'error') {
                  const errorCode = data.payload?.errorCode;
                  const errorKey = Object.keys(AI_ERROR_CODES).find(key => AI_ERROR_CODES[key as keyof typeof AI_ERROR_CODES] === errorCode) || "UNKNOWN_CODE";

                  console.groupCollapsed(`%c[AGENT STATUS] ERROR RECEIVED`, 'color: red; font-weight: bold; font-size: 1.1em;');
                  console.log(`%cError Code:`, 'font-weight: bold;', `${errorCode} (${errorKey})`);
                  console.log(`%cSource:`, 'font-weight: bold;', data.payload?.source);
                  console.log(`%cDetailed Message:`, 'font-weight: bold;', data.payload?.message);
                  console.log(`%cFull Payload:`, 'font-weight: bold;', data.payload);
                  console.groupEnd();
              } else {
                  console.groupCollapsed(`%c[AGENT STATUS] ${data.status.toUpperCase()}`, 'color: #4682B4; font-weight: bold;');
                  console.log(`%cPayload:`, 'font-weight: bold;', data.payload || 'N/A');
                  console.groupEnd();
              }
          } else if (data.type === 'chat') {
              // 如果是降级后的文本聊天消息，也打印出来
              console.groupCollapsed(`%c[AGENT CHAT] TEXT MESSAGE RECEIVED`, 'color: green; font-weight: bold;');
              console.log(`%cContent:`, 'font-weight: bold;', data.content);
              console.groupEnd();
          } else {
               // 如果是未知的 JSON 格式
               console.warn(`[AGENT DATA] Received unknown JSON data structure from ${participant.identity}:`, data);
          }
      } catch (e) {
          // 如果收到的不是 JSON，说明是旧的或意外的纯文本数据，比如语音转录
          // 我们不在这里处理，让 useChatAndTranscription 来处理
          // console.log(`[AGENT DATA] Received non-JSON data from ${participant.identity}:`, messageText);
      }
    };

    // --- 绑定所有监听器 ---
    room.on(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.TrackPublished, handleRemoteTrackPublished);
    room.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    room.on(RoomEvent.DataReceived, handleDataReceived);
    // --- 初始状态检查 ---
    handleConnectionStateChange();

    // --- 清理函数 ---
    return () => {
      console.log(`%c[DEBUG] Cleaning up listeners from Room (Name: ${room.name})`, 'color: gray; font-style: italic;');
      room.off(RoomEvent.ConnectionStateChanged, handleConnectionStateChange);
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.TrackPublished, handleRemoteTrackPublished);
      room.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
      room.off(RoomEvent.DataReceived, handleDataReceived);
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
                timestamp: m.created_at ? new Date(m.created_at) : new Date(),
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
            title: firstMessageTitle || '新对话',
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
    if (livekitStatus !== 'connected') {
      toastAlert({ title: '正在连接服务器，请稍候...', description: '' });
      //在 React 组件中，connectRoom 可能是通过 props 或 useContext/useCallback 等方式传递进来的“连接房间”的方法。这个判断的作用是：只有在有可用的 connectRoom 方法时，才会去调用它，防止出现“未定义函数”的报错。
      if (livekitStatus === 'disconnected' && connectRoom) connectRoom();
      return;
    }
    if ((!inputValue.trim() && !selectedFile) || isWaitingForReply || (selectedFile && (!uploadedFileInfo || isUploading))) return;
    setIsWaitingForReply(true);

    // 发送到 livekit
    if (room && connected && room.state === 'connected') {
      try {
        await send(inputValue);
      } catch (e) {
        console.error("发送到 livekit 失败", e);
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
      setCurrentChatId(mergedChat.id);
      setTempChat(null);
      setIsWaitingForReply(false); // 立即解锁
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
        title: firstMessageTitle || "新对话",
        messages: [newMessage],
        lastMessage: inputValue,
        timestamp: new Date(),
      };
      setChats([newChat]);
      setCurrentChatId(newChatId);
      setIsWaitingForReply(false); // 立即解锁
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
      setIsWaitingForReply(false); // 立即解锁
    }

    setInputValue("");
    setSelectedFile(null);
    setFileUploadProgress(0);
    setUploadedFileInfo(null);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);

    // 模拟AI回复，包含错误处理和超时
    const errorTimeout = setTimeout(() => {
      if (isWaitingForReply) {
        const errorReply: Message = {
          id: `msg_${Date.now() + 2}`,
          content: "抱歉，回复超时了，请稍后重试。",
          sender: "bot",
          timestamp: new Date(),
          type: 0,
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
    if (livekitStatus !== 'connected' && !isRecording) {
      toastAlert({ title: '正在连接服务器，请稍候...', description: '' });
      if (livekitStatus === 'disconnected' && connectRoom) connectRoom();
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
    console.log("lhf 发送预设消息：", question);
  }

  // 新建对话时，创建 tempChat（AI欢迎语），currentChatId=null
  const createNewChat = (presetQuestion?: string) => {
    connectRoom();
    const newChatId = `chat_${Date.now()}`;
    const welcomeMsg: Message = {
      id: `msg_${Date.now()}`,
      content: "您好！我是您的Spark AI助手，有任何关于Spark公寓的问题都可以咨询我。",
      sender: "bot",
      timestamp: new Date(),
      type: 0,
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
      toastAlert({ title: '文件大小超出限制', description: '请选择不超过 10MB 的文件' });
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
        toastAlert({ title: '文件上传失败', description: error.error || '服务器返回错误' });
        setSelectedFile(null); // 清理状态
        setUploadedFileInfo(null);
      }
    } catch (error) {
      // 如果发生网络错误等
      setIsUploading(false);
      toastAlert({ title: '文件上传失败', description: '网络连接错误' });
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
                          {message.type !== 0 && (
                            <div className="flex items-center space-x-2 mb-1">
                              {renderFileIconByType(message.type)}
                              <span className="text-sm font-medium max-w-[160px] truncate inline-block align-middle">
                                {message.fileName}
                              </span>
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
                        title="取消"
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
                        disabled={Boolean(isWaitingForReply || isRecording || isUploading || (selectedFile && !uploadedFileInfo))}
                      />
                      <Button
                        size="icon"
                        onClick={() => {
                          if (!isWaitingForReply && !isRecording && inputValue.trim()) sendMessage();
                        }}
                        disabled={!inputValue.trim() || isWaitingForReply || isRecording || isUploading || Boolean(selectedFile && !uploadedFileInfo)}
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
