import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth.config';
import { getUser, addMessage, getMessagesByChatId, deleteMessage } from '@/lib/db/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const chatId = request.nextUrl.searchParams.get('chatId');
  if (!chatId) return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  const messages = await getMessagesByChatId(chatId);
  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const users = await getUser(session.user.email);
  if (!users.length) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  const userId = users[0].user_id;
  const { messageId, chatId, content, messageSource, type } = await request.json();
  if (!messageId || !chatId || !content || typeof messageSource !== 'number') {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  }
  const result = await addMessage(messageId, chatId, userId, content, messageSource, type ?? 0);
  return NextResponse.json(result);
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const { messageId } = await request.json();
  if (!messageId) return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  await deleteMessage(messageId);
  return NextResponse.json({ success: true });
} 