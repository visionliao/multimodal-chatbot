import { type NextRequest, NextResponse } from "next/server"
import { createVerificationCode } from "@/lib/database"
import { sendSMSCode, sendEmailCode, generateVerificationCode, validatePhone, validateEmail } from "@/lib/verification"

export async function POST(request: NextRequest) {
  try {
    const { contact, type, purpose } = await request.json()

    if (!contact || !type || !purpose) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    if (type === "phone" && !validatePhone(contact)) {
      return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 })
    }

    if (type === "email" && !validateEmail(contact)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 })
    }

    const code = generateVerificationCode()

    await createVerificationCode({
      contact,
      code,
      type: type as "phone" | "email",
      purpose: purpose as "register" | "login",
    })

    let result
    if (type === "phone") {
      result = await sendSMSCode(contact, code)
    } else {
      result = await sendEmailCode(contact, code)
    }

    if (result.success) {
      return NextResponse.json({ message: result.message })
    } else {
      return NextResponse.json({ error: result.message }, { status: 500 })
    }
  } catch (error) {
    console.error("发送验证码失败:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
