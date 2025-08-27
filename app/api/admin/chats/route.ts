import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { chats, users, messages } from '@/lib/db/db';
import { eq, sql, count, desc } from 'drizzle-orm';

// GET /api/admin/chats - 获取所有聊天记录
export async function GET() {
  try {
    // 获取所有聊天记录，包含用户信息
    const allChats = await db
      .select({
        chat_id: chats.chat_id,
        user_id: chats.user_id,
        title: chats.title,
        created_at: chats.created_at,
        updated_at: chats.updated_at,
        user_email: users.email,
        user_nickname: users.nickname,
        message_count: sql`COALESCE(${count(messages.message_id)}, 0)`.as('message_count')
      })
      .from(chats)
      .leftJoin(users, eq(chats.user_id, users.user_id))
      .leftJoin(messages, eq(chats.chat_id, messages.chat_id))
      .groupBy(chats.chat_id, users.email, users.nickname)
      .orderBy(desc(chats.updated_at));

    return NextResponse.json({ chats: allChats });
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    return NextResponse.json({ error: '获取聊天记录失败' }, { status: 500 });
  }
}

// DELETE /api/admin/chats - 删除聊天记录
export async function DELETE(request: NextRequest) {
  try {
    const { chatId } = await request.json();
    
    if (!chatId) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    await db.delete(chats).where(eq(chats.chat_id, chatId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除聊天记录失败:', error);
    return NextResponse.json({ error: '删除聊天记录失败' }, { status: 500 });
  }
}