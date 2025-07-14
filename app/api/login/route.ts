import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/db';
import { compare } from 'bcrypt-ts';

export async function POST(request: NextRequest) {
  let email: string = '';
  
  try {
    const { email: emailFromRequest, password } = await request.json();
    email = emailFromRequest;

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        { error: '邮箱和密码是必填项' },
        { status: 400 }
      );
    }

    // 数据库校验
    const users = await getUser(email);
    if (users.length === 0) {
      return NextResponse.json(
        { error: '该邮箱未注册，请先注册账户' },
        { status: 401 }
      );
    }
    const passwordsMatch = await compare(password, users[0].password!);
    if (!passwordsMatch) {
      return NextResponse.json(
        { error: '密码错误，请重新输入' },
        { status: 401 }
      );
    }

    // 校验通过，返回原有登录成功文字
    return NextResponse.json(
      { message: '登录成功' },
      { status: 200 }
    );
  } catch (error: any) {
    // 在catch块中提供详细的错误信息
    let errorMessage = '登录失败，请稍后重试';
    
    // 检查用户是否存在
    try {
      const { getUser } = await import('@/lib/db/db');
      const users = await getUser(email);
      
      if (users.length === 0) {
        errorMessage = '该邮箱未注册，请先注册账户';
      } else {
        errorMessage = '密码错误，请重新输入';
      }
    } catch (dbError) {
      // 如果数据库查询也失败，使用默认错误信息
      errorMessage = '登录失败，请检查邮箱和密码';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }
} 