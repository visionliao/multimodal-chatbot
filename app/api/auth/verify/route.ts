import { type NextRequest, NextResponse } from "next/server"
import { verifyCode, getUserByContact, createUser } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { contact, code, purpose, username, type } = await request.json()

    if (!contact || !code || !purpose) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 })
    }

    const isValidCode = await verifyCode(contact, code, purpose)
    if (!isValidCode) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 })
    }

    if (purpose === "register") {
      if (!username) {
        return NextResponse.json({ error: "用户名不能为空" }, { status: 400 })
      }

      const existingUser = await getUserByContact(contact)
      if (existingUser) {
        return NextResponse.json({ error: "该手机号或邮箱已注册" }, { status: 400 })
      }

      const userData = {
        username,
        ...(type === "phone" ? { phone: contact } : { email: contact }),
      }
      const user = await createUser(userData)

      return NextResponse.json({
        message: "注册成功",
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          email: user.email,
        },
      })
    } else {
      const user = await getUserByContact(contact)
      if (!user) {
        return NextResponse.json({ error: "用户不存在" }, { status: 404 })
      }

      return NextResponse.json({
        message: "登录成功",
        user: {
          id: user.id,
          username: user.username,
          phone: user.phone,
          email: user.email,
        },
      })
    }
  } catch (error) {
    console.error("验证失败:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
