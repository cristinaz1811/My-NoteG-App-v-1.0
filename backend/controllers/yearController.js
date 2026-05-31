const db = require('../config/database');

const getYears = async (req, res) => {
    try {
        const userId = req.user?.id;
        const isStudent = req.user?.role === 'student';

        // Auto-archive any years whose active_until has passed
        await db.query(`
            UPDATE college_years
            SET status = 'archived'
            WHERE status = 'active'
              AND active_until IS NOT NULL
              AND active_until < CURRENT_DATE
        `);

        const result = await db.query(`
            SELECT cy.*,
                   COUNT(DISTINCT c.id)::int AS class_count,
                   u.username AS created_by_name,
                   (cy.status = 'active'
                    AND cy.start_date IS NOT NULL AND cy.active_until IS NOT NULL
                    AND CURRENT_DATE BETWEEN cy.start_date AND cy.active_until) AS is_current
            FROM college_years cy
            LEFT JOIN classes c ON c.year_id = cy.id
            LEFT JOIN users u ON u.id = cy.created_by
            GROUP BY cy.id, u.username
            ORDER BY cy.school_year DESC, cy.order_index, cy.id
        `);

        let years = result.rows;

        // For students, include which classes they're enrolled in per year
        if (isStudent && userId) {
            const enrollResult = await db.query(`
                SELECT c.year_id, c.id AS class_id
                FROM class_enrollments ce
                JOIN classes c ON c.id = ce.class_id
                WHERE ce.user_id = $1 AND ce.status = 'approved'
            `, [userId]);

            const enrolledByYear = {};
            for (const row of enrollResult.rows) {
                if (!enrolledByYear[row.year_id]) enrolledByYear[row.year_id] = [];
                enrolledByYear[row.year_id].push(row.class_id);
            }

            years = years.map(y => ({
                ...y,
                enrolled_class_ids: enrolledByYear[y.id] || [],
            }));
        }

        res.json(years);
    } catch (err) {
        console.error('getYears error:', err);
        res.status(500).json({ error: 'Failed to fetch college years' });
    }
};

const getYearById = async (req, res) => {
    try {
        const { yearId } = req.params;
        const yearResult = await db.query(
            `SELECT cy.*, u.username AS created_by_name
             FROM college_years cy
             LEFT JOIN users u ON u.id = cy.created_by
             WHERE cy.id = $1`,
            [yearId]
        );
        if (yearResult.rows.length === 0) return res.status(404).json({ error: 'Year not found' });

        const classesResult = await db.query(
            `SELECT cl.*,
                    COUNT(DISTINCT co.id)::int AS course_count,
                    u.username AS created_by_name
             FROM classes cl
             LEFT JOIN courses co ON co.class_id = cl.id
             LEFT JOIN users u ON u.id = cl.created_by
             WHERE cl.year_id = $1
             GROUP BY cl.id, u.username
             ORDER BY cl.order_index, cl.id`,
            [yearId]
        );

        res.json({ ...yearResult.rows[0], classes: classesResult.rows });
    } catch (err) {
        console.error('getYearById error:', err);
        res.status(500).json({ error: 'Failed to fetch year' });
    }
};

const createYear = async (req, res) => {
    try {
        const { name, description, order_index = 0, faculty, school_year, start_date, active_until } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        if (!faculty) return res.status(400).json({ error: 'Faculty is required' });
        if (!school_year) return res.status(400).json({ error: 'School year is required' });
        if (!start_date) return res.status(400).json({ error: 'Start date is required' });
        if (!active_until) return res.status(400).json({ error: 'Active until date is required' });

        const result = await db.query(
            `INSERT INTO college_years (name, description, order_index, faculty, school_year, start_date, active_until, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8) RETURNING *`,
            [name, description || null, order_index, faculty, school_year, start_date, active_until, req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: `${name} for ${faculty} already exists in ${school_year}` });
        }
        console.error('createYear error:', err);
        res.status(500).json({ error: 'Failed to create year' });
    }
};

const updateYear = async (req, res) => {
    try {
        const { yearId } = req.params;
        const { name, description, order_index, faculty, school_year, start_date, active_until } = req.body;

        const check = await db.query('SELECT * FROM college_years WHERE id = $1', [yearId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Year not found' });

        const result = await db.query(
            `UPDATE college_years
             SET name         = COALESCE($1, name),
                 description  = COALESCE($2, description),
                 order_index  = COALESCE($3, order_index),
                 faculty      = COALESCE($4, faculty),
                 school_year  = COALESCE($5, school_year),
                 start_date   = COALESCE($6, start_date),
                 active_until = COALESCE($7, active_until)
             WHERE id = $8 RETURNING *`,
            [name, description, order_index, faculty, school_year, start_date, active_until, yearId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'This year already exists for that faculty and school year' });
        }
        console.error('updateYear error:', err);
        res.status(500).json({ error: 'Failed to update year' });
    }
};

const deleteYear = async (req, res) => {
    try {
        const { yearId } = req.params;

        const classCount = await db.query(
            'SELECT COUNT(*) FROM classes WHERE year_id = $1', [yearId]
        );
        if (parseInt(classCount.rows[0].count) > 0) {
            return res.status(400).json({ error: 'Cannot delete a year that still has classes' });
        }

        await db.query('DELETE FROM college_years WHERE id = $1', [yearId]);
        res.json({ message: 'Year deleted' });
    } catch (err) {
        console.error('deleteYear error:', err);
        res.status(500).json({ error: 'Failed to delete year' });
    }
};

const getClassesByYear = async (req, res) => {
    try {
        const { yearId } = req.params;
        const userId = req.user?.id;
        const isStudent = req.user?.role === 'student';

        const result = await db.query(
            `SELECT cl.*,
                    COUNT(DISTINCT co.id)::int AS course_count,
                    u.username AS created_by_name
             FROM classes cl
             LEFT JOIN courses co ON co.class_id = cl.id
             LEFT JOIN users u ON u.id = cl.created_by
             WHERE cl.year_id = $1
             GROUP BY cl.id, u.username
             ORDER BY cl.order_index, cl.id`,
            [yearId]
        );

        let classes = result.rows;

        // For students, flag which classes they're enrolled in
        if (isStudent && userId) {
            const enrollResult = await db.query(
                `SELECT class_id FROM class_enrollments
                 WHERE user_id = $1 AND status = 'approved'`,
                [userId]
            );
            const enrolledIds = new Set(enrollResult.rows.map(r => r.class_id));
            classes = classes.map(c => ({ ...c, student_enrolled: enrolledIds.has(c.id) }));
        }

        res.json(classes);
    } catch (err) {
        console.error('getClassesByYear error:', err);
        res.status(500).json({ error: 'Failed to fetch classes' });
    }
};

const createClass = async (req, res) => {
    try {
        const { yearId } = req.params;
        const { name, description, order_index = 0 } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const yearCheck = await db.query('SELECT id FROM college_years WHERE id = $1', [yearId]);
        if (yearCheck.rows.length === 0) return res.status(404).json({ error: 'Year not found' });

        const result = await db.query(
            `INSERT INTO classes (year_id, name, description, order_index, created_by)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [yearId, name, description || null, order_index, req.user.id]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('createClass error:', err);
        res.status(500).json({ error: 'Failed to create class' });
    }
};

module.exports = {
    getYears,
    getYearById,
    createYear,
    updateYear,
    deleteYear,
    getClassesByYear,
    createClass,
};
