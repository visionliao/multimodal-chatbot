// 聊天/消息持久化工具

export const saveChatToDB = async (user: any, chatId: string, title: string) => {
  if (!user) return;
  try {
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: chatId, title: title }),
    });
  } catch (error) {
    console.error("保存聊天记录失败", error);
  }
};

export const saveMessageToDB = async (
  user: any,
  messageId: string,
  chatId: string,
  content: string,
  messageSource: number,
  type: number
) => {
  if (!user) return;
  try {
    await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: messageId,
        chatId: chatId,
        content: content,
        messageSource: messageSource, // messageSource: 0-用户question；1-大模型answer
        type: type // type： 0-文本；1-图片；2-文档
      }),
    });
  } catch (error) {
    console.error("保存消息失败", error);
  }
};

// 获取当前用户所有聊天记录（已登录）
export const getChatsByUserId = async (user: any) => {
  if (!user) return;
  try {
    const res = await fetch('/api/chat', { method: 'GET' });
    const data = await res.json();
    if (data.chats) {
      // 后端已排序，直接返回
      return data.chats;
    }
    return [];
  } catch (error) {
    console.error('获取聊天记录失败', error);
    return [];
  }
};

// 根据 chatId 获取所有消息
export const getMessagesByChatId = async (user: any, chatId: string) => {
  if (!user) return;
  try {
    const res = await fetch(`/api/message?chatId=${encodeURIComponent(chatId)}`, { method: 'GET' });
    const data = await res.json();
    if (data.messages) {
      // 后端已排序，直接返回
      return data.messages;
    }
    return [];
  } catch (error) {
    console.error('获取消息失败', error);
    return [];
  }
};

// 更新聊天标题
export const updateChatTitle = async (user: any, chatId: string, newTitle: string) => {
  if (!user) return;
  try {
    const res = await fetch('/api/chat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: chatId, newTitle: newTitle }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('更新聊天标题失败', error);
    return { success: false, error };
  }
}; 