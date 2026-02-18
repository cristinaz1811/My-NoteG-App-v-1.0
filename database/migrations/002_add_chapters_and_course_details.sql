-- Migration: Add chapters table and enhance courses with more details
-- Run: psql -d code_learning -f database/migrations/002_add_chapters_and_course_details.sql

-- Add new columns to courses table for more detailed information
ALTER TABLE courses ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS learning_objectives TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT[];
ALTER TABLE courses ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 1;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
ALTER TABLE courses ADD COLUMN IF NOT EXISTS tags VARCHAR(50)[];

-- Create chapters table for organizing course content
CREATE TABLE IF NOT EXISTS chapters (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add chapter_id to exercises table to link exercises to chapters
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS chapter_id INTEGER REFERENCES chapters(id) ON DELETE SET NULL;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_exercises_chapter ON exercises(chapter_id);

-- Insert sample chapters for existing courses
-- Course 1: JavaScript Fundamentals
INSERT INTO chapters (course_id, title, description, order_index) 
VALUES 
    (1, 'Getting Started', 'Introduction to JavaScript basics, variables, and data types', 1),
    (1, 'Control Flow', 'Conditionals, loops, and program flow control', 2),
    (1, 'Functions', 'Function declarations, expressions, and arrow functions', 3),
    (1, 'Arrays & Objects', 'Working with collections and complex data structures', 4)
ON CONFLICT DO NOTHING;

-- Course 2: Python Basics
INSERT INTO chapters (course_id, title, description, order_index) 
VALUES 
    (2, 'Python Fundamentals', 'Variables, data types, and basic syntax', 1),
    (2, 'Control Structures', 'If statements, loops, and flow control', 2),
    (2, 'Functions & Modules', 'Defining functions and organizing code', 3),
    (2, 'Data Structures', 'Lists, dictionaries, tuples, and sets', 4)
ON CONFLICT DO NOTHING;

-- Course 3: Data Structures
INSERT INTO chapters (course_id, title, description, order_index) 
VALUES 
    (3, 'Arrays & Strings', 'Fundamental linear data structures', 1),
    (3, 'Linked Lists', 'Understanding node-based structures', 2),
    (3, 'Stacks & Queues', 'LIFO and FIFO data structures', 3),
    (3, 'Trees & Graphs', 'Hierarchical and network structures', 4),
    (3, 'Hash Tables', 'Key-value mapping and hashing', 5)
ON CONFLICT DO NOTHING;

-- Update courses with detailed information
UPDATE courses SET 
    long_description = 'Master the fundamentals of JavaScript, the world''s most popular programming language. This comprehensive course takes you from complete beginner to confident programmer. You''ll learn about variables, data types, functions, arrays, objects, and more through hands-on coding exercises.',
    learning_objectives = ARRAY['Understand JavaScript syntax and data types', 'Write functions and control flow statements', 'Work with arrays and objects', 'Debug and test your code', 'Build simple interactive programs'],
    prerequisites = ARRAY['Basic computer skills', 'No prior programming experience required'],
    estimated_hours = 8,
    tags = ARRAY['javascript', 'web', 'beginner', 'programming']
WHERE id = 1;

UPDATE courses SET 
    long_description = 'Python is one of the most versatile and beginner-friendly programming languages. In this course, you''ll learn Python from scratch, covering everything from basic syntax to data structures. Perfect for aspiring data scientists, web developers, and automation enthusiasts.',
    learning_objectives = ARRAY['Write Python programs from scratch', 'Understand data types and operators', 'Use control structures effectively', 'Create and use functions', 'Work with lists and dictionaries'],
    prerequisites = ARRAY['Basic computer literacy', 'Enthusiasm for learning'],
    estimated_hours = 10,
    tags = ARRAY['python', 'data-science', 'beginner', 'automation']
WHERE id = 2;

UPDATE courses SET 
    long_description = 'Data structures are the building blocks of efficient algorithms. This intermediate course covers essential data structures including arrays, linked lists, trees, graphs, and hash tables. You''ll learn how to choose the right data structure for any problem and implement them in code.',
    learning_objectives = ARRAY['Implement common data structures', 'Analyze time and space complexity', 'Choose appropriate structures for problems', 'Optimize code performance', 'Prepare for technical interviews'],
    prerequisites = ARRAY['Basic programming knowledge', 'Familiarity with any programming language'],
    estimated_hours = 15,
    tags = ARRAY['data-structures', 'algorithms', 'intermediate', 'interviews']
WHERE id = 3;

-- Link existing exercises to chapters (based on their position)
-- This is a simplified approach - in practice you'd organize them more carefully
UPDATE exercises SET chapter_id = (
    SELECT c.id FROM chapters c 
    WHERE c.course_id = exercises.course_id 
    ORDER BY c.order_index LIMIT 1
), order_index = exercises.id
WHERE chapter_id IS NULL;

SELECT 'Migration completed successfully' as status;
