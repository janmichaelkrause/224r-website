-- Migration to increase password field length in User table
ALTER TABLE "User" ALTER COLUMN "password" TYPE VARCHAR(255);