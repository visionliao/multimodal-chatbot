import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, chats, messages, tempMessages } from '@/lib/db/db';
import { eq, desc, asc, sql, inArray } from 'drizzle-orm';

// GET /api/admin/chat-management - 获取用户列表和聊天数据
export async function GET() {
  try {
    // 获取所有用户及其最后消息时间
    const usersWithLastMessage = await db.select({
      id: users.user_id,
      email: users.email,
      nickname: users.nickname,
      lastMessageTime: sql`COALESCE(MAX(${messages.created_at}), '1970-01-01 00:00:00')`,
      messageCount: sql`COUNT(${messages.message_id})`,
    })
    .from(users)
    .leftJoin(chats, eq(users.user_id, chats.user_id))
    .leftJoin(messages, eq(chats.chat_id, messages.chat_id))
    .groupBy(users.user_id, users.email, users.nickname)
    .orderBy(desc(sql`COALESCE(MAX(${messages.created_at}), '1970-01-01 00:00:00')`));

    // 获取所有用户的聊天消息
    const allMessages = await db.select({
      id: messages.message_id,
      content: messages.content,
      messageSource: messages.message_source,
      createdAt: sql<string>`${messages.created_at}::text`.as('createdAt'),
      chatId: messages.chat_id,
      userId: messages.user_id,
      userEmail: users.email,
      userNickname: users.nickname,
      isTemp: sql`0`.as('isTemp'), // 标记为普通用户消息
    })
    .from(messages)
    .innerJoin(users, eq(messages.user_id, users.user_id));

    // 获取所有游客消息
    const tempMessagesData = await db.select({
      id: tempMessages.temp_message_id,
      content: tempMessages.content,
      messageSource: tempMessages.message_source,
      createdAt: sql<string>`${tempMessages.created_at}::text`.as('createdAt'),
      chatId: sql`'temp'`.as('chatId'), // 游客消息没有chat_id
      userId: sql`'temp'`.as('userId'), // 游客统一ID
      userEmail: sql`'游客'`.as('userEmail'),
      userNickname: sql`'游客'`.as('userNickname'),
      isTemp: sql`1`.as('isTemp'), // 标记为游客消息
    })
    .from(tempMessages);

    // 合并所有消息
    const allMessagesCombined = [...allMessages, ...tempMessagesData];

    // 处理数据格式
    const processedUsers = usersWithLastMessage.map(user => ({
      id: String(user.id),
      email: String(user.email),
      nickname: user.nickname ? String(user.nickname) : null,
      lastMessageTime: String(user.lastMessageTime),
      messageCount: Number(user.messageCount) || 0,
      isTemp: false
    }));

    // 添加游客用户（如果有游客消息）
    if (tempMessagesData.length > 0) {
      const tempLastMessageTime = await db.select({
        lastMessageTime: sql`MAX(${tempMessages.created_at})`
      }).from(tempMessages);

      processedUsers.push({
        id: 'temp',
        email: '游客',
        nickname: '游客',
        lastMessageTime: String(tempLastMessageTime[0]?.lastMessageTime || '1970-01-01 00:00:00'),
        messageCount: tempMessagesData.length,
        isTemp: true
      });
    }

    // 按最后消息时间排序
    processedUsers.sort((a, b) => 
      new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
    );

    const processedMessages = allMessagesCombined.map(message => ({
      id: String(message.id),
      content: String(message.content),
      userId: String(message.userId),
      userEmail: String(message.userEmail),
      userNickname: message.userNickname ? String(message.userNickname) : null,
      messageSource: Number(message.messageSource) as 0 | 1,
      createdAt: String(message.createdAt),
      chatId: String(message.chatId),
      isTemp: Boolean(Number(message.isTemp))
    }));

    return NextResponse.json({
      users: processedUsers,
      messages: processedMessages
    });
  } catch (error) {
    console.error('获取聊天管理数据失败:', error);
    return NextResponse.json({ error: '获取聊天管理数据失败' }, { status: 500 });
  }
}

// DELETE /api/admin/chat-management - 删除消息组
export async function DELETE(request: NextRequest) {
  try {
    const { messageIds, isTemp } = await request.json();
    
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: '无效的消息ID列表' }, { status: 400 });
    }

    if (isTemp) {
      // 删除游客消息
      await db.delete(tempMessages)
        .where(inArray(tempMessages.temp_message_id, messageIds));
    } else {
      // 删除普通用户消息
      await db.delete(messages)
        .where(inArray(messages.message_id, messageIds));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除消息失败:', error);
    return NextResponse.json({ error: '删除消息失败' }, { status: 500 });
  }
}