'use client';

import Link from 'next/link';
import { Form } from '@/components/login_form';
import { SubmitButton } from '@/components/submit-button';
import { Toast, useToast } from '@/components/toast';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";

export function LoginFormClient() {
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const handleLogin = async (formData: FormData, event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.ok) {
      showToast('登录成功！', 'success');
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else {
      showToast('登录失败，账号或密码错误', 'error');
      if (event?.target) {
        const form = event.target as HTMLFormElement;
        form.reset();
      }
    }
  };

  return (
    <>
    <Toast
    message={toast.message}
    type={toast.type}
    isVisible={toast.isVisible}
    onClose={hideToast}
    />
    <Form
    action={(formData: FormData, event: React.FormEvent<HTMLFormElement>) => handleLogin(formData, event)}
    >
    <SubmitButton>Sign in</SubmitButton>
    <p className="text-center text-sm text-gray-600">
    {"Don't have an account? "}
    <Link href="/register" className="font-semibold text-gray-800">
        Sign up
    </Link>
    {' for free.'}
    </p>
    </Form>
    </>
  );
}
