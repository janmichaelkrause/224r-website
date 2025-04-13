'use server';

import { z } from 'zod';

import { createUser, getUser } from '@/lib/db/queries';
import { redis } from '@/lib/upstash';
import { hash } from 'bcrypt-ts';

import { signIn } from './auth';

const authFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export interface LoginActionState {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data';
}

export const login = async (
  _: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> => {
  try {
    console.log('Login attempt:', formData.get('email'));
    
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    console.log('Login data validated successfully');
    
    // Check for admin override credentials
    const ADMIN_EMAIL = "admin@example.com";
    const ADMIN_PASSWORD = "admin123";
    
    if (validatedData.email === ADMIN_EMAIL && validatedData.password === ADMIN_PASSWORD) {
      console.log('Using admin override credentials');
      try {
        await signIn('credentials', {
          email: validatedData.email,
          password: validatedData.password,
          redirect: false,
        });
        console.log('Admin login successful');
        return { status: 'success' };
      } catch (adminSignInError) {
        console.error('Admin sign in failed:', adminSignInError);
        return { status: 'failed' };
      }
    }

    // Check if user exists in Redis first
    if (redis) {
      console.log('Checking Redis for user');
      const redisUser = await redis.get(`user:${validatedData.email}`);
      console.log('Redis user check:', redisUser ? 'Found' : 'Not found');
    }

    // Try signing in (will use our authorize function that checks both Redis and PostgreSQL)
    try {
      await signIn('credentials', {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });
      console.log('Login successful');
      return { status: 'success' };
    } catch (signInError) {
      console.error('Sign in failed:', signInError);
      return { status: 'failed' };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid login data:', error.errors);
      return { status: 'invalid_data' };
    }
    console.error('Login error:', error);
    return { status: 'failed' };
  }
};

export interface RegisterActionState {
  status:
    | 'idle'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'user_exists'
    | 'invalid_data';
}

export const register = async (
  _: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> => {
  try {
    console.log('Registration attempt:', formData.get('email'));
    
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    
    console.log('Data validated successfully');
    
    // Check for admin override credentials
    const ADMIN_EMAIL = "admin@example.com";
    const ADMIN_PASSWORD = "admin123";
    
    if (validatedData.email === ADMIN_EMAIL) {
      console.log('Attempted registration with admin email');
      // Allow registration if password matches admin password
      if (validatedData.password === ADMIN_PASSWORD) {
        console.log('Admin registration successful - signing in directly');
        await signIn('credentials', {
          email: validatedData.email,
          password: validatedData.password,
          redirect: false,
        });
        return { status: 'success' };
      } else {
        console.error('Cannot register admin account with different password');
        return { status: 'user_exists' } as RegisterActionState;
      }
    }

    // Try Redis first if available
    if (redis) {
      try {
        console.log('Using Redis for user storage');
        
        // Check if user exists in Redis
        const existingUser = await redis.get(`user:${validatedData.email}`);
        console.log('Existing user check:', existingUser ? 'Found' : 'Not found');
        
        if (existingUser) {
          return { status: 'user_exists' } as RegisterActionState;
        }
        
        // Create a new user in Redis
        const salt = 10;
        const hashedPassword = await hash(validatedData.password, salt);
        
        const newUser = {
          id: crypto.randomUUID(),
          email: validatedData.email,
          password: hashedPassword,
          createdAt: new Date().toISOString(),
        };
        
        console.log('Created new user object:', newUser.id);
        
        // Store the user in Redis
        await redis.set(`user:${validatedData.email}`, newUser);
        console.log('User saved to Redis');
        
        // Sign in the user
        await signIn('credentials', {
          email: validatedData.email,
          password: validatedData.password,
          redirect: false,
        });
        console.log('User signed in successfully');
        
        return { status: 'success' };
      } catch (redisError) {
        console.error('Redis error during registration:', redisError);
        // Fall through to PostgreSQL if Redis fails
      }
    }

    // Fallback to PostgreSQL
    try {
      const [user] = await getUser(validatedData.email);

      if (user) {
        return { status: 'user_exists' } as RegisterActionState;
      }
      
      await createUser(validatedData.email, validatedData.password);
      await signIn('credentials', {
        email: validatedData.email,
        password: validatedData.password,
        redirect: false,
      });

      return { status: 'success' };
    } catch (dbError) {
      console.error('Database error during registration:', dbError);
      return { status: 'failed' };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'invalid_data' };
    }

    return { status: 'failed' };
  }
};
