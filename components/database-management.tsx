'use client';

import { useState, useEffect } from 'react';
import { Database, Server, HardDrive, Users, MessageSquare, Image, FileText } from 'lucide-react';

interface DatabaseStats {
  summary: {
    totalUsers: number;
    totalRoots: number;
    totalChats: number;
    totalMessages: number;
    totalPictures: number;
    totalDocuments: number;
    databaseSize: number;
    databaseSizeFormatted: string;
  };
  tables: Array<{
    schemaname: string;
    tablename: string;
    size: string;
  }>;
}

interface DatabaseManagementProps {
  onBack: () => void;
}

export function DatabaseManagement({ onBack }: DatabaseManagementProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadDatabaseStats();
  }, []);

  const loadDatabaseStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/database');
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('加载数据库统计信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadDatabaseStats();
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <Database className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">无法加载数据</h3>
          <p className="mt-1 text-sm text-gray-500">请稍后重试</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">数据库管理</h2>
            <p className="text-gray-600">查看和管理数据库状态及统计信息</p>
          </div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            刷新数据
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总用户数</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(stats.summary.totalUsers + stats.summary.totalRoots)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">聊天记录</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(stats.summary.totalChats)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Image className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">图片文件</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(stats.summary.totalPictures)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">文档文件</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(stats.summary.totalDocuments)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 数据库大小信息 */}
      <div className="bg-white border rounded-lg p-6 mb-8">
        <div className="flex items-center mb-4">
          <HardDrive className="h-5 w-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">数据库大小</h3>
        </div>
        <div className="text-3xl font-bold text-green-600">
          {stats.summary.databaseSizeFormatted}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          上次更新: {lastUpdated.toLocaleString('zh-CN')}
        </p>
      </div>

      {/* 详细表信息 */}
      <div className="bg-white border rounded-lg">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center">
            <Server className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">数据表详情</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  表名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  模式
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.tables.map((table, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.tablename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {table.schemaname}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {table.size}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}