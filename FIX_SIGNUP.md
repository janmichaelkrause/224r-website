# Fix for User Registration Issue

## Problem
User registration was failing with "Failed to create an Account!" error because the database schema's `password` field in the `User` table is too small to store bcrypt password hashes.

## Solutio
1. The database schema has been updated in `lib/db/schema.ts` to increase the password field length from 64 to 255 characters.
2. A migration file has been created at `lib/db/migrations/0006_broken_lady_ursula.sql` to apply this change to the database.

## Applying the Fix
1. The code changes should be committed to the repository.
2. The database migration needs to be applied using:
   ```
   npm run db:migrate
   ```
   - If you encounter permission issues running the migration locally, you may need to:
     - Ensure you have proper database credentials
     - Apply the migration manually on your database by running:
       ```sql
       ALTER TABLE "User" ALTER COLUMN "password" SET DATA TYPE varchar(255);
       ```

## Technical Details
- The current password field is defined as `varchar(64)` which is too small for bcrypt hashes.
- Bcrypt hashes are typically 60+ characters long and can be longer depending on the salt complexity.
- The updated field is `varchar(255)` which provides ample space for current and future hash formats.