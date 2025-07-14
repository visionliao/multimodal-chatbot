"use client";
import React from "react";
import { Sparkles } from "lucide-react";
import { RegisterFormClient } from '@/components/register-form-client';

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

export default function Register() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <div className="z-10 w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 shadow-xl">
        <div className="flex flex-col items-center justify-center space-y-3 border-b border-gray-200 bg-white px-4 py-6 pt-8 text-center sm:px-16">
          <div className="flex items-center justify-center w-full gap-2">
            <HomeIconButton />
            <h3 className="text-xl font-semibold">Sign Up</h3>
          </div>
          <p className="text-sm text-gray-500">
            Create an account with your email and password
          </p>
        </div>
        <RegisterFormClient />
      </div>
    </div>
  );
}
