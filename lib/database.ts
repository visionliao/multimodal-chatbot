import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface User {
  id: string
  phone?: string
  email?: string
  username: string
  created_at: string
  updated_at: string
}

export interface ChatSession {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  chat_session_id: string
  content: string
  sender: "user" | "bot"
  message_type: "text" | "file" | "audio"
  file_name?: string
  created_at: string
}

export interface VerificationCode {
  id: string
  contact: string
  code: string
  type: "phone" | "email"
  purpose: "register" | "login"
  expires_at: string
  used: boolean
  created_at: string
}

// 用户相关操作
export async function createUser(data: { phone?: string; email?: string; username: string }) {
  const result = await sql`
    INSERT INTO users (phone, email, username)
    VALUES (${data.phone || null}, ${data.email || null}, ${data.username})
    RETURNING *
  `
  return result[0] as User
}

export async function getUserByContact(contact: string) {
  const result = await sql`
    SELECT * FROM users 
    WHERE phone = ${contact} OR email = ${contact}
    LIMIT 1
  `
  return result[0] as User | undefined
}

// 验证码相关操作
export async function createVerificationCode(data: {
  contact: string
  code: string
  type: "phone" | "email"
  purpose: "register" | "login"
}) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5分钟后过期

  const result = await sql`
    INSERT INTO verification_codes (contact, code, type, purpose, expires_at)
    VALUES (${data.contact}, ${data.code}, ${data.type}, ${data.purpose}, ${expiresAt.toISOString()})
    RETURNING *
  `
  return result[0] as VerificationCode
}

export async function verifyCode(contact: string, code: string, purpose: "register" | "login") {
  const result = await sql`
    SELECT * FROM verification_codes
    WHERE contact = ${contact} 
      AND code = ${code} 
      AND purpose = ${purpose}
      AND used = FALSE 
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `

  if (result.length > 0) {
    // 标记验证码为已使用
    await sql`
      UPDATE verification_codes 
      SET used = TRUE 
      WHERE id = ${result[0].id}
    `
    return true
  }
  return false
}

// 聊天记录相关操作
export async function createChatSession(userId: string, title: string) {
  const result = await sql`
    INSERT INTO chat_sessions (user_id, title)
    VALUES (${userId}, ${title})
    RETURNING *
  `
  return result[0] as ChatSession
}

export async function getUserChatSessions(userId: string) {
  const result = await sql`
    SELECT * FROM chat_sessions
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `
  return result as ChatSession[]
}

export async function updateChatSession(sessionId: string, title: string) {
  const result = await sql`
    UPDATE chat_sessions 
    SET title = ${title}, updated_at = NOW()
    WHERE id = ${sessionId}
    RETURNING *
  `
  return result[0] as ChatSession
}

export async function deleteChatSession(sessionId: string) {
  await sql`DELETE FROM chat_sessions WHERE id = ${sessionId}`
}

// 消息相关操作
export async function createMessage(data: {
  chatSessionId: string
  content: string
  sender: "user" | "bot"
  messageType?: "text" | "file" | "audio"
  fileName?: string
}) {
  const result = await sql`
    INSERT INTO messages (chat_session_id, content, sender, message_type, file_name)
    VALUES (${data.chatSessionId}, ${data.content}, ${data.sender}, ${data.messageType || "text"}, ${data.fileName || null})
    RETURNING *
  `
  return result[0] as Message
}

export async function getChatMessages(chatSessionId: string) {
  const result = await sql`
    SELECT * FROM messages
    WHERE chat_session_id = ${chatSessionId}
    ORDER BY created_at ASC
  `
  return result as Message[]
}
