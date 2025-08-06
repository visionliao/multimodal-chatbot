import { NextRequest, NextResponse } from 'next/server';
import { saveVerificationCode, cleanupExpiredVerificationCodes, getUser } from '@/lib/db/db';

// 生成6位随机验证码
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送邮件函数（使用静态导入解决兼容性问题）
import nodemailer from 'nodemailer';

async function sendVerificationEmail(email: string, code: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('邮件服务未配置，请检查环境变量');
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Spark AI注册验证码',
    text: `您正在注册Spark AI,验证码为${code},五分钟内有效,请尽快完成注册`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Spark AI注册验证码</h2>
        <p>您好！</p>
        <p>您正在注册Spark AI账户，验证码为：</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
          ${code}
        </div>
        <p><strong>重要提示：</strong>此验证码5分钟内有效，请尽快完成注册。</p>
        <p>如果这不是您本人的操作，请忽略此邮件。</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Spark AI团队
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '邮箱地址不能为空' }, { status: 400 });
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    // 检查邮箱是否已注册
    const existingUser = await getUser(email);
    if (existingUser.length > 0) {
      return NextResponse.json({ error: '该邮箱已被注册' }, { status: 409 });
    }

    // 清理过期验证码
    await cleanupExpiredVerificationCodes();

    // 生成6位验证码
    const code = generateVerificationCode();
    
    // 设置验证码有效期为5分钟
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 保存验证码到数据库
    await saveVerificationCode(email, code, expiresAt);

    // 发送验证码邮件
    await sendVerificationEmail(email, code);

    return NextResponse.json({ message: '验证码已发送' }, { status: 200 });
  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json({ error: '发送失败，请稍后重试' }, { status: 500 });
  }
}