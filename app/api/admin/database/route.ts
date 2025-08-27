import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, roots, chats, messages, pictures, documents } from '@/lib/db/db';
import { count } from 'drizzle-orm';

// GET /api/admin/database - 获取数据库统计信息
export async function GET() {
  try {
    // 获取各表的记录数量
    const userCount = await db.select({ count: count() }).from(users);
    const rootCount = await db.select({ count: count() }).from(roots);
    const chatCount = await db.select({ count: count() }).from(chats);
    const messageCount = await db.select({ count: count() }).from(messages);
    const pictureCount = await db.select({ count: count() }).from(pictures);
    const documentCount = await db.select({ count: count() }).from(documents);

    // Note: Database size queries require special handling with current Drizzle setup
    // For now, returning placeholder values
    const dbSize = 0;

    return NextResponse.json({
      summary: {
        totalUsers: userCount[0]?.count || 0,
        totalRoots: rootCount[0]?.count || 0,
        totalChats: chatCount[0]?.count || 0,
        totalMessages: messageCount[0]?.count || 0,
        totalPictures: pictureCount[0]?.count || 0,
        totalDocuments: documentCount[0]?.count || 0,
        databaseSize: dbSize,
        databaseSizeFormatted: formatBytes(dbSize)
      },
      tables: []
    });
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    return NextResponse.json({ error: '获取数据库信息失败' }, { status: 500 });
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}