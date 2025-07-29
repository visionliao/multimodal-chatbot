import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/auth.config';
import { pipeline } from 'stream/promises';
import { Writable, Readable } from 'stream';

// 声明此路由使用 Node.js 运行时环境，这对于文件系统操作是必须的
export const runtime = 'nodejs';

function isImage(mime: string, ext: string) {
  return mime.startsWith('image/') || ["jpg","jpeg","png","gif","bmp","webp"].includes(ext);
}

// 辅助函数：用于流式写入文件
function createWriteStream(filePath: string): Writable {
    return new Writable({
      async write(chunk, encoding, callback) {
        try {
          // 使用 appendFile 以支持流式写入数据块
          await fs.appendFile(filePath, chunk);
          callback();
        } catch (err: any) {
          callback(err);
        }
      },
    });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  // 1. 不再使用 req.formData()，而是从请求头获取文件元数据
  const fileNameHeader = req.headers.get('x-file-name');
  const fileTypeHeader = req.headers.get('x-file-type');

  // 前端必须在 fetch 请求中提供这些自定义头
  if (!fileNameHeader || !fileTypeHeader) {
    return NextResponse.json({ error: 'Bad Request: Missing file metadata headers' }, { status: 400 });
  }

  // 2. 准备文件路径和名称
  const originalFileName = decodeURIComponent(fileNameHeader);
  const fileType = decodeURIComponent(fileTypeHeader);
  const ext = originalFileName.split('.').pop()?.toLowerCase() || '';
  // 使用原有的文件名生成逻辑，但基于从 header 获取的原始文件名
  const uniqueFileName = `${Date.now()}_${originalFileName}`;
  // 使用原有的存储路径判断逻辑
  const subDir = isImage(fileType, ext) ? 'image' : 'file';
  const uploadDir = path.join(process.cwd(), 'upload', userEmail, subDir);
  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, uniqueFileName);

  // 3. 流式保存文件，替代原有的 arrayBuffer 和 writeFile
  try {
    const webStream = req.body;
    if (!webStream) {
      return NextResponse.json({ error: 'Bad Request: No body stream found' }, { status: 400 });
    }
    // 将 Web Stream (来自 req.body) 转换为 Node.js Stream
    const nodeStream = Readable.fromWeb(webStream as any);
    // 使用 pipeline 安全地将数据流写入文件
    await pipeline(nodeStream, createWriteStream(filePath));
  } catch (error) {
    console.error('Error saving file via stream:', error);
    // 尝试清理失败后可能留下的不完整文件
    await fs.unlink(filePath).catch(e => console.error("Failed to clean up incomplete file:", e));
    return NextResponse.json({ error: 'Internal Server Error: File saving failed' }, { status: 500 });
  }

  // 4. 返回与您原有格式一致的成功响应
  return NextResponse.json({
    file_path: `/upload/${userEmail}/${subDir}/${uniqueFileName}`,
    file_name: originalFileName, // 返回原始文件名
  });
}