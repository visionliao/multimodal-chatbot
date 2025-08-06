import { NextRequest, NextResponse } from 'next/server';
import { addTempMessage } from '@/lib/db/db';

// 创建或更新临时用户消息
export async function POST(request: NextRequest) {
  try {
    const { tempMessageId, content, messageSource, type = 0 } = await request.json();

    if (!tempMessageId || content === undefined || messageSource === undefined) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const result = await addTempMessage(tempMessageId, content, messageSource, type ?? 0);
    return NextResponse.json(result);
  } catch (error) {
    console.error('创建临时消息失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}

