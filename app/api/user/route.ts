import { NextRequest, NextResponse } from 'next/server';
import { updateUserNickname } from '@/lib/db/db';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth.config';

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: '未登录或会话失效' }, { status: 401 });
    }
    const { nickname } = await request.json();
    if (!nickname || typeof nickname !== 'string') {
      return NextResponse.json({ error: '新昵称不能为空' }, { status: 400 });
    }
    await updateUserNickname(session.user.email, nickname);
    return NextResponse.json({ message: '昵称修改成功', nickname });
  } catch (e) {
    return NextResponse.json({ error: '昵称修改失败' }, { status: 500 });
  }
} 