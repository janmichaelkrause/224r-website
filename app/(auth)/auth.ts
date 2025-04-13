import { compare, hash } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { UpstashRedisAdapter } from "@next-auth/upstash-redis-adapter";
import { Redis } from "@upstash/redis";

import { redis } from '@/lib/upstash';
import { getUser } from '@/lib/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

// Only use the adapter if Redis is configured
const adapter = redis ? UpstashRedisAdapter(redis) : undefined;

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  adapter,
  providers: [
    Credentials({
      credentials: {},
      async authorize({ email, password }: any) {
        console.log('Auth attempt for:', email);
        
        // Override admin credentials - hardcoded for easy access
        const ADMIN_EMAIL = "admin@example.com";
        const ADMIN_PASSWORD = "admin123";
        
        // Check if using override credentials
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          console.log('Using override admin credentials - authentication successful');
          return {
            id: "admin-override-id",
            email: ADMIN_EMAIL,
            name: "Admin Override"
          } as any;
        }
        
        // If using Redis adapter, try to get user from Redis
        if (redis) {
          try {
            console.log('Using Redis for authentication');
            
            // Try to get the user from Redis
            const user = await redis.get(`user:${email}`);
            console.log('Redis user lookup result:', user ? 'Found' : 'Not found');
            
            if (user) {
              console.log('Checking password match');
              try {
                const passwordsMatch = await compare(password, user.password);
                console.log('Password match result:', passwordsMatch);
                if (!passwordsMatch) return null;
                console.log('Redis authentication successful');
                return user as any;
              } catch (compareError) {
                console.error('Error comparing passwords:', compareError);
                return null;
              }
            }
            
            // We don't auto-create users during login, only during registration
            console.log('User not found in Redis, checking database');
          } catch (error) {
            console.error('Error accessing Redis:', error);
          }
        } else {
          console.log('Redis not configured, using database only');
        }

        // Fallback to PostgreSQL if Redis is not available
        try {
          console.log('Trying PostgreSQL authentication');
          const users = await getUser(email);
          console.log('Database user lookup result:', users.length ? 'Found' : 'Not found');
          
          if (users.length === 0) return null;
          
          try {
            // biome-ignore lint: Forbidden non-null assertion.
            const passwordsMatch = await compare(password, users[0].password!);
            console.log('Database password match result:', passwordsMatch);
            if (!passwordsMatch) return null;
            console.log('Database authentication successful');
            return users[0] as any;
          } catch (compareError) {
            console.error('Error comparing database passwords:', compareError);
            return null;
          }
        } catch (error) {
          console.error('Failed to authenticate with database:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: ExtendedSession;
      token: any;
    }) {
      if (session.user) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
});
