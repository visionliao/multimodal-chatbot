import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth.config';
import { getUser, addDocument, getDocumentsByMessageId } from '@/lib/db/db';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const users = await getUser(session.user.email);
  if (!users.length) return NextResponse.json({ error: '用户不存在' }, { status: 404 });

  const { messageId, filePath, fileName, description } = await req.json();
  if (!messageId || !filePath || !fileName) {
    return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  }
  const result = await addDocument(messageId, filePath, fileName, description);
  return NextResponse.json(result);
}

export async function GET(req: NextRequest) {
  const messageId = req.nextUrl.searchParams.get('messageId');
  if (!messageId) return NextResponse.json({ error: '参数缺失' }, { status: 400 });
  const documents = await getDocumentsByMessageId(messageId);
  const fileName = documents.length > 0 ? documents[0].file_name : null;
  return NextResponse.json({ fileName });
} 