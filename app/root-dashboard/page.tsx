"use client"
import React, { useEffect } from "react";
import { Sparkles, LogOut, User, Database, Shield, Settings, BarChart3 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";

function HomeIconButton() {
  return (
    <div
      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
      title="恭喜发财"
    >
      <Sparkles className="h-5 w-5 text-white" />
    </div>
  );
}

export default function RootDashboard() {
  const router = useRouter();
  // 使用 useSession Hook 获取会话状态和数据
  const { data: session, status } = useSession();

  // 1. 检查用户登录状态和角色的副作用钩子
  useEffect(() => {
    // 当状态不是 'loading' 时才执行检查
    if (status !== 'loading') {
      // 如果用户未认证，或者用户的角色不是 'root'，则重定向到首页
      if (status === 'unauthenticated' || (session?.user as any)?.role !== 'root') {
        router.push('/');
      }
    }
  }, [session, status, router]);

  // 2. 退出登录的处理函数
  const handleLogout = async () => {
    // 调用 signOut，登出后重定向到首页
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  // 在加载会话信息时，可以显示一个加载中的状态，防止页面闪烁
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>正在加载...</p>
      </div>
    );
  }

  // 如果用户不是 root，虽然 useEffect 会重定向，但最好在渲染前返回 null，避免短暂渲染未授权内容
  if ((session?.user as any)?.role !== 'root') {
    return null; 
  }

  // 只有当用户是 root 时，才渲染仪表盘内容
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="z-10 w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center space-x-3">
            <HomeIconButton />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">超级用户控制台</h1>
              {/* 从 session 中获取用户名 */}
              <p className="text-sm text-gray-500">欢迎回来，{(session?.user as any)?.username}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout} // 绑定退出登录函数
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>退出登录</span>
          </Button>
        </div>

        {/* 主要内容 (内容部分保持不变) */}
        <div className="bg-white p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 用户管理卡片 */}
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold">用户管理</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">管理系统中的所有用户账户</p>
              <div className="text-2xl font-bold text-blue-600">管理用户</div>
            </div>

            {/* ... 其他卡片代码 ... */}
            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Database className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">数据库管理</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">查看和管理数据库状态</p>
              <div className="text-2xl font-bold text-green-600">查看数据</div>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Settings className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold">系统设置</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">配置系统参数和权限</p>
              <div className="text-2xl font-bold text-purple-600">系统配置</div>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold">安全审计</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">查看系统安全日志</p>
              <div className="text-2xl font-bold text-red-600">审计日志</div>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold">统计报表</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">查看系统使用统计</p>
              <div className="text-2xl font-bold text-orange-600">查看报表</div>
            </div>

            <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold">聊天管理</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">管理所有用户的聊天记录</p>
              <div className="text-2xl font-bold text-indigo-600">管理记录</div>
            </div>
          </div>

          {/* 底部信息 */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-2">系统信息</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">当前用户：</span>
                {/* 从 session 中获取用户名 */}
                <span className="text-blue-600 font-bold">{(session?.user as any)?.username}</span>
              </div>
              <div>
                <span className="font-medium">用户类型：</span>
                <span className="text-red-600 font-bold">超级管理员</span>
              </div>
              <div>
                <span className="font-medium">登录时间：</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium">系统状态：</span>
                <span className="text-green-600 font-bold">运行正常</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}