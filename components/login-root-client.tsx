'use client';

import { Form } from '@/components/login_root';
import { SubmitButton } from '@/components/submit-button';
import { Toast, useToast } from '@/components/toast';
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";

export function LoginRootClient() {
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const handleLogin = async (formData: FormData, event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const res = await signIn("root", {
      redirect: false,
      username,
      password,
    });

    if (res?.ok) {
      showToast('登录成功！', 'success');
      setTimeout(() => {
        router.push('/root-dashboard');
      }, 1000);
    } else {
      showToast('登录失败，用户名或密码错误', 'error');
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
    </Form>
    </>
  );
}
