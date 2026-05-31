/**
 * seed-sql-course.js
 * Creates a standalone "Introduction to SQL" course with 6 exercises
 * that use the sandbox SQL exercise type.
 *
 * Usage: node seed-sql-course.js
 *
 * Requirements:
 *  - Migration 016 must already be applied (exercise_type column must exist)
 *  - A professor or admin account must exist in the DB
 *  - backend/.env must be populated (or env vars set)
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'code_learning',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
});

const db = { query: (t, p) => pool.query(t, p) };

// ── helpers ────────────────────────────────────────────────────────────────

async function insertSqlExercise(courseId, chapterId, { title, description, difficulty, seedSql, validationQuery, expectedResult, orderIndex }) {
    const res = await db.query(
        `INSERT INTO exercises
            (course_id, chapter_id, title, description, difficulty,
             exercise_type, seed_sql, validation_query, expected_result,
             language, order_index, time_limit_minutes)
         VALUES ($1,$2,$3,$4,$5,'sql',$6,$7,$8,'sql',$9,30)
         RETURNING id`,
        [courseId, chapterId, title, description, difficulty,
         seedSql, validationQuery, JSON.stringify(expectedResult), orderIndex]
    );
    return res.rows[0].id;
}

// ── exercises ──────────────────────────────────────────────────────────────

const exercises = [
    // ── Chapter 1: Basics ──────────────────────────────────────────────────
    {
        chapterKey: 'basics',
        title: 'Select all employees',
        description: `You have a table called **employees** with the following columns:
- \`id\` — employee ID
- \`name\` — full name
- \`department\` — department name
- \`salary\` — monthly salary

**Task:** Write a query that returns every row from the employees table.`,
        difficulty: 'easy',
        orderIndex: 1,
        seedSql: `
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     NUMERIC(10,2) NOT NULL
);
INSERT INTO employees (name, department, salary) VALUES
    ('Alice Martin',  'Engineering', 5200.00),
    ('Bob Chen',      'Marketing',   4100.00),
    ('Carol White',   'Engineering', 5800.00),
    ('David Kim',     'HR',          3900.00),
    ('Eva Lopez',     'Marketing',   4300.00);
`,
        validationQuery: `SELECT id, name, department, salary FROM employees ORDER BY id`,
        expectedResult: [
            { id: '1', name: 'Alice Martin',  department: 'Engineering', salary: '5200.00' },
            { id: '2', name: 'Bob Chen',       department: 'Marketing',   salary: '4100.00' },
            { id: '3', name: 'Carol White',    department: 'Engineering', salary: '5800.00' },
            { id: '4', name: 'David Kim',      department: 'HR',          salary: '3900.00' },
            { id: '5', name: 'Eva Lopez',      department: 'Marketing',   salary: '4300.00' },
        ],
    },
    {
        chapterKey: 'basics',
        title: 'Filter by department',
        description: `Using the same **employees** table, write a query that returns only the employees who work in the **Engineering** department.

Return: \`id\`, \`name\`, \`salary\``,
        difficulty: 'easy',
        orderIndex: 2,
        seedSql: `
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     NUMERIC(10,2) NOT NULL
);
INSERT INTO employees (name, department, salary) VALUES
    ('Alice Martin',  'Engineering', 5200.00),
    ('Bob Chen',      'Marketing',   4100.00),
    ('Carol White',   'Engineering', 5800.00),
    ('David Kim',     'HR',          3900.00),
    ('Eva Lopez',     'Marketing',   4300.00);
`,
        validationQuery: `SELECT id, name, salary FROM employees WHERE department = 'Engineering' ORDER BY id`,
        expectedResult: [
            { id: '1', name: 'Alice Martin', salary: '5200.00' },
            { id: '3', name: 'Carol White',  salary: '5800.00' },
        ],
    },

    // ── Chapter 2: Aggregation ────────────────────────────────────────────
    {
        chapterKey: 'aggregation',
        title: 'Average salary per department',
        description: `Using the **employees** table, write a query that returns the **average salary** for each department.

Return columns: \`department\`, \`avg_salary\`
Order the results by \`department\` ascending.`,
        difficulty: 'medium',
        orderIndex: 1,
        seedSql: `
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     NUMERIC(10,2) NOT NULL
);
INSERT INTO employees (name, department, salary) VALUES
    ('Alice Martin',  'Engineering', 5200.00),
    ('Bob Chen',      'Marketing',   4100.00),
    ('Carol White',   'Engineering', 5800.00),
    ('David Kim',     'HR',          3900.00),
    ('Eva Lopez',     'Marketing',   4300.00);
`,
        validationQuery: `
SELECT department, ROUND(AVG(salary), 2)::TEXT AS avg_salary
FROM employees
GROUP BY department
ORDER BY department
`,
        expectedResult: [
            { department: 'Engineering', avg_salary: '5500.00' },
            { department: 'HR',          avg_salary: '3900.00' },
            { department: 'Marketing',   avg_salary: '4200.00' },
        ],
    },
    {
        chapterKey: 'aggregation',
        title: 'Departments with high average salary',
        description: `Using the **employees** table, find departments where the **average salary is above 4500**.

Return: \`department\`, \`avg_salary\` (rounded to 2 decimal places)
Order by \`avg_salary\` descending.`,
        difficulty: 'medium',
        orderIndex: 2,
        seedSql: `
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     NUMERIC(10,2) NOT NULL
);
INSERT INTO employees (name, department, salary) VALUES
    ('Alice Martin',  'Engineering', 5200.00),
    ('Bob Chen',      'Marketing',   4100.00),
    ('Carol White',   'Engineering', 5800.00),
    ('David Kim',     'HR',          3900.00),
    ('Eva Lopez',     'Marketing',   4300.00);
`,
        validationQuery: `
SELECT department, ROUND(AVG(salary), 2)::TEXT AS avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > 4500
ORDER BY AVG(salary) DESC
`,
        expectedResult: [
            { department: 'Engineering', avg_salary: '5500.00' },
        ],
    },

    // ── Chapter 3: Joins ──────────────────────────────────────────────────
    {
        chapterKey: 'joins',
        title: 'Join employees with projects',
        description: `You now have two tables:

**employees** — \`id\`, \`name\`, \`department\`, \`salary\`
**projects** — \`id\`, \`name\`, \`employee_id\`, \`budget\`

Write a query that returns each employee's name alongside the project(s) they are assigned to.

Return: \`employee_name\`, \`project_name\`
Order by \`employee_name\` ascending, then \`project_name\` ascending.`,
        difficulty: 'medium',
        orderIndex: 1,
        seedSql: `
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     NUMERIC(10,2) NOT NULL
);
CREATE TABLE projects (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    employee_id INTEGER REFERENCES employees(id),
    budget      NUMERIC(12,2)
);
INSERT INTO employees (name, department, salary) VALUES
    ('Alice Martin',  'Engineering', 5200.00),
    ('Bob Chen',      'Marketing',   4100.00),
    ('Carol White',   'Engineering', 5800.00),
    ('David Kim',     'HR',          3900.00);
INSERT INTO projects (name, employee_id, budget) VALUES
    ('Website Redesign',   2, 15000.00),
    ('API Migration',      1, 32000.00),
    ('HR Portal',          4, 8000.00),
    ('Mobile App',         3, 45000.00),
    ('Data Pipeline',      1, 27000.00);
`,
        validationQuery: `
SELECT e.name AS employee_name, p.name AS project_name
FROM employees e
JOIN projects p ON p.employee_id = e.id
ORDER BY e.name, p.name
`,
        expectedResult: [
            { employee_name: 'Alice Martin', project_name: 'API Migration' },
            { employee_name: 'Alice Martin', project_name: 'Data Pipeline' },
            { employee_name: 'Bob Chen',     project_name: 'Website Redesign' },
            { employee_name: 'Carol White',  project_name: 'Mobile App' },
            { employee_name: 'David Kim',    project_name: 'HR Portal' },
        ],
    },

    // ── Chapter 4: DML ────────────────────────────────────────────────────
    {
        chapterKey: 'dml',
        title: 'Give Engineering a raise',
        description: `You have the **employees** table. The Engineering team earned a raise!

**Task:** Update the salary of every Engineering employee by adding **500** to their current salary.

After running your UPDATE, the validation will check the final state of all salaries.`,
        difficulty: 'hard',
        orderIndex: 1,
        seedSql: `
CREATE TABLE employees (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    department TEXT NOT NULL,
    salary     NUMERIC(10,2) NOT NULL
);
INSERT INTO employees (name, department, salary) VALUES
    ('Alice Martin',  'Engineering', 5200.00),
    ('Bob Chen',      'Marketing',   4100.00),
    ('Carol White',   'Engineering', 5800.00),
    ('David Kim',     'HR',          3900.00),
    ('Eva Lopez',     'Marketing',   4300.00);
`,
        validationQuery: `SELECT id, name, department, salary FROM employees ORDER BY id`,
        expectedResult: [
            { id: '1', name: 'Alice Martin',  department: 'Engineering', salary: '5700.00' },
            { id: '2', name: 'Bob Chen',       department: 'Marketing',   salary: '4100.00' },
            { id: '3', name: 'Carol White',    department: 'Engineering', salary: '6300.00' },
            { id: '4', name: 'David Kim',      department: 'HR',          salary: '3900.00' },
            { id: '5', name: 'Eva Lopez',      department: 'Marketing',   salary: '4300.00' },
        ],
    },
];

// ── seeding ────────────────────────────────────────────────────────────────

async function seed() {
    const ownerRes = await db.query(`SELECT id FROM users WHERE role IN ('admin','professor') ORDER BY id LIMIT 1`);
    if (ownerRes.rows.length === 0) {
        console.error('No admin or professor user found. Create one first.');
        process.exit(1);
    }
    const ownerId = ownerRes.rows[0].id;
    console.log(`Using owner user id=${ownerId}`);

    // Course
    const courseRes = await db.query(
        `INSERT INTO courses (title, description, difficulty, language, estimated_hours, created_by, is_private)
         VALUES ($1,$2,$3,'sql',4,$4,false) RETURNING id`,
        [
            'Introduction to SQL',
            'Learn SQL from scratch — from basic SELECT queries to JOINs and data modification. Each exercise gives you a live database to query directly.',
            'beginner',
            ownerId,
        ]
    );
    const courseId = courseRes.rows[0].id;
    console.log(`Created course id=${courseId}`);

    // Chapters
    const chapterDefs = [
        { key: 'basics',      title: 'Basics',      description: 'SELECT, WHERE, and simple filtering',         order: 1 },
        { key: 'aggregation', title: 'Aggregation',  description: 'COUNT, SUM, AVG, GROUP BY, HAVING',          order: 2 },
        { key: 'joins',       title: 'Joins',        description: 'INNER JOIN across related tables',            order: 3 },
        { key: 'dml',         title: 'Modifying Data', description: 'INSERT, UPDATE, DELETE',                   order: 4 },
    ];

    const chapterIdMap = {};
    for (const ch of chapterDefs) {
        const res = await db.query(
            `INSERT INTO chapters (course_id, title, description, order_index) VALUES ($1,$2,$3,$4) RETURNING id`,
            [courseId, ch.title, ch.description, ch.order]
        );
        chapterIdMap[ch.key] = res.rows[0].id;
        console.log(`  Chapter "${ch.title}" id=${res.rows[0].id}`);
    }

    // Exercises
    for (const ex of exercises) {
        const chapterId = chapterIdMap[ex.chapterKey];
        const exId = await insertSqlExercise(courseId, chapterId, ex);
        console.log(`  Exercise "${ex.title}" id=${exId}`);
    }

    console.log('\nDone! SQL course seeded successfully.');
}

seed()
    .catch((err) => { console.error(err); process.exit(1); })
    .finally(() => pool.end());
