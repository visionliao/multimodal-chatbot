import { drizzle } from 'drizzle-orm/postgres-js';
import {
  pgTable,
  serial,
  varchar,
  uuid,
  integer,
  timestamp,
  boolean,
  text,
} from 'drizzle-orm/pg-core';
import { eq, and, sql } from 'drizzle-orm';
import postgres from 'postgres';
import { genSaltSync, hashSync } from 'bcrypt-ts';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle
let client = postgres(process.env.POSTGRES_URL!);
let db = drizzle(client);
let isInitialized = false;

// ======================
// 表定义（Drizzle Schema）
// ======================

// 管理员表 spark_root
export const roots = pgTable('spark_root', {
  root_id: serial('root_id').primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(), // 唯一用户名
  password: text('password').notNull(),
});

// 用户表 spark_users
export const users = pgTable('spark_users', {
  user_id: serial('user_id').primaryKey(),
  email: varchar('email', { length: 100 }).unique().notNull(), // unique() 确保邮箱唯一
  password: text('password').notNull(),
  nickname: varchar('nickname', { length: 50 }),
  created_at: timestamp('created_at').defaultNow(),
});

// 聊天会话表 spark_chats
export const chats = pgTable('spark_chats', {
  chat_id: varchar('chat_id', { length: 50 }) // 如 'chat_1752572458518'
    .notNull()
    .primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.user_id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 对话记录表 spark_messages
export const messages = pgTable('spark_messages', {
  message_id: varchar('message_id', { length: 50 }) // 如 'msg_1752572458519'
    .notNull()
    .primaryKey(),
  chat_id: varchar('chat_id', { length: 50 })
    .notNull()
    .references(() => chats.chat_id, { onDelete: 'cascade' }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.user_id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  message_source: integer('message_source').notNull(), // 0=用户提问, 1=模型回复
  created_at: timestamp('created_at').defaultNow(), // 替代原来的 "timestamp" 字段
  type: integer('type').default(0), // 0=text, 1=image, 2=document
});

// 文档表 spark_documents
export const documents = pgTable('spark_documents', {
  document_id: uuid('document_id').defaultRandom().primaryKey(),
  message_id: varchar('message_id', { length: 50 })
    .notNull()
    .references(() => messages.message_id, { onDelete: 'cascade' }),
  file_path: text('file_path').notNull(),
  file_name: varchar('file_name', { length: 255 }),
  description: text('description'),
  upload_time: timestamp('upload_time').defaultNow(),
});

// 图片表 spark_picture
export const pictures = pgTable('spark_picture', {
  picture_id: uuid('picture_id').defaultRandom().primaryKey(),
  message_id: varchar('message_id', { length: 50 })
    .notNull()
    .references(() => messages.message_id, { onDelete: 'cascade' }),
  file_path: text('file_path').notNull(),
  file_name: varchar('file_name', { length: 255 }),
  description: text('description'),
  upload_time: timestamp('upload_time').defaultNow(),
});


// ======================
// 工具函数：确保表存在
// ======================
async function ensureTablesExist() {
  if (isInitialized) return;

  // spark_root
  await client`
    CREATE TABLE IF NOT EXISTS spark_root (
      root_id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
  `;

  // spark_users 不存在则创建
  await client`
    CREATE TABLE IF NOT EXISTS spark_users (
      user_id SERIAL PRIMARY KEY,
      email VARCHAR(100) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname VARCHAR(50),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // spark_chats
  await client`
    CREATE TABLE IF NOT EXISTS spark_chats (
      chat_id VARCHAR(50) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES spark_users(user_id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // spark_messages
  await client`
    CREATE TABLE IF NOT EXISTS spark_messages (
      message_id VARCHAR(50) PRIMARY KEY,
      chat_id VARCHAR(50) NOT NULL REFERENCES spark_chats(chat_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES spark_users(user_id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_source INTEGER NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      type INTEGER DEFAULT 0
    );
  `;

  // spark_documents
  await client`
    CREATE TABLE IF NOT EXISTS spark_documents (
      document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id VARCHAR(50) NOT NULL REFERENCES spark_messages(message_id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name VARCHAR(255),
      description TEXT,
      upload_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // spark_picture
  await client`
    CREATE TABLE IF NOT EXISTS spark_picture (
      picture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id VARCHAR(50) NOT NULL REFERENCES spark_messages(message_id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      file_name VARCHAR(255),
      description TEXT,
      upload_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  isInitialized = true;
}

// 获取用户
export async function getUser(email: string) {
  await ensureTablesExist();
  return await db.select().from(users).where(eq(users.email, email));
}

// 创建用户
export async function createUser(email: string, password: string, nickname?: string) {
  await ensureTablesExist();
  let salt = genSaltSync(10);
  let hash = hashSync(password, salt);

  return await db.insert(users).values({ email, password: hash, nickname });
}

// 更新用户昵称
export async function updateUserNickname(email: string, nickname: string) {
  await ensureTablesExist();
  return await db.update(users)
    .set({ nickname })
    .where(eq(users.email, email));
}

// 创建新的聊天会话
export async function createChat(chatId: string, userId: number, title: string) {
  await ensureTablesExist();
  // 先查询是否已存在这个 chat_id
  const existingChat = await db.select().from(chats)
    .where(eq(chats.chat_id, chatId));

  if (existingChat.length > 0) {
    return { success: true, exists: true, chat_id: chatId };
  }

  // 如果不存在则创建
  await db.insert(chats).values({
    chat_id: chatId,
    user_id: userId,
    title,
  });

  return { success: true, exists: false, chat_id: chatId };
}
// 创建或更新聊天会话（如果已存在则更新 updated_at）
export async function createOrUpdateChat(chatId: string, userId: number, title: string) {
  await ensureTablesExist();

  // 先查询是否已存在这个 chat_id
  const existingChat = await db.select().from(chats)
    .where(eq(chats.chat_id, chatId));

  if (existingChat.length > 0) {
    // 如果已存在，仅更新 updated_at 字段
    await db.update(chats)
      .set({ updated_at: sql`NOW()` })
      .where(eq(chats.chat_id, chatId));

    return { success: true, exists: true, chat_id: chatId };
  }

  // 如果不存在则创建
  await db.insert(chats).values({
    chat_id: chatId,
    user_id: userId,
    title,
  });

  return { success: true, exists: false, chat_id: chatId };
}

// 获取某个用户的所有聊天会话，按 updated_at DESC 排序
export async function getChatsByUserId(userId: number) {
  await ensureTablesExist();
  return await db.select().from(chats).where(eq(chats.user_id, userId)).orderBy(sql`updated_at DESC`);
}

// 更新聊天标题
export async function updateChatTitle(chatId: string, newTitle: string) {
  await ensureTablesExist();
  return await db.update(chats)
    .set({ title: newTitle })
    .where(eq(chats.chat_id, chatId));
}

// 删除一个聊天会话（会级联删除消息）
export async function deleteChat(chatId: string) {
  await ensureTablesExist();
  return await db.delete(chats).where(eq(chats.chat_id, chatId));
}

// 添加一条对话记录（如果已存在则更新 content）
export async function addMessage(
  messageId: string,
  chatId: string,
  userId: number,
  content: string,
  messageSource: number,
  type: number = 0
) {
  await ensureTablesExist();

  // 使用 upsert：插入或冲突时更新
  const result = await db.insert(messages)
    .values({
      message_id: messageId,
      chat_id: chatId,
      user_id: userId,
      content,
      message_source: messageSource,
      type,
    })
    .onConflictDoUpdate({
      target: messages.message_id, // 冲突字段为 message_id
      set: {
        content, // 只更新 content 字段
      },
    });

  return { success: true, message_id: messageId };
}

// 根据 chat_id 获取所有消息，按 created_at ASC 排序
export async function getMessagesByChatId(chatId: string) {
  await ensureTablesExist();
  return await db.select().from(messages).where(eq(messages.chat_id, chatId)).orderBy(sql`created_at ASC`);
}

// 删除一条消息
export async function deleteMessage(messageId: string) {
  await ensureTablesExist();
  return await db.delete(messages).where(eq(messages.message_id, messageId));
}

// 添加文档
export async function addDocument(
  messageId: string,
  filePath: string,
  fileName: string,
  description?: string
) {
  await ensureTablesExist();

  await db.insert(documents).values({
    message_id: messageId,
    file_path: filePath,
    file_name: fileName,
    description: description,
  });

  return { success: true, message_id: messageId };
}

// 获取某条消息的文档
export async function getDocumentsByMessageId(messageId: string) {
  await ensureTablesExist();
  return await db.select().from(documents)
    .where(eq(documents.message_id, messageId));
}

// 添加图片
export async function addPicture(
  messageId: string,
  filePath: string,
  fileName: string,
  description?: string
) {
  await ensureTablesExist();

  await db.insert(pictures).values({
    message_id: messageId,
    file_path: filePath,
    file_name: fileName,
    description: description,
  });

  return { success: true, message_id: messageId };
}

// 获取某条消息的图片
export async function getPicturesByMessageId(messageId: string) {
  await ensureTablesExist();
  return await db.select().from(pictures)
    .where(eq(pictures.message_id, messageId));
}
