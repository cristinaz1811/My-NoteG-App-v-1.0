const db = require('./config/database');

async function checkPlagiarism() {
    try {
        console.log('🔍 Checking enrollments and plagiarism...\n');

        // 1. Check JavaScript Fundamentals enrollments
        const jsEnrollments = await db.query(`
            SELECT u.id, u.username, u.email, e.course_id
            FROM enrollments e
            JOIN users u ON u.id = e.user_id
            WHERE e.course_id = 3
            ORDER BY u.id
        `);

        console.log(`📊 JavaScript Fundamentals Enrollments (${jsEnrollments.rows.length}):`);
        jsEnrollments.rows.forEach(e => {
            console.log(`  - ${e.username} (${e.email}) - User ID: ${e.id}`);
        });

        // 2. Check if there are any plagiarism reports
        const reports = await db.query(
            "SELECT id, exercise_id, course_id FROM plagiarism_reports LIMIT 5"
        );
        console.log(`\n📋 Plagiarism Reports: ${reports.rows.length}`);

        // 3. Check submissions for JavaScript course
        const submissions = await db.query(`
            SELECT COUNT(DISTINCT user_id) as unique_students, COUNT(*) as total_submissions
            FROM submissions
            WHERE exercise_id IN (
                SELECT id FROM exercises WHERE course_id = 3
            )
        `);

        console.log(`\n✍️  Submissions in JavaScript course:`);
        console.log(`  - Unique students: ${submissions.rows[0].unique_students}`);
        console.log(`  - Total submissions: ${submissions.rows[0].total_submissions}`);

        await db.pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkPlagiarism();
