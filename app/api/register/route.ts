import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUser } from '@/lib/db/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码是必填项' }, { status: 400 });
    }
    const existingUser = await getUser(email);
    if (existingUser.length > 0) {
      return NextResponse.json({ error: '用户已存在' }, { status: 409 });
    }
    await createUser(email, password, nickname || undefined);
    return NextResponse.json({ message: '注册成功' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
} 