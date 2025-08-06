import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUser, getValidVerificationCode, markVerificationCodeAsUsed } from '@/lib/db/db';

export async function POST(request: NextRequest) {
  try {
    const { email, password, nickname, verificationCode } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码是必填项' }, { status: 400 });
    }

    if (!verificationCode || verificationCode.length !== 6) {
      return NextResponse.json({ error: '验证码不能为空' }, { status: 400 });
    }

    // 验证验证码
    const validCode = await getValidVerificationCode(email, verificationCode);
    if (validCode.length === 0) {
      return NextResponse.json({ error: '验证码无效或已过期' }, { status: 400 });
    }

    // 检查用户是否已存在
    const existingUser = await getUser(email);
    if (existingUser.length > 0) {
      return NextResponse.json({ error: '用户已存在' }, { status: 409 });
    }

    // 创建用户
    await createUser(email, password, nickname || undefined);

    // 标记验证码为已使用
    await markVerificationCodeAsUsed(email, verificationCode);

    return NextResponse.json({ message: '注册成功' }, { status: 201 });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json({ error: '注册失败，请稍后重试' }, { status: 500 });
  }
} 