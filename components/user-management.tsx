'use client';

import { useState, useEffect } from 'react';
import { User, Shield, Trash2, Calendar, Mail, Hash } from 'lucide-react';
import { getAllUsers, getUserChatStats, deleteUser } from '@/lib/db/utils';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface User {
  user_id: number;
  email: string;
  nickname?: string;
  password: string;
  created_at: string;
  role: 'normal' | 'root';
  username?: string;
  questionCount: number;
  lastActivityTime?: string;
  activityStatus: string;
  isActive: boolean;
}

interface UserManagementProps {
  onBack: () => void;
}

export function UserManagement({ onBack }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllUsers();
      
      // 合并普通用户和超级用户
      const allUsers: User[] = [
        ...data.normalUsers.map((user: any) => ({
          ...user,
          role: 'normal' as const,
          chatCount: 0,
          isActive: false
        })),
        ...data.rootUsers.map((root: any) => ({
          ...root,
          role: 'root' as const,
          user_id: root.root_id,
          email: root.username,
          nickname: root.username,
          chatCount: 0,
          isActive: true
        }))
      ];

      // 获取普通用户的聊天统计
      const usersWithStats = await Promise.all(
        allUsers.map(async (user) => {
          if (user.role === 'normal') {
            const stats = await getUserChatStats(user.user_id);
            return {
              ...user,
              questionCount: stats.questionCount,
              lastActivityTime: stats.lastActivityTime,
              activityStatus: stats.activityStatus,
              isActive: stats.isActive
            };
          }
          // 超级用户默认设置
          return {
            ...user,
            questionCount: 0,
            lastActivityTime: undefined,
            activityStatus: '管理员',
            isActive: true
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser.user_id, selectedUser.role);
      await loadUsers(); // 重新加载用户列表
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('删除用户失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (loading) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">用户管理</h2>
        <p className="text-gray-600">管理后台所有用户账户</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户信息
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  角色
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  注册时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={`${user.role}-${user.user_id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.role === 'root' ? (
                            <Shield className="h-5 w-5 text-red-600" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.nickname || user.email || user.username}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {user.email || user.username}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Hash className="w-3 h-3 mr-1" />
                          ID: {user.user_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'root' 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'root' ? '超级管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {formatDate(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.role === 'normal' ? (
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.activityStatus === '活跃' ? 'bg-green-100 text-green-800' :
                            user.activityStatus === '不活跃' ? 'bg-yellow-100 text-yellow-800' :
                            user.activityStatus === '流失' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.activityStatus}
                          </span>
                          <span className="text-xs text-gray-500">
                            {user.questionCount} 个问题
                          </span>
                          {user.lastActivityTime && (
                            <span className="text-xs text-gray-400">
                              最近: {formatDate(user.lastActivityTime)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          管理员
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无用户</h3>
            <p className="mt-1 text-sm text-gray-500">系统中还没有任何用户。</p>
          </div>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除用户 "{selectedUser?.nickname || selectedUser?.email}" 吗？
              此操作将删除该用户的所有相关数据，包括聊天记录、上传的文件等，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}