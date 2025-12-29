import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import mime from "mime";

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = params.filename;

  // 定义图片所在的两个目录
  const baseDir = path.join(process.cwd(), "spark/image");
  const directories = ["Demorooms", "Commonarea"];

  let filePath = "";
  let fileFound = false;

  // 遍历目录寻找文件
  for (const dir of directories) {
    const tempPath = path.join(baseDir, dir, filename);
    if (fs.existsSync(tempPath)) {
      filePath = tempPath;
      fileFound = true;
      break;
    }
  }

  if (!fileFound) {
    return new NextResponse("Image not found", { status: 404 });
  }

  // 读取文件
  const fileBuffer = fs.readFileSync(filePath);

  // 获取 MIME 类型
  const mimeType = mime.getType(filePath) || "image/jpeg";

  // 返回响应，关键在于设置 Cache-Control
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": mimeType,
      // public: 允许中间人缓存
      // max-age=31536000: 缓存一年 (因为文件名确定后内容通常不变)
      // immutable: 明确告知浏览器内容不会变，甚至不需要发 304 协商请求
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}