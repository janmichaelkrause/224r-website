# Authentication Override

## Overview
This document describes the implementation of an admin user override that bypasses the normal authentication flow to allow access without requiring a database migration.

## Credentials
Use the following credentials to log in or register:

- **Email**: admin@example.com
- **Password**: admin123

## Implementation Details
The override has been implemented in the following files:

1. **app/(auth)/auth.ts**:
   - Added a special case in the `authorize` function to check for admin credentials
   - If matching, returns an admin user object without checking the database or Redis

2. **app/(auth)/actions.ts**:
   - Modified the `login` function to handle admin override credentials
   - Modified the `register` function to allow registration with admin credentials

## Security Notes
- This is a temporary solution for development and testing purposes only
- In a production environment, this override should be removed or properly secured
- The admin credentials are hardcoded in the application code which is not secure for production use

## Using the Override
1. Navigate to the login page
2. Enter the admin credentials (admin@example.com / admin123)
3. You will be logged in with admin privileges

## Long-term Solution
For a proper long-term solution, the following steps should be taken:

1. Complete the database migration to increase the password field size:
   ```
   npm run db:migrate
   ```

2. Configure Redis properly by adding the following to your `.env` file:
   ```
   UPSTASH_REDIS_REST_URL=your_redis_url_here
   UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
   ```

3. Remove the hardcoded authentication override when no longer needed