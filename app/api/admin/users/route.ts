import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, roots, verificationCodes } from '@/lib/db/db';
import { eq } from 'drizzle-orm';

// GET /api/admin/users - 获取所有用户列表
export async function GET() {
  try {
    // 获取所有普通用户
    const allUsers = await db.select().from(users).orderBy(users.created_at);
    
    // 获取所有超级用户
    const allRoots = await db.select().from(roots).orderBy(roots.root_id);
    
    return NextResponse.json({
      users: allUsers,
      roots: allRoots
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

// DELETE /api/admin/user - 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const { userId, userType } = await request.json();
    
    if (!userId || !userType) {
      return NextResponse.json({ error: '参数缺失' }, { status: 400 });
    }

    if (userType === 'normal') {
      try {
        // 检查用户是否存在
        const userData = await db.select({ email: users.email }).from(users).where(eq(users.user_id, userId));
        if (userData.length === 0) {
          return NextResponse.json({ error: '用户不存在' }, { status: 404 });
        }

        const email = userData[0]?.email;
        if (email) {
          try {
            await db.delete(verificationCodes).where(eq(verificationCodes.email, email));
          } catch (verificationError) {
            // 忽略验证码删除错误，继续删除用户
            console.warn('删除验证码记录时出错:', verificationError);
          }
        }

        // 删除用户（会自动级联删除 chats, messages, documents, pictures）
        await db.delete(users).where(eq(users.user_id, userId));
      } catch (userError) {
        console.error('删除普通用户时出错:', userError);
        throw userError;
      }
    } else if (userType === 'root') {
      try {
        // 检查超级用户是否存在
        const rootData = await db.select({ root_id: roots.root_id }).from(roots).where(eq(roots.root_id, userId));
        if (rootData.length === 0) {
          return NextResponse.json({ error: '超级用户不存在' }, { status: 404 });
        }

        await db.delete(roots).where(eq(roots.root_id, userId));
      } catch (rootError) {
        console.error('删除超级用户时出错:', rootError);
        throw rootError;
      }
    } else {
      return NextResponse.json({ error: '无效的用户类型' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({
      error: '删除用户失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}