"use client";
import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { LoginRootClient } from "@/components/login-root-client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

function HomeIconButton() {
  return (
    <div
      className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
      title="回到主界面"
      onClick={() => window.location.href = '/'}
    >
      <Sparkles className="h-5 w-5 text-white" />
    </div>
  );
}

export default function LoginRoot() {
  // 获取会话状态和 router 实例
  const { status } = useSession();
  const router = useRouter();

  // 添加副作用钩子用于检查和重定向
  useEffect(() => {
    // 如果用户已经被认证，则直接跳转到首页
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router]);

  // 添加加载状态，防止页面闪烁
  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <p>正在加载...</p>
      </div>
    );
  }
  // 验证通过后，才渲染真实的页面内容
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <div className="flex items-center justify-center w-full gap-2">
            <HomeIconButton />
            <h3 className="text-xl font-semibold">Root user</h3>
          </div>
          <p className="text-sm text-gray-500">
            Log in with superuser credentials
          </p>
        </div>
        <LoginRootClient />
      </div>
    </div>
  );
}
