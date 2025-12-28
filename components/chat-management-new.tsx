'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, User, MessageSquare, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLanguage } from '@/lib/contexts/language-context';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  email: string;
  nickname?: string | null;
  lastMessageTime: string;
  messageCount: number;
  isTemp: boolean;
}

interface Message {
  id: string;
  content: string;
  messageSource: 0 | 1;
  createdAt: string;
  chatId: string;
  userId: string;
  userEmail: string;
  userNickname?: string | null;
  isTemp: boolean;
}


interface ChatManagementProps {
  onBack?: () => void;
}

export function ChatManagement({ onBack }: ChatManagementProps) {
  const { locale } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      // 自动滚动到底部
      setTimeout(() => {
        chatContainerRef.current?.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [selectedUser, messages]);

  const loadChatData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/chat-management');
      const data = await res.json();
      setUsers(data.users || []);
      setMessages(data.messages || []);

      // 默认选择第一个用户
      if (data.users && data.users.length > 0) {
        setSelectedUser(data.users[0]);
      }
    } catch (error) {
      console.error('加载聊天数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前用户的消息，按时间戳排序
  const getCurrentUserMessages = () => {
    if (!selectedUser) return [];

    return messages
      .filter(m => selectedUser.isTemp ? m.isTemp : m.userId === selectedUser.id)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const deleteMessage = async (messageId: string, isTemp: boolean) => {
    try {
      const response = await fetch('/api/admin/chat-management', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageIds: [messageId],
          isTemp: isTemp
        }),
      });

      if (response.ok) {
        // 从本地状态中移除该消息
        setMessages(prev => prev.filter(msg => msg.id !== messageId));

        // 更新用户的消息计数
        if (selectedUser) {
          setUsers(prev => prev.map(user =>
            user.id === selectedUser.id
              ? { ...user, messageCount: Math.max(0, user.messageCount - 1) }
              : user
          ));
        }
      } else {
        console.error('删除消息失败');
      }
    } catch (error) {
      console.error('删除消息错误:', error);
    }
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;

    // 检查日期是否有效
    if (isNaN(d.getTime())) return "00:00:00";

    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* 左侧用户列表 */}
      <div className="w-80 bg-white border-r overflow-y-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">用户列表</h2>
          <p className="text-sm text-gray-500">{users.length} 位用户（含游客）</p>
        </div>
        
        <div className="divide-y">
          {users.map(user => (
            <div
              key={user.id}
              className={`p-4 cursor-pointer hover:bg-gray-50 ${
                selectedUser?.id === user.id ? 'bg-green-50 border-r-2 border-green-500' : ''
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  user.isTemp ? 'bg-orange-100' : 'bg-gray-200'
                }`}>
                  <User className={`w-5 h-5 ${
                    user.isTemp ? 'text-orange-600' : 'text-gray-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  {user.nickname && (
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.nickname}
                    </p>
                  )}
                  <p className={`text-sm ${
                        user.isTemp ? 'text-orange-600 font-medium' : 
                        user.nickname ? 'text-gray-500' : 'text-gray-900'
                      }`}>
                        {user.email}
                      </p>
                  <p className="text-xs text-gray-400">
                    最后消息: {new Date(user.lastMessageTime).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {user.messageCount} 条
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧聊天详情 */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedUser ? (
          <>
            <div className="bg-white border-b p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedUser.isTemp ? 'bg-orange-100' : 'bg-gray-200'
                }`}>
                  <User className={`w-5 h-5 ${
                    selectedUser.isTemp ? 'text-orange-600' : 'text-gray-500'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedUser.nickname || selectedUser.email}
                  </h3>
                  <p className={`text-sm ${
                    selectedUser.isTemp ? 'text-orange-600' : 'text-gray-500'
                  }`}>{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {getCurrentUserMessages().map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.messageSource === 0 ? "flex-row-reverse space-x-reverse" : ""
                  }`}
                >
                  {/* 删除按钮 */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="删除消息"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认删除消息</AlertDialogTitle>
                        <AlertDialogDescription>
                          确定要删除这条消息吗？此操作不可撤销。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMessage(message.id, message.isTemp)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  {/* 头像 */}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 flex-shrink-0">
                    {message.messageSource === 0 ? (
                      <User className="h-4 w-4 text-gray-600" />
                    ) : (
                      <Bot className="h-4 w-4 text-gray-600" />
                    )}
                  </div>

                  {/* 消息内容 */}
                  <div className={`flex flex-col space-y-1 max-w-[70%]`}>
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        message.messageSource === 0
                          ? "bg-blue-500 text-white ml-auto"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {message.messageSource === 1 ? (
                        <div>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            className="prose prose-sm max-w-none"
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line">{message.content}</div>
                      )}
                    </div>

                    {/* 时间戳 */}
                    <span
                      className={`text-xs text-gray-400 ${
                        message.messageSource === 0 ? "text-right" : "text-left"
                      }`}
                    >
                      {/* {formatTime(message.createdAt)} */}
                      {new Date(message.createdAt).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">选择用户查看聊天记录</h3>
              <p className="mt-1 text-sm text-gray-500">请点击左侧用户列表中的用户</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}