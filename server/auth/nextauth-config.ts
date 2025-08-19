import { AuthConfig } from '@auth/core';
import GoogleProvider from '@auth/core/providers/google';
import { db } from '../db';
import { users, sessions } from '@shared/schema';
import { eq } from 'drizzle-orm';

// NextAuth configuration with Google provider
export const authConfig: AuthConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      
      try {
        // Check if user exists
        const existingUser = await db.select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (existingUser.length === 0) {
          // Create new user
          await db.insert(users).values({
            id: user.id || crypto.randomUUID(),
            email: user.email,
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
            profileImageUrl: user.image || null,
            role: user.email.includes('@marinpestcontrol.com') ? 'admin' : 'employee',
            googleId: account?.providerAccountId || null,
            googleAccessToken: account?.access_token || null,
            googleRefreshToken: account?.refresh_token || null,
          });
        } else {
          // Update existing user with Google tokens
          await db.update(users)
            .set({
              googleId: account?.providerAccountId || null,
              googleAccessToken: account?.access_token || null,
              googleRefreshToken: account?.refresh_token || null,
              profileImageUrl: user.image || existingUser[0].profileImageUrl,
            })
            .where(eq(users.email, user.email));
        }
        
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        const dbUser = await db.select()
          .from(users)
          .where(eq(users.email, session.user.email))
          .limit(1);

        if (dbUser.length > 0) {
          session.user = {
            ...session.user,
            id: dbUser[0].id,
            role: dbUser[0].role,
            firstName: dbUser[0].firstName,
            lastName: dbUser[0].lastName,
          };
        }
      }
      return session;
    },
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET,
};