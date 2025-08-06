'use client';

import { useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toastAlert } from "@/components/ui/alert-toast";

export function RegisterFormClient() {
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const router = useRouter();

  const handleSendCode = async () => {
    if (!email) {
      toastAlert({ title: "请输入邮箱地址", description: "" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toastAlert({ title: "请输入有效的邮箱地址", description: "" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/send-verification-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsCodeSent(true);
        setCountdown(60);
        toastAlert({ title: "验证码已发送", description: "请检查您的邮箱" });
        // Start countdown
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (response.status === 409) {
        toastAlert({ title: "邮箱已注册", description: "该邮箱已被注册，请直接登录或更换邮箱" });
      } else {
        toastAlert({ title: "发送失败", description: data.error || "请稍后重试" });
      }
    } catch (error) {
      toastAlert({ title: "网络错误", description: "请检查网络连接" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!verificationCode || verificationCode.length !== 6) {
      toastAlert({ title: "请输入6位验证码", description: "" });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nickname,
          verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toastAlert({ title: "注册成功", description: "正在跳转到登录页面..." });
        setTimeout(() => {
          router.push("/login");
        }, 1000);
      } else {
        toastAlert({ title: "注册失败", description: data.error || "请检查验证码是否正确" });
      }
    } catch (error) {
      toastAlert({ title: "网络错误", description: "请检查网络连接" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16">
      <div>
        <label htmlFor="email" className="block text-xs text-gray-600 uppercase">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs text-gray-600 uppercase">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="block text-xs text-gray-600 uppercase">
          Nickname
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          placeholder="Enter your nickname"
          autoComplete="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
        />
      </div>

      {/* 邮箱验证码区域 */}
      <div>
        <label htmlFor="verificationCode" className="block text-xs text-gray-600 uppercase">
          Verification Code
        </label>
        <div className="flex space-x-2 mt-1">
          <input
            id="verificationCode"
            name="verificationCode"
            type="text"
            placeholder="Enter 6-digit code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
            className="flex-1 appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-black focus:outline-none focus:ring-black sm:text-sm"
          />
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || countdown > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {countdown > 0 ? `${countdown}s` : isCodeSent ? "Resend" : "Send Code"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !isCodeSent}
        className="flex h-10 w-full items-center justify-center rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing Up..." : "Sign Up"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-gray-800">
          Sign in
        </Link>
      </p>
    </form>
  );
}