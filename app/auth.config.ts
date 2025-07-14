// import { NextAuthConfig } from 'next-auth';

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
      if (token.nickname) {
        (session.user as any).nickname = token.nickname;
      }
      return session;
    },
  },
};
