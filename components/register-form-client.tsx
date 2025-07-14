'use client';

import { Form } from '@/components/register_form';
import { SubmitButton } from '@/components/submit-button';
import { Toast, useToast } from '@/components/toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function RegisterFormClient() {
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const handleRegister = async (formData: FormData, event?: React.FormEvent<HTMLFormElement>) => {
    try {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const nickname = formData.get('nickname') as string;

      // 因数据库操作只能在服务端进行，此处路由到服务端
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, nickname }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('注册成功！', 'success');
        setTimeout(() => {
          router.push('/login');
        }, 1000); // 1.0秒后跳转
      } else {
        showToast(data.error || '注册失败，请稍后重试', 'error');
      }
    } catch {
      showToast('注册失败，请稍后重试', 'error');
    }
  };

  // 包装一下Form，注入onSubmit事件
  return (
    <>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
      <Form
        action={(formData: FormData, event: React.FormEvent<HTMLFormElement>) => handleRegister(formData, event)}
      >
        <SubmitButton>Sign Up</SubmitButton>
        <p className="text-center text-sm text-gray-600">
          {'Already have an account? '}
          <Link href="/login" className="font-semibold text-gray-800">
            Sign in
          </Link>
          {' instead.'}
        </p>
      </Form>
    </>
  );
} 