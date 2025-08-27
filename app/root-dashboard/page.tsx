"use client"
import React, { useState, useEffect } from "react";
import { Sparkles, LogOut, User, Database, Shield, Settings, BarChart3 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { UserManagement } from "@/components/user-management";
import { DatabaseManagement } from "@/components/database-management";
import { ChatManagement } from "@/components/chat-management";

function HomeIconButton({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
      title="恭喜发财"
      onClick={onClick}
    >
      <Sparkles className="h-5 w-5 text-white" />
    </div>
  );
}

export default function RootDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentView, setCurrentView] = useState<'dashboard' | 'users' | 'database' | 'chat' | 'security' | 'stats' | 'settings'>('dashboard');

  useEffect(() => {
    if (status !== 'loading') {
      if (status === 'unauthenticated' || (session?.user as any)?.role !== 'root') {
        router.push('/');
      }
    }
  }, [session, status, router]);

  const handleLogout = async () => {
    await signOut({ redirect: false });
    window.location.href = '/';
  };

  const handleHomeClick = () => {
    setCurrentView('dashboard');
  };

  const handleMenuClick = (view: typeof currentView) => {
    setCurrentView(view);
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>正在加载...</p>
      </div>
    );
  }

  if ((session?.user as any)?.role !== 'root') {
    return null;
  }

  // 渲染相应视图
  const renderContent = () => {
    switch (currentView) {
      case 'users':
        return <div className="flex-1 overflow-y-auto"><UserManagement onBack={handleHomeClick} /></div>;
      case 'database':
        return <div className="flex-1 overflow-y-auto"><DatabaseManagement onBack={handleHomeClick} /></div>;
      case 'chat':
        return <div className="flex-1 overflow-y-auto"><ChatManagement onBack={handleHomeClick} /></div>;
      case 'security':
        return (
          <div className="p-8 min-h-full bg-white">
            <h2 className="text-2xl font-bold mb-4">安全审计</h2>
            <p className="text-gray-600">安全审计功能开发中...</p>
          </div>
        );
      case 'stats':
        return (
          <div className="p-8 min-h-full bg-white">
            <h2 className="text-2xl font-bold mb-4">统计报表</h2>
            <p className="text-gray-600">统计报表功能开发中...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-8 min-h-full bg-white">
            <h2 className="text-2xl font-bold mb-4">系统设置</h2>
            <p className="text-gray-600">系统设置功能开发中...</p>
          </div>
        );
      default:
        return (
          <div className="bg-white p-8 min-h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

              {/* 用户管理卡片 */}
              <div
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleMenuClick('users')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold">用户管理</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">管理系统中的所有用户账户</p>
                <div className="text-2xl font-bold text-blue-600">管理用户</div>
              </div>

              {/* 数据库管理卡片 */}
              <div
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleMenuClick('database')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Database className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold">数据库管理</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">查看和管理数据库状态</p>
                <div className="text-2xl font-bold text-green-600">查看数据</div>
              </div>

              {/* 聊天管理卡片 */}
              <div
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleMenuClick('chat')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold">聊天管理</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">管理所有用户的聊天记录</p>
                <div className="text-2xl font-bold text-indigo-600">管理记录</div>
              </div>

              {/* 安全审计卡片 */}
              <div
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleMenuClick('security')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold">安全审计</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">查看系统安全日志</p>
                <div className="text-2xl font-bold text-red-600">审计日志</div>
              </div>

              {/* 统计报表卡片 */}
              <div
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleMenuClick('stats')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold">统计报表</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">查看系统使用统计</p>
                <div className="text-2xl font-bold text-orange-600">查看报表</div>
              </div>

              {/* 系统设置卡片 */}
              <div
                className="border rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                onClick={() => handleMenuClick('settings')}
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Settings className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold">系统设置</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">配置系统参数和权限</p>
                <div className="text-2xl font-bold text-purple-600">系统配置</div>
              </div>
            </div>

            {/* 底部信息 */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg max-w-7xl mx-auto">
              <h4 className="font-semibold mb-2">系统信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">当前用户：</span>
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
        );
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <div className="z-10 w-full flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex items-center space-x-3">
            <HomeIconButton onClick={handleHomeClick} />
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">超级用户控制台</h1>
              <p className="text-sm text-gray-500">欢迎回来，{(session?.user as any)?.username}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>退出登录</span>
          </Button>
        </div>

        {/* 主要内容 */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}