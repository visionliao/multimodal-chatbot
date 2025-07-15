import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth.config';
import { getUser, createOrUpdateChat, getChatsByUserId, updateChatTitle, deleteChat } from '@/lib/db/db';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const users = await getUser(session.user.email);
  if (!users.length) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  const userId = users[0].user_id;
  const chats = await getChatsByUserId(userId);
  return NextResponse.json({ chats });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const users = await getUser(session.user.email);
  if (!users.length) return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  const userId = users[0].user_id;
  const { chatId, title } = await request.json();
  if (!chatId || !title) return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  const result = await createOrUpdateChat(chatId, userId, title);
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const { chatId, newTitle } = await request.json();
  if (!chatId || !newTitle) return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  await updateChatTitle(chatId, newTitle);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const { chatId } = await request.json();
  if (!chatId) return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  await deleteChat(chatId);
  return NextResponse.json({ success: true });
} 