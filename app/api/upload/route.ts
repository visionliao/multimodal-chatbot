import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth.config';

export const runtime = 'nodejs';
// 增加此路由段配置来覆盖默认的 1MB 请求体大小限制
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb', // 设置为 12MB，略大于前端10MB的限制
    },
  },
};

function isImage(mime: string, ext: string) {
  return mime.startsWith('image/') || ["jpg","jpeg","png","gif","bmp","webp"].includes(ext);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const mime = file.type;
  const fileName = `${Date.now()}_${file.name}`;

  // 判断存储路径
  let subDir = isImage(mime, ext) ? 'image' : 'file';
  const uploadDir = path.join(process.cwd(), 'upload', userEmail, subDir);
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, fileName);

  // 保存文件到本地
  const arrayBuffer = await file.arrayBuffer();
  await fs.writeFile(filePath, Buffer.from(arrayBuffer));

  // 返回相对路径和原始文件名
  return NextResponse.json({
    file_path: `/upload/${userEmail}/${subDir}/${fileName}`,
    file_name: file.name,
  });
} 