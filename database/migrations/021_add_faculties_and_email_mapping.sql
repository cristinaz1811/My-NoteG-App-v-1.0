-- Add Faculties table for email domain mapping
CREATE TABLE IF NOT EXISTS faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    email_domain VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add faculty_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS faculty_id INTEGER REFERENCES faculties(id) ON DELETE SET NULL;

-- Create index for faster faculty lookups by email domain
CREATE INDEX IF NOT EXISTS idx_faculties_email_domain ON faculties(email_domain);
CREATE INDEX IF NOT EXISTS idx_users_faculty_id ON users(faculty_id);
