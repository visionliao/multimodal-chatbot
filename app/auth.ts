import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcrypt-ts';
import { getUser, getRootUser } from '@/lib/db/db';
import { authConfig } from '@/app/auth.config';

export default NextAuth({
  ...authConfig,
  providers: [
    // --- Provider 1: 普通用户登录 ---
    Credentials({
      // 这是 provider 的唯一标识符
      id: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'text', placeholder: 'your@email.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize({ email, password }: any) {
        let user = await getUser(email);
        if (user.length === 0) return null;
        let passwordsMatch = await compare(password, user[0].password!);
        if (passwordsMatch) {
          // 验证成功，返回 user 对象，并附加一个角色标识
          return { ...user[0], role: 'user' } as any;
        }
        return null;
      },
    }),

    // --- Provider 2: 超级用户登录 ---
    Credentials({
      // 定义一个全新的、唯一的 id
      id: 'root',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize({ username, password }: any) {
        // 调用 getRootUser 方法
        let rootUser = await getRootUser(username);
        if (rootUser.length === 0) return null;

        const passwordsMatch = await compare(password, rootUser[0].password!);

        if (passwordsMatch) {
          // 验证成功，返回 rootUser 对象，并附加角色标识
          return { ...rootUser[0], role: 'root' } as any;
        }
        return null;
      },
    }),
  ],
});
