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
      if (user) {
        token.nickname = (user as any).nickname;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user?.email) {
        // 每次都查数据库，确保 nickname 最新
        const users = await getUser(session.user.email);
        if (users.length > 0) {
          (session.user as any).nickname = users[0].nickname;
        }
      }
      return session;
    },
  },
};
