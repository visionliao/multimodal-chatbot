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
let client = postgres(`${process.env.POSTGRES_URL!}?sslmode=require`);
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
  chat_id: uuid('chat_id').defaultRandom().primaryKey(),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.user_id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

// 对话记录表 spark_messages
export const messages = pgTable('spark_messages', {
  message_id: uuid('message_id').defaultRandom().primaryKey(),
  chat_id: uuid('chat_id')
    .notNull()
    .references(() => chats.chat_id, { onDelete: 'cascade' }),
  user_id: integer('user_id')
    .notNull()
    .references(() => users.user_id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  message_source: integer('message_source').notNull(), // 0=用户提问, 1=模型回复
  timestamp: timestamp('timestamp').defaultNow(),
  type: integer('type').default(0), // 0=text, 1=image, 2=document
});

// 文档表 spark_documents
export const documents = pgTable('spark_documents', {
  document_id: uuid('document_id').defaultRandom().primaryKey(),
  message_id: uuid('message_id')
    .notNull()
    .references(() => messages.message_id, { onDelete: 'cascade' }),
  file_path: text('file_path').notNull(),
  description: text('description'),
  upload_time: timestamp('upload_time').defaultNow(),
});

// 图片表 spark_picture
export const pictures = pgTable('spark_picture', {
  picture_id: uuid('picture_id').defaultRandom().primaryKey(),
  message_id: uuid('message_id')
    .notNull()
    .references(() => messages.message_id, { onDelete: 'cascade' }),
  file_path: text('file_path').notNull(),
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
      chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER NOT NULL REFERENCES spark_users(user_id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // spark_messages
  await client`
    CREATE TABLE IF NOT EXISTS spark_messages (
      message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      chat_id UUID NOT NULL REFERENCES spark_chats(chat_id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES spark_users(user_id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      message_source INTEGER NOT NULL,
      "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      type INTEGER DEFAULT 0
    );
  `;

  // spark_documents
  await client`
    CREATE TABLE IF NOT EXISTS spark_documents (
      document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES spark_messages(message_id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      description TEXT,
      upload_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // spark_picture
  await client`
    CREATE TABLE IF NOT EXISTS spark_picture (
      picture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      message_id UUID NOT NULL REFERENCES spark_messages(message_id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
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

