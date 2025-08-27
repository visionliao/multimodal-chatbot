import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { messages } from '@/lib/db/db';
import { eq, count, desc, and } from 'drizzle-orm';

// GET /api/admin/user-stats/[userId] - 获取用户统计信息
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: '无效的用户ID' }, { status: 400 });
    }

    // 获取用户提问的消息数量 (message_source = 0)
    const userQuestions = await db
      .select({ count: count() })
      .from(messages)
      .where(and(eq(messages.user_id, userId), eq(messages.message_source, 0)));

    const questionCount = userQuestions[0]?.count || 0;

    // 获取用户最后一条消息的时间
    const lastMessage = await db
      .select({ created_at: messages.created_at })
      .from(messages)
      .where(eq(messages.user_id, userId))
      .orderBy(desc(messages.created_at))
      .limit(1);

    const lastActivityTime = lastMessage[0]?.created_at || null;

    // 计算活动状态
    let activityStatus = '未使用';
    if (lastActivityTime) {
      const now = new Date();
      const lastActivity = new Date(lastActivityTime);
      const daysDiff = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 7) {
        activityStatus = '活跃';
      } else if (daysDiff <= 30) {
        activityStatus = '不活跃';
      } else {
        activityStatus = '流失';
      }
    }

    return NextResponse.json({
      stats: {
        questionCount,
        lastActivityTime,
        activityStatus,
        isActive: questionCount > 0
      }
    });
  } catch (error) {
    console.error('获取用户统计信息失败:', error);
    return NextResponse.json({ error: '获取用户统计信息失败' }, { status: 500 });
  }
}