const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'code_learning',
    user: 'cristinazarnescu',
    password: 'your_password'
});

async function resetUserProgress(userId) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log(`Resetting progress for user ${userId}...`);
        
        // 1. Delete from user_progress
        const result1 = await client.query('DELETE FROM user_progress WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result1.rowCount} rows from user_progress`);
        
        // 2. Delete from submissions
        const result2 = await client.query('DELETE FROM submissions WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result2.rowCount} rows from submissions`);
        
        // 3. Reset enrollments progress
        const result3 = await client.query(
            'UPDATE enrollments SET progress = 0, total_time_spent = 0 WHERE user_id = $1',
            [userId]
        );
        console.log(`Updated ${result3.rowCount} rows in enrollments`);
        
        // 4. Delete from lecture_progress
        const result4 = await client.query('DELETE FROM lecture_progress WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result4.rowCount} rows from lecture_progress`);
        
        // 5. Delete from ai_hints
        const result5 = await client.query('DELETE FROM ai_hints WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result5.rowCount} rows from ai_hints`);
        
        // 6. Delete from ai_complexity_analysis
        const result6 = await client.query('DELETE FROM ai_complexity_analysis WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result6.rowCount} rows from ai_complexity_analysis`);
        
        // 7. Delete from course_time_sessions
        const result7 = await client.query('DELETE FROM course_time_sessions WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result7.rowCount} rows from course_time_sessions`);
        
        // 8. Delete from exam_sessions
        const result8 = await client.query('DELETE FROM exam_sessions WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result8.rowCount} rows from exam_sessions`);
        
        // 9. Delete from sql_sessions
        const result9 = await client.query('DELETE FROM sql_sessions WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result9.rowCount} rows from sql_sessions`);
        
        // 10. Delete from help_requests
        const result10 = await client.query('DELETE FROM help_requests WHERE student_id = $1', [userId]);
        console.log(`Deleted ${result10.rowCount} rows from help_requests`);
        
        // 11. Delete from calendar_events
        const result11 = await client.query('DELETE FROM calendar_events WHERE user_id = $1', [userId]);
        console.log(`Deleted ${result11.rowCount} rows from calendar_events`);
        
        await client.query('COMMIT');
        console.log(`\n✅ Successfully reset all progress for user ${userId}`);
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error resetting progress:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

resetUserProgress(10)
    .catch(error => {
        console.error('Failed:', error);
        process.exit(1);
    });
