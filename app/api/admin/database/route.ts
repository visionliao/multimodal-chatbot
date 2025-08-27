import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/db';
import { users, roots, chats, messages, pictures, documents, verificationCodes, tempMessages } from '@/lib/db/db';
import { count, sql } from 'drizzle-orm';

// GET /api/admin/database - 获取数据库统计信息
export async function GET() {
  try {
    // 获取各表的记录数量
    const userCount = await db.select({ count: count() }).from(users);
    const rootCount = await db.select({ count: count() }).from(roots);
    const chatCount = await db.select({ count: count() }).from(chats);
    const messageCount = await db.select({ count: count() }).from(messages);
    const pictureCount = await db.select({ count: count() }).from(pictures);
    const documentCount = await db.select({ count: count() }).from(documents);
    const verificationCodeCount = await db.select({ count: count() }).from(verificationCodes);
    const tempMessageCount = await db.select({ count: count() }).from(tempMessages);

    // 获取数据库大小
    const dbSize = await getDatabaseSize();

    // 获取表结构信息
    const tableStructures = await getTableStructures();

    return NextResponse.json({
      summary: {
        totalUsers: userCount[0]?.count || 0,
        totalRoots: rootCount[0]?.count || 0,
        totalChats: chatCount[0]?.count || 0,
        totalMessages: messageCount[0]?.count || 0,
        totalPictures: pictureCount[0]?.count || 0,
        totalDocuments: documentCount[0]?.count || 0,
        totalVerificationCodes: verificationCodeCount[0]?.count || 0,
        totalTempMessages: tempMessageCount[0]?.count || 0,
        databaseSize: dbSize,
        databaseSizeFormatted: formatBytes(dbSize)
      },
      tables: tableStructures
    });
  } catch (error) {
    console.error('获取数据库信息失败:', error);
    return NextResponse.json({ error: '获取数据库信息失败' }, { status: 500 });
  }
}

async function getDatabaseSize(): Promise<number> {
  try {
    // 使用 PostgreSQL 的系统表来获取数据库大小
    const result = await db.execute(sql`
      SELECT pg_database_size(current_database()) as size
    `);

    // Handle the result based on actual structure
    if (result && Array.isArray(result)) {
      return Number(result[0]?.size) || 0;
    } else if (result && (result as any).rows && Array.isArray((result as any).rows)) {
      return Number((result as any).rows[0]?.size) || 0;
    }
    return 0;
  } catch (error) {
    console.error('获取数据库大小失败:', error);
    return 0;
  }
}

async function getTableStructures() {
  try {
    // 获取所有表的结构信息
    const tables = [
      'spark_root',
      'spark_users',
      'spark_chats',
      'spark_messages',
      'spark_documents',
      'spark_picture',
      'spark_verification_codes',
      'spark_temp_messages'
    ];

    const tableStructures = [];

    for (const tableName of tables) {
      try {
        // 获取表的记录数量
        const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${tableName}`));
        let rowCount = 0;
        if (countResult) {
          if (Array.isArray(countResult)) {
            rowCount = Number(countResult[0]?.count) || 0;
          } else if ((countResult as any).rows) {
            rowCount = Number((countResult as any).rows[0]?.count) || 0;
          }
        }

        // 获取表的基本信息和大小
        const tableInfo = await db.execute(sql.raw(`
          SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
          FROM pg_tables 
          WHERE tablename = '${tableName}'
        `));

        // 获取表的字段信息
        const columns = await db.execute(sql.raw(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns 
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
        `));

        let tableData = null;
        if (tableInfo) {
          if (Array.isArray(tableInfo)) {
            tableData = tableInfo[0];
          } else if ((tableInfo as any).rows) {
            tableData = (tableInfo as any).rows[0];
          }
        }

        let columnData = [];
        if (columns) {
          if (Array.isArray(columns)) {
            columnData = columns;
          } else if ((columns as any).rows) {
            columnData = (columns as any).rows;
          }
        }

        if (tableData) {
          tableStructures.push({
            schemaname: tableData.schemaname || 'public',
            tablename: tableData.tablename || tableName,
            size: tableData.size || 'N/A',
            rowCount: rowCount,
            columns: columnData
          });
        } else {
          // Fallback if table exists but pg_tables query fails
          tableStructures.push({
            schemaname: 'public',
            tablename: tableName,
            size: 'N/A',
            rowCount: rowCount,
            columns: columnData
          });
        }
      } catch (tableError) {
        console.error(`Error processing table ${tableName}:`, tableError);
        // Continue with other tables even if one fails
      }
    }

    return tableStructures;
  } catch (error) {
    console.error('获取表结构信息失败:', error);
    return [];
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}