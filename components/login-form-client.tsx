'use client';

import Link from 'next/link';
import { Form } from '@/components/login_form';
import { SubmitButton } from '@/components/submit-button';
import { Toast, useToast } from '@/components/toast';
import { useRouter } from 'next/navigation';

export function LoginFormClient() {
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const handleLogin = async (formData: FormData, event?: React.FormEvent<HTMLFormElement>) => {
    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      // 因数据库操作只能在服务端进行，此处路由到服务端
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('登录成功！', 'success');
        setTimeout(() => {
          router.push('/');
        }, 1000); // 1.0秒后跳转
      } else {
        showToast(data.error || '登录失败', 'error');
        // 登录失败时清空表单
        if (event?.target) {
          const form = event.target as HTMLFormElement;
          form.reset();
        }
      }
    } catch {
      showToast('登录失败', 'error');
      // 异常时也清空表单
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
