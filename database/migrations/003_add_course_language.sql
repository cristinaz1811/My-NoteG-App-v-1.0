-- Migration: Add language field to courses table
-- This allows professors to set the primary programming language for a course

ALTER TABLE courses ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'javascript';
