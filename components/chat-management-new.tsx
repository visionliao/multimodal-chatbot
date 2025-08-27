'use client';

import { useState, useEffect, useRef } from 'react';
import { Trash2, User, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface MessageGroup {
  id: string;
  messages: Message[];
  type: 'conversation' | 'greeting';
  roundNumber: number;
  date: string;
}

interface ChatManagementProps {
  onBack?: () => void;
}

export function ChatManagement({ onBack }: ChatManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadChatData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const userMessages = messages.filter(m => 
        selectedUser.isTemp ? m.isTemp : m.userId === selectedUser.id
      );
      const grouped = groupMessagesByDateAndConversation(userMessages);
      setMessageGroups(grouped);
      
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

  const groupMessagesByDateAndConversation = (userMessages: Message[]): MessageGroup[] => {
    if (!userMessages.length) return [];

    const groups: MessageGroup[] = [];
    let currentRound = 1;
    let currentGroup: MessageGroup | null = null;

    // 按日期分组
    const messagesByDate: { [date: string]: Message[] } = {};
    userMessages.forEach(msg => {
      const date = new Date(msg.createdAt).toISOString().split('T')[0];
      if (!messagesByDate[date]) {
        messagesByDate[date] = [];
      }
      messagesByDate[date].push(msg);
    });

    // 处理每天的聊天记录
    Object.keys(messagesByDate).sort().forEach(date => {
      const dayMessages = messagesByDate[date];
      let i = 0;

      while (i < dayMessages.length) {
        const message = dayMessages[i];

        // 如果是用户消息，开始新的对话组
        if (message.messageSource === 0) {
          if (currentGroup) {
            groups.push(currentGroup);
          }
          
          currentGroup = {
            id: `group-${currentRound}-${date}`,
            messages: [message],
            type: 'conversation',
            roundNumber: currentRound,
            date
          };

          // 收集后续的所有用户消息，直到遇到AI回复
          i++;
          while (i < dayMessages.length && dayMessages[i].messageSource === 0) {
            currentGroup.messages.push(dayMessages[i]);
            i++;
          }

          // 收集后续的AI回复消息
          while (i < dayMessages.length && dayMessages[i].messageSource === 1) {
            currentGroup.messages.push(dayMessages[i]);
            i++;
          }

          currentRound++;
        } 
        // 如果是AI消息且没有对应的用户消息（问候语）
        else if (message.messageSource === 1) {
          if (currentGroup) {
            groups.push(currentGroup);
          }

          currentGroup = {
            id: `greeting-${currentRound}-${date}`,
            messages: [message],
            type: 'greeting',
            roundNumber: currentRound,
            date
          };

          currentRound++;
          i++;
        }
      }

      if (currentGroup) {
        groups.push(currentGroup);
        currentGroup = null;
      }
    });

    return groups;
  };

  const deleteMessageGroup = async (groupId: string) => {
    const group = messageGroups.find(g => g.id === groupId);
    if (!group) return;

    const messageIds = group.messages.map(m => m.id);
    const isTemp = group.messages[0]?.isTemp || false;
    
    try {
      const res = await fetch('/api/admin/chat-management', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds, isTemp })
      });

      if (res.ok) {
        // 重新加载数据
        loadChatData();
      }
    } catch (error) {
      console.error('删除消息组失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
                    最后消息: {new Date(user.lastMessageTime).toLocaleString('zh-CN')}
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
              className="flex-1 overflow-y-auto p-4 space-y-6"
            >
              {Object.entries(
                messageGroups.reduce((acc, group) => {
                  if (!acc[group.date]) acc[group.date] = [];
                  acc[group.date].push(group);
                  return acc;
                }, {} as { [date: string]: MessageGroup[] })
              ).map(([date, groups]) => (
                <div key={date} className="space-y-4">
                  <div className="text-center py-2">
                    <span className="bg-gray-200 px-3 py-1 rounded-full text-sm text-gray-600">
                      {formatDate(date)}
                    </span>
                  </div>
                  
                  {groups.map(group => (
                    <div key={group.id} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-sm font-medium text-gray-500">
                          {group.type === 'greeting' ? (
                            <span>{group.roundNumber}. 问候语：</span>
                          ) : (
                            <span>{group.roundNumber}. 对话组</span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteMessageGroup(group.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="删除这组消息"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                        {group.messages.map((msg, index) => (
                          <div key={msg.id}>
                            {msg.messageSource === 0 ? (
                              <div>
                                <strong className="text-blue-600">
                                  {group.roundNumber}. 问：
                                </strong>
                                <div className="ml-4 text-gray-800 text-sm mt-1">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    className="prose prose-sm max-w-none"
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                                <div className="text-xs text-gray-400 ml-4 mt-1">
                                  {formatTime(msg.createdAt)}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <strong className="text-green-600">
                                  {group.roundNumber}. 答：
                                </strong>
                                <div className="ml-4 text-gray-800 text-sm mt-1">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]}
                                    className="prose prose-sm max-w-none"
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                                <div className="text-xs text-gray-400 ml-4 mt-1">
                                  {formatTime(msg.createdAt)}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
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