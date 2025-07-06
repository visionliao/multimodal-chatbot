// 模拟短信和邮箱验证码发送服务
export async function sendSMSCode(phone: string, code: string) {
  console.log(`发送短信验证码到 ${phone}: ${code}`)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (Math.random() > 0.1) {
    return { success: true, message: "验证码发送成功" }
  } else {
    return { success: false, message: "验证码发送失败，请稍后重试" }
  }
}

export async function sendEmailCode(email: string, code: string) {
  console.log(`发送邮箱验证码到 ${email}: ${code}`)
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (Math.random() > 0.1) {
    return { success: true, message: "验证码发送成功" }
  } else {
    return { success: false, message: "验证码发送失败，请稍后重试" }
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
