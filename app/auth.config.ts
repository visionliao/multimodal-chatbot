// import { NextAuthConfig } from 'next-auth';
import { getUser } from '@/lib/db/db';

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      // 当 user 对象存在时,将 user 的信息添加到 token 中。
      if (user) {
        token.role = (user as any).role; // 添加角色
        if ((user as any).role === 'user') {
          // 普通用户
          token.nickname = (user as any).nickname;
          token.user_id = (user as any).user_id;
        } else if ((user as any).role === 'root') {
          // 超级用户
          token.username = (user as any).username;
          token.root_id = (user as any).root_id;
        }
      }
      return token;
    },
    async session({ session, token }: any) {
      // session 回调每次被调用时，从 token 中读取用户信息, 并将其附加到 session 对象上
      if (session.user) {
        const sessionUserAsAny = session.user as any;
        sessionUserAsAny.role = token.role; // 附加角色
        if (token.role === 'user') {
          // 普通用户，每次从数据库读取最新数据，因为用户可能修改昵称
          const users = await getUser(session.user.email!);
          if (users.length > 0) {
            sessionUserAsAny.nickname = users[0].nickname;
            sessionUserAsAny.user_id = Number(users[0].user_id);
          }
        } else if (token.role === 'root') {
          // 超级用户
          sessionUserAsAny.username = token.username;
          sessionUserAsAny.root_id = token.root_id;
        }
      }
      return session;
    },
  },
};
