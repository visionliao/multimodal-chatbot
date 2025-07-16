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