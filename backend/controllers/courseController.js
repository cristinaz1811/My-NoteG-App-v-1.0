const crypto = require('crypto');
const db = require('../config/database');
const { notifyNewChapter, notifyNewEnrollment } = require('../utils/notificationService');
const { enrollApprovedMembersInCourse } = require('./classController');
const { cacheGet, cacheSet, cacheDel } = require('../utils/redisClient');

// Generate a random enrollment code (6 alphanumeric characters)
const generateEnrollmentCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
};

const getAllCourses = async (req, res) => {
    try {
        const userId = req.user?.id || null;
        const userRole = req.user?.role || null;
        const facultyId = req.user?.faculty_id || null;

        const cacheKey = userId ? `courses:user:${userId}` : 'courses:public';
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        let result;
        if (userRole === 'professor' && userId) {
            // Professors see only their standalone public courses here.
            // Class-tied courses are managed through the class/year system.
            result = await db.query(`
                SELECT c.*, u.username as creator_name,
                       COUNT(DISTINCT e.id) as exercise_count,
                       COUNT(DISTINCT ch.id) as chapter_count
                FROM courses c
                LEFT JOIN users u ON c.created_by = u.id
                LEFT JOIN exercises e ON c.id = e.course_id
                LEFT JOIN chapters ch ON c.id = ch.course_id
                WHERE c.created_by = $1
                  AND c.class_id IS NULL
                GROUP BY c.id, u.username
                ORDER BY c.created_at DESC
            `, [userId]);
        } else if (userRole === 'student' && userId && facultyId) {
            // Students see standalone public courses from their faculty only.
            // Courses tied to a class are accessed through the class/year system.
            result = await db.query(`
                SELECT c.*, u.username as creator_name,
                       COUNT(DISTINCT e.id) as exercise_count,
                       COUNT(DISTINCT ch.id) as chapter_count,
                       f.id as faculty_id, f.name as faculty_name
                FROM courses c
                LEFT JOIN users u ON c.created_by = u.id
                LEFT JOIN faculties f ON u.faculty_id = f.id
                LEFT JOIN exercises e ON c.id = e.course_id
                LEFT JOIN chapters ch ON c.id = ch.course_id
                WHERE c.class_id IS NULL
                  AND u.faculty_id = $2
                  AND (
                      c.is_private = false
                      OR EXISTS (SELECT 1 FROM enrollments en WHERE en.course_id = c.id AND en.user_id = $1)
                  )
                GROUP BY c.id, u.username, f.id, f.name
                ORDER BY c.created_at DESC
            `, [userId, facultyId]);
        } else {
            // Unauthenticated users see public courses (no faculty restriction).
            result = await db.query(`
                SELECT c.*, u.username as creator_name,
                       COUNT(DISTINCT e.id) as exercise_count,
                       COUNT(DISTINCT ch.id) as chapter_count
                FROM courses c
                LEFT JOIN users u ON c.created_by = u.id
                LEFT JOIN exercises e ON c.id = e.course_id
                LEFT JOIN chapters ch ON c.id = ch.course_id
                WHERE c.class_id IS NULL
                  AND c.is_private = false
                GROUP BY c.id, u.username
                ORDER BY c.created_at DESC
            `);
        }

        await cacheSet(cacheKey, result.rows, 120);
        res.json(result.rows);
    } catch (error) {
        console.error('Get courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getCourseById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || null;
        const userRole = req.user?.role || null;
        const facultyId = req.user?.faculty_id || null;

        const cacheKey = `course:${id}`;
        const cached = await cacheGet(cacheKey);
        if (cached) {
            // Check access before returning cached data
            const course = cached;
            const creatorFacultyId = course.creator_faculty_id;

            // Students can only access courses from their faculty (unless enrolled)
            if (userRole === 'student' && facultyId && creatorFacultyId && creatorFacultyId !== facultyId) {
                // Check if user is enrolled
                const enrollment = await db.query(
                    'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
                    [userId, id]
                );
                if (enrollment.rows.length === 0) {
                    return res.status(403).json({ error: 'Access denied. This course is not available for your faculty.' });
                }
            }
            return res.json(cached);
        }

        // Get course with all details including class/year and creator's faculty
        const courseResult = await db.query(
            `SELECT c.*, u.username as creator_name, u.faculty_id as creator_faculty_id,
                    cl.name AS class_name, cl.id AS class_id,
                    cy.name AS year_name, cy.id AS year_id,
                    f.name AS creator_faculty_name
             FROM courses c
             LEFT JOIN users u ON c.created_by = u.id
             LEFT JOIN faculties f ON u.faculty_id = f.id
             LEFT JOIN classes cl ON c.class_id = cl.id
             LEFT JOIN college_years cy ON cl.year_id = cy.id
             WHERE c.id = $1`,
            [id]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const course = courseResult.rows[0];
        const creatorFacultyId = course.creator_faculty_id;

        // Check access control for students
        if (userRole === 'student' && facultyId && creatorFacultyId && creatorFacultyId !== facultyId) {
            // Check if student is enrolled in this course
            const enrollment = await db.query(
                'SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2',
                [userId, id]
            );
            if (enrollment.rows.length === 0) {
                return res.status(403).json({ error: 'Access denied. This course is not available for your faculty.' });
            }
        }

        // Get chapters with their exercises
        const chaptersResult = await db.query(`
            SELECT ch.id, ch.title, ch.description, ch.order_index,
                   json_agg(
                       json_build_object(
                           'id', e.id,
                           'title', e.title,
                           'description', e.description,
                           'difficulty', e.difficulty,
                           'language', e.language,
                           'order_index', e.order_index
                       ) ORDER BY e.order_index
                   ) FILTER (WHERE e.id IS NOT NULL) as exercises
            FROM chapters ch
            LEFT JOIN exercises e ON e.chapter_id = ch.id
            WHERE ch.course_id = $1
            GROUP BY ch.id
            ORDER BY ch.order_index
        `, [id]);

        // Get exercises without chapter (for backwards compatibility)
        const unassignedExercises = await db.query(
            `SELECT id, title, description, difficulty, language, order_index 
             FROM exercises 
             WHERE course_id = $1 AND chapter_id IS NULL 
             ORDER BY order_index, id`,
            [id]
        );

        // Get all exercises flat (for backward compatibility)
        const allExercises = await db.query(
            `SELECT id, title, description, difficulty, language
             FROM exercises
             WHERE course_id = $1
             ORDER BY order_index, id`,
            [id]
        );

        // Get lectures with page and media counts
        const lecturesResult = await db.query(`
            SELECT l.*,
                   ch.title AS chapter_title,
                   COUNT(DISTINCT lp.id)::int AS page_count,
                   COUNT(DISTINCT lm.id)::int AS media_count
            FROM lectures l
            LEFT JOIN chapters ch ON ch.id = l.chapter_id
            LEFT JOIN lecture_pages lp ON lp.lecture_id = l.id
            LEFT JOIN lecture_media lm ON lm.lecture_id = l.id
            WHERE l.course_id = $1
            GROUP BY l.id, ch.title
            ORDER BY l.order_index, l.id
        `, [id]);

        const courseData = {
            ...course,
            chapters: chaptersResult.rows,
            unassignedExercises: unassignedExercises.rows,
            exercises: allExercises.rows,
            lectures: lecturesResult.rows,
        };
        await cacheSet(`course:${id}`, courseData, 300);
        res.json(courseData);
    } catch (error) {
        console.error('Get course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createCourse = async (req, res) => {
    try {
        const { title, description, difficulty, long_description, estimated_hours, tags, learning_objectives, language, is_private, class_id, order_index } = req.body;
        const createdBy = req.user.id;

        // Generate enrollment code if course is private
        let enrollmentCode = null;
        if (is_private) {
            // Keep generating until we find a unique code
            let isUnique = false;
            while (!isUnique) {
                enrollmentCode = generateEnrollmentCode();
                const existing = await db.query('SELECT id FROM courses WHERE enrollment_code = $1', [enrollmentCode]);
                if (existing.rows.length === 0) isUnique = true;
            }
        }

        const result = await db.query(
            `INSERT INTO courses (title, description, difficulty, created_by, long_description, estimated_hours, tags, learning_objectives, language, is_private, enrollment_code, class_id, order_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [title, description, difficulty, createdBy, long_description || null, estimated_hours || 1, tags || [], learning_objectives || [], language || 'javascript', is_private || false, enrollmentCode, class_id || null, order_index || 0]
        );

        if (class_id) {
            await enrollApprovedMembersInCourse(result.rows[0].id, class_id);
        }

        await cacheDel(`courses:user:${createdBy}`);
        await cacheDel('courses:public');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const enrollInCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const { enrollment_code } = req.body || {};

        // Check if already enrolled
        const existing = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Already enrolled in this course' });
        }

        // Check if course is private and validate enrollment code
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const courseData = course.rows[0];

        // If the course is private, require a valid enrollment code (unless the user is the creator)
        if (courseData.is_private && courseData.created_by !== userId) {
            if (!enrollment_code) {
                return res.status(403).json({ error: 'This is a private course. An enrollment code is required to join.', requiresCode: true });
            }
            if (enrollment_code.toUpperCase() !== courseData.enrollment_code) {
                return res.status(403).json({ error: 'Invalid enrollment code.' });
            }
        }

        const result = await db.query(
            'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2) RETURNING *',
            [userId, courseId]
        );

        notifyNewEnrollment({ studentId: userId, courseId: parseInt(courseId) });
        await cacheDel(`courses:user:${userId}`);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Enroll course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const unenrollFromCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Check if enrolled
        const existing = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({ error: 'Not enrolled in this course' });
        }

        // Delete all progress data for this course
        // First, delete data linked through exercises in this course
        await db.query(
            `DELETE FROM ai_complexity_analysis 
             WHERE user_id = $1 AND exercise_id IN (SELECT id FROM exercises WHERE course_id = $2)`,
            [userId, courseId]
        );
        await db.query(
            `DELETE FROM ai_hints 
             WHERE user_id = $1 AND exercise_id IN (SELECT id FROM exercises WHERE course_id = $2)`,
            [userId, courseId]
        );
        await db.query(
            `DELETE FROM submissions 
             WHERE user_id = $1 AND exercise_id IN (SELECT id FROM exercises WHERE course_id = $2)`,
            [userId, courseId]
        );
        await db.query(
            `DELETE FROM user_progress 
             WHERE user_id = $1 AND exercise_id IN (SELECT id FROM exercises WHERE course_id = $2)`,
            [userId, courseId]
        );
        await db.query(
            'DELETE FROM course_time_sessions WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );
        // Finally, delete the enrollment itself
        await db.query(
            'DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, courseId]
        );

        await cacheDel(`courses:user:${userId}`);
        res.json({ message: 'Successfully unenrolled from course' });
    } catch (error) {
        console.error('Unenroll course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getUserCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT
                c.id,
                c.title,
                c.description,
                c.difficulty,
                e.progress,
                e.enrolled_at,
                COALESCE(cts.total_time_spent, 0) as total_time_spent,
                COUNT(DISTINCT ex.id) as total_exercises,
                COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_exercises,
                COALESCE(sub_stats.total_attempts, 0) as total_attempts,
                COALESCE(sub_stats.avg_score, 0) as average_score
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN exercises ex ON c.id = ex.course_id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
            LEFT JOIN (
                SELECT
                    ex2.course_id,
                    COUNT(s.id) as total_attempts,
                    ROUND(AVG(s.score)::numeric, 2) as avg_score
                FROM submissions s
                JOIN exercises ex2 ON s.exercise_id = ex2.id
                WHERE s.user_id = $1
                GROUP BY ex2.course_id
            ) sub_stats ON c.id = sub_stats.course_id
            LEFT JOIN (
                SELECT course_id, COALESCE(SUM(duration), 0) as total_time_spent
                FROM course_time_sessions
                WHERE user_id = $1
                GROUP BY course_id
            ) cts ON c.id = cts.course_id
            WHERE e.user_id = $1
            GROUP BY c.id, c.title, c.description, c.difficulty, e.progress, e.enrolled_at, cts.total_time_spent, sub_stats.total_attempts, sub_stats.avg_score
            ORDER BY e.enrolled_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get user courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Get detailed stats for a specific enrolled course
const getEnrolledCourseDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // Check enrollment and creator status in parallel
        const [enrollment, courseResult] = await Promise.all([
            db.query('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]),
            db.query('SELECT * FROM courses WHERE id = $1', [courseId])
        ]);

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        const isCreator = courseResult.rows[0].created_by === userId;
        if (enrollment.rows.length === 0 && !isCreator) {
            return res.status(404).json({ error: 'Not enrolled in this course' });
        }

        // Get all exercises with user progress
        const exercisesResult = await db.query(`
            SELECT 
                ex.id,
                ex.title,
                ex.description,
                ex.difficulty,
                ex.language,
                COALESCE(up.completed, false) as completed,
                COALESCE(up.best_score, 0) as best_score,
                COALESCE(up.attempts, 0) as attempts,
                up.last_attempt_at
            FROM exercises ex
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = $1
            WHERE ex.course_id = $2
            ORDER BY ex.id
        `, [userId, courseId]);

        // Get submission history for this course
        const submissionsResult = await db.query(`
            SELECT 
                s.id,
                s.exercise_id,
                ex.title as exercise_title,
                s.code,
                s.language,
                s.score,
                s.tests_passed,
                s.tests_total,
                s.status,
                s.submitted_at
            FROM submissions s
            JOIN exercises ex ON s.exercise_id = ex.id
            WHERE s.user_id = $1 AND ex.course_id = $2
            ORDER BY s.submitted_at DESC
            LIMIT 50
        `, [userId, courseId]);

        // Get time spent breakdown (only sessions >= 60s to exclude quick bounces)
        const timeResult = await db.query(`
            SELECT
                DATE(started_at) as date,
                SUM(duration) as time_spent
            FROM course_time_sessions
            WHERE user_id = $1 AND course_id = $2 AND duration IS NOT NULL AND duration >= 60
            GROUP BY DATE(started_at)
            ORDER BY date DESC
            LIMIT 30
        `, [userId, courseId]);

        // Calculate total time from course_time_sessions (only sessions >= 60s)
        const totalTimeResult = await db.query(`
            SELECT COALESCE(SUM(duration), 0) as total_time
            FROM course_time_sessions
            WHERE user_id = $1 AND course_id = $2 AND duration IS NOT NULL AND duration >= 60
        `, [userId, courseId]);
        const totalTimeSpent = parseInt(totalTimeResult.rows[0].total_time) || 0;

        // Calculate stats
        const totalAttempts = exercisesResult.rows.reduce((sum, ex) => sum + ex.attempts, 0);
        const completedExercises = exercisesResult.rows.filter(ex => ex.completed).length;
        const avgScore = exercisesResult.rows.length > 0
            ? exercisesResult.rows.reduce((sum, ex) => sum + parseFloat(ex.best_score || 0), 0) / exercisesResult.rows.length
            : 0;

        // Get lectures with student progress
        const lecturesResult = await db.query(`
            SELECT l.*,
                   ch.id AS chapter_id,
                   ch.title AS chapter_title,
                   COUNT(DISTINCT lp.id)::int AS page_count,
                   COUNT(DISTINCT lm.id)::int AS media_count,
                   lpr.last_page_seen,
                   lpr.completed AS lecture_completed
            FROM lectures l
            LEFT JOIN chapters ch ON ch.id = l.chapter_id
            LEFT JOIN lecture_pages lp ON lp.lecture_id = l.id
            LEFT JOIN lecture_media lm ON lm.lecture_id = l.id
            LEFT JOIN lecture_progress lpr ON lpr.lecture_id = l.id AND lpr.user_id = $1
            WHERE l.course_id = $2
            GROUP BY l.id, ch.id, ch.title, lpr.last_page_seen, lpr.completed
            ORDER BY l.order_index, l.id
        `, [userId, courseId]);

        // Get chapters with their lectures and exercises grouped together
        const chaptersResult = await db.query(`
            SELECT ch.id, ch.title, ch.description, ch.order_index
            FROM chapters ch
            WHERE ch.course_id = $1
            ORDER BY ch.order_index
        `, [courseId]);

        // Build chapters with mixed items (lectures and exercises)
        const chaptersWithItems = chaptersResult.rows.map(chapter => {
            // Get lectures for this chapter
            const lecturesInChapter = lecturesResult.rows.filter(l => l.chapter_id === chapter.id).map(l => ({
                type: 'lecture',
                id: l.id,
                title: l.title,
                description: l.description,
                page_count: l.page_count,
                media_count: l.media_count,
                order_index: l.order_index,
                completed: l.lecture_completed,
                last_page_seen: l.last_page_seen
            }));

            // Get exercises for this chapter
            const exercisesInChapter = exercisesResult.rows.filter(e => {
                // We need chapter_id info for exercises, fetch it separately if needed
                // For now, we'll filter based on the exercise's chapter association
                return false; // placeholder, will be filled below
            });

            return {
                id: chapter.id,
                title: chapter.title,
                description: chapter.description,
                order_index: chapter.order_index,
                items: [] // will be filled with merged lectures and exercises
            };
        });

        // Get exercises with chapter associations
        const exercisesWithChapterResult = await db.query(`
            SELECT
                ex.id,
                ex.title,
                ex.description,
                ex.difficulty,
                ex.language,
                ex.chapter_id,
                ex.order_index,
                COALESCE(up.completed, false) as completed,
                COALESCE(up.best_score, 0) as best_score,
                COALESCE(up.attempts, 0) as attempts,
                up.last_attempt_at
            FROM exercises ex
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = $1
            WHERE ex.course_id = $2
            ORDER BY ex.order_index, ex.id
        `, [userId, courseId]);

        // Rebuild chapters with proper mixed items
        const chaptersWithMixedItems = chaptersResult.rows.map(chapter => {
            // Get lectures for this chapter, sorted by order_index
            const lecturesInChapter = lecturesResult.rows
                .filter(l => l.chapter_id === chapter.id)
                .map(l => ({
                    type: 'lecture',
                    id: l.id,
                    title: l.title,
                    description: l.description,
                    page_count: l.page_count,
                    media_count: l.media_count,
                    order_index: l.order_index,
                    completed: l.lecture_completed,
                    last_page_seen: l.last_page_seen
                }))
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            // Get exercises for this chapter, sorted by order_index
            const exercisesInChapter = exercisesWithChapterResult.rows
                .filter(e => e.chapter_id === chapter.id)
                .map(e => ({
                    type: 'exercise',
                    id: e.id,
                    title: e.title,
                    description: e.description,
                    difficulty: e.difficulty,
                    language: e.language,
                    order_index: e.order_index,
                    completed: e.completed,
                    best_score: e.best_score,
                    attempts: e.attempts
                }))
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            // Merge lectures and exercises in order_index order
            const items = [...lecturesInChapter, ...exercisesInChapter]
                .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

            return {
                id: chapter.id,
                title: chapter.title,
                description: chapter.description,
                order_index: chapter.order_index,
                items: items
            };
        });

        // Get unassigned exercises (exercises without chapter_id)
        const unassignedExercises = exercisesWithChapterResult.rows
            .filter(e => e.chapter_id === null)
            .map(e => ({
                type: 'exercise',
                id: e.id,
                title: e.title,
                description: e.description,
                difficulty: e.difficulty,
                language: e.language,
                order_index: e.order_index,
                completed: e.completed,
                best_score: e.best_score,
                attempts: e.attempts
            }))
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        // Get unassigned lectures too (lectures without chapter_id)
        const unassignedLectures = lecturesResult.rows
            .filter(l => l.chapter_id === null)
            .map(l => ({
                type: 'lecture',
                id: l.id,
                title: l.title,
                description: l.description,
                page_count: l.page_count,
                media_count: l.media_count,
                order_index: l.order_index,
                completed: l.lecture_completed,
                last_page_seen: l.last_page_seen
            }))
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        const unassignedItems = [...unassignedLectures, ...unassignedExercises]
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

        res.json({
            course: courseResult.rows[0],
            enrollment: enrollment.rows[0],
            chapters: chaptersWithMixedItems,
            unassignedItems: unassignedItems,
            // Keep flat arrays for backward compatibility
            exercises: exercisesResult.rows,
            submissions: submissionsResult.rows,
            lectures: lecturesResult.rows,
            timeBreakdown: timeResult.rows,
            stats: {
                totalAttempts,
                completedExercises,
                totalExercises: exercisesResult.rows.length,
                averageScore: Math.round(avgScore * 100) / 100,
                totalTimeSpent: totalTimeSpent,
                progressPercentage: exercisesResult.rows.length > 0
                    ? Math.round((completedExercises / exercisesResult.rows.length) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('Get enrolled course details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Start a time tracking session
const startTimeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // Check enrollment or creator status
        const [enrollment, course] = await Promise.all([
            db.query('SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]),
            db.query('SELECT created_by FROM courses WHERE id = $1', [courseId])
        ]);

        const isCreator = course.rows[0]?.created_by === userId;
        if (enrollment.rows.length === 0 && !isCreator) {
            return res.status(403).json({ error: 'Not enrolled in this course' });
        }

        // Creators previewing their own course don't need time tracking
        if (isCreator) {
            return res.status(200).json({ message: 'no-op' });
        }

        // Delete open sessions that were too short to count (quick bounces)
        await db.query(`
            DELETE FROM course_time_sessions
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
              AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER < 60
        `, [userId, courseId]);

        // Properly close any remaining open sessions
        await db.query(`
            UPDATE course_time_sessions
            SET ended_at = CURRENT_TIMESTAMP,
                duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
        `, [userId, courseId]);

        // Start new session
        const result = await db.query(
            'INSERT INTO course_time_sessions (user_id, course_id) VALUES ($1, $2) RETURNING *',
            [userId, courseId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Start time session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// End a time tracking session
const endTimeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // No-op for course creators
        const course = await db.query('SELECT created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows[0]?.created_by === userId) {
            return res.json({ message: 'no-op', session: null });
        }

        // End the session and calculate duration
        const result = await db.query(`
            UPDATE course_time_sessions
            SET ended_at = CURRENT_TIMESTAMP,
                duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at))::INTEGER
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
            RETURNING *
        `, [userId, courseId]);

        if (result.rows.length > 0) {
            const duration = result.rows[0].duration;

            if (duration < 60) {
                // Delete the session — it's just a bounce, not real study time
                await db.query('DELETE FROM course_time_sessions WHERE id = $1', [result.rows[0].id]);
            }
        }

        res.json({ message: 'Session ended', session: result.rows[0] || null });
    } catch (error) {
        console.error('End time session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Heartbeat to keep session alive and update time (call every 30 seconds)
const updateTimeSession = async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;

        // No-op for course creators
        const course = await db.query('SELECT created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows[0]?.created_by === userId) {
            return res.json({ session: null, isNew: false });
        }

        // Check for active session
        const session = await db.query(`
            SELECT * FROM course_time_sessions
            WHERE user_id = $1 AND course_id = $2 AND ended_at IS NULL
            ORDER BY started_at DESC LIMIT 1
        `, [userId, courseId]);

        if (session.rows.length === 0) {
            // No active session, start one
            const newSession = await db.query(
                'INSERT INTO course_time_sessions (user_id, course_id) VALUES ($1, $2) RETURNING *',
                [userId, courseId]
            );
            return res.json({ session: newSession.rows[0], isNew: true });
        }

        res.json({ session: session.rows[0], isNew: false });
    } catch (error) {
        console.error('Update time session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Get courses created by the professor
const getProfessorCourses = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query(`
            SELECT c.*, 
                   COUNT(DISTINCT e.id) as exercise_count,
                   COUNT(DISTINCT ch.id) as chapter_count,
                   COUNT(DISTINCT en.id) as enrollment_count
            FROM courses c
            LEFT JOIN exercises e ON c.id = e.course_id
            LEFT JOIN chapters ch ON c.id = ch.course_id
            LEFT JOIN enrollments en ON c.id = en.course_id
            WHERE c.created_by = $1
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `, [userId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get professor courses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Update course
const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, difficulty, long_description, learning_objectives, tags, estimated_hours, is_private, class_id, order_index, ai_hints_enabled, ai_hint_guidance, ai_hint_mode, custom_hint_levels } = req.body;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to edit this course' });
        }

        // Handle enrollment code when toggling privacy
        let enrollmentCode = course.rows[0].enrollment_code;
        if (is_private === true && !enrollmentCode) {
            // Generate a new enrollment code if making course private
            let isUnique = false;
            while (!isUnique) {
                enrollmentCode = generateEnrollmentCode();
                const existing = await db.query('SELECT id FROM courses WHERE enrollment_code = $1 AND id != $2', [enrollmentCode, id]);
                if (existing.rows.length === 0) isUnique = true;
            }
        } else if (is_private === false) {
            // Remove enrollment code if making course public
            enrollmentCode = null;
        }

        // class_id: explicit null = unassign, number = assign, absent = keep
        const prevClassId = course.rows[0].class_id;
        const finalClassId = 'class_id' in req.body
            ? (class_id != null && class_id !== '' ? parseInt(class_id) : null)
            : prevClassId;

        const aiHintsValue = ai_hints_enabled !== undefined ? ai_hints_enabled : course.rows[0].ai_hints_enabled;
        const aiHintGuidanceValue = ai_hint_guidance !== undefined ? (ai_hint_guidance || null) : course.rows[0].ai_hint_guidance;
        const aiHintModeValue = ai_hint_mode !== undefined ? (ai_hint_mode || 'none') : (course.rows[0].ai_hint_mode || 'none');
        const customHintLevelsValue = custom_hint_levels !== undefined ? custom_hint_levels : course.rows[0].custom_hint_levels;

        const result = await db.query(`
            UPDATE courses
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                difficulty = COALESCE($3, difficulty),
                long_description = COALESCE($4, long_description),
                learning_objectives = COALESCE($5, learning_objectives),
                tags = COALESCE($6, tags),
                estimated_hours = COALESCE($7, estimated_hours),
                is_private = COALESCE($8, is_private),
                enrollment_code = $9,
                class_id = $10,
                order_index = COALESCE($11, order_index),
                ai_hints_enabled = $13,
                ai_hint_guidance = $14,
                ai_hint_mode = $15,
                custom_hint_levels = $16,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `, [title, description, difficulty, long_description, learning_objectives, tags, estimated_hours, is_private, enrollmentCode, finalClassId, order_index, id, aiHintsValue, aiHintGuidanceValue, aiHintModeValue, customHintLevelsValue]);

        // Auto-enroll approved class members when course is assigned to a (new) class
        if (finalClassId && finalClassId !== prevClassId) {
            await enrollApprovedMembersInCourse(parseInt(id), finalClassId);
        }

        await cacheDel(`course:${id}`);
        await cacheDel(`courses:user:${userId}`);
        await cacheDel('courses:public');
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Delete course
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [id]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized to delete this course' });
        }

        // Delete records without CASCADE from courses
        await db.query('DELETE FROM enrollments WHERE course_id = $1', [id]);
        await db.query('DELETE FROM course_time_sessions WHERE course_id = $1', [id]);

        // chapters, exercises, submissions, user_progress all cascade from courses
        await db.query('DELETE FROM courses WHERE id = $1', [id]);
        await cacheDel(`course:${id}`);
        await cacheDel(`courses:user:${userId}`);
        await cacheDel('courses:public');
        res.json({ message: 'Course deleted successfully' });
    } catch (error) {
        console.error('Delete course error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Add chapter to course
const addChapter = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { title, description } = req.body;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Get next order index
        const maxOrder = await db.query(
            'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM chapters WHERE course_id = $1',
            [courseId]
        );

        const result = await db.query(
            'INSERT INTO chapters (course_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
            [courseId, title, description, maxOrder.rows[0].next_order]
        );

        // Notify enrolled students about the new chapter
        notifyNewChapter({ courseId: parseInt(courseId), chapterTitle: title, professorId: userId });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add chapter error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Update chapter
const updateChapter = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const { title, description, order_index } = req.body;
        const userId = req.user.id;

        // Verify ownership through course
        const chapter = await db.query(`
            SELECT ch.*, c.created_by 
            FROM chapters ch 
            JOIN courses c ON ch.course_id = c.id 
            WHERE ch.id = $1
        `, [chapterId]);
        
        if (chapter.rows.length === 0) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        if (chapter.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(`
            UPDATE chapters 
            SET title = COALESCE($1, title),
                description = COALESCE($2, description),
                order_index = COALESCE($3, order_index)
            WHERE id = $4
            RETURNING *
        `, [title, description, order_index, chapterId]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update chapter error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Delete chapter
const deleteChapter = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const userId = req.user.id;

        // Verify ownership through course
        const chapter = await db.query(`
            SELECT ch.*, c.created_by 
            FROM chapters ch 
            JOIN courses c ON ch.course_id = c.id 
            WHERE ch.id = $1
        `, [chapterId]);
        
        if (chapter.rows.length === 0) {
            return res.status(404).json({ error: 'Chapter not found' });
        }
        if (chapter.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await db.query('DELETE FROM chapters WHERE id = $1', [chapterId]);
        res.json({ message: 'Chapter deleted successfully' });
    } catch (error) {
        console.error('Delete chapter error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Get enrolled students for a course
const getCourseEnrolledStudents = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(`
            SELECT 
                u.id,
                u.username,
                u.email,
                e.enrolled_at,
                e.progress,
                COALESCE(time_stats.total_time, 0) as total_time_spent,
                COALESCE(time_stats.session_count, 0) as session_count,
                COUNT(DISTINCT ex.id) as total_exercises,
                COUNT(DISTINCT CASE WHEN up.completed = true THEN up.exercise_id END) as completed_exercises,
                COALESCE(sub_stats.total_attempts, 0) as total_attempts,
                COALESCE(sub_stats.avg_score, 0) as average_score,
                COALESCE(sub_stats.last_submission, NULL) as last_activity
            FROM enrollments e
            JOIN users u ON e.user_id = u.id
            LEFT JOIN exercises ex ON ex.course_id = e.course_id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = e.user_id
            LEFT JOIN (
                SELECT 
                    s.user_id,
                    COUNT(s.id) as total_attempts,
                    ROUND(AVG(s.score)::numeric, 2) as avg_score,
                    MAX(s.submitted_at) as last_submission
                FROM submissions s
                JOIN exercises ex2 ON s.exercise_id = ex2.id
                WHERE ex2.course_id = $1
                GROUP BY s.user_id
            ) sub_stats ON u.id = sub_stats.user_id
            LEFT JOIN (
                SELECT
                    user_id,
                    COUNT(*) as session_count,
                    SUM(CASE
                        WHEN duration IS NOT NULL THEN duration
                        ELSE EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::integer
                    END) as total_time
                FROM course_time_sessions
                WHERE course_id = $1 AND started_at IS NOT NULL
                GROUP BY user_id
            ) time_stats ON u.id = time_stats.user_id
            WHERE e.course_id = $1
            GROUP BY u.id, u.username, u.email, e.enrolled_at, e.progress,
                     time_stats.total_time, time_stats.session_count,
                     sub_stats.total_attempts, sub_stats.avg_score, sub_stats.last_submission
            ORDER BY e.enrolled_at DESC
        `, [courseId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get course enrolled students error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: Get detailed stats for a specific student in a course
const getStudentCourseDetails = async (req, res) => {
    try {
        const { courseId, studentId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Check if student is enrolled
        const enrollment = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [studentId, courseId]
        );

        if (enrollment.rows.length === 0) {
            return res.status(404).json({ error: 'Student not enrolled in this course' });
        }

        // Get student info
        const studentResult = await db.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [studentId]
        );

        // Get course info
        const courseResult = await db.query(
            'SELECT * FROM courses WHERE id = $1',
            [courseId]
        );

        // Get all exercises with student progress and timed session flags
        const exercisesResult = await db.query(`
            SELECT
                ex.id,
                ex.title,
                ex.description,
                ex.difficulty,
                ex.language,
                ex.time_limit_minutes,
                ch.title as chapter_title,
                COALESCE(up.completed, false) as completed,
                COALESCE(up.best_score, 0) as best_score,
                COALESCE(up.attempts, 0) as attempts,
                up.last_attempt_at,
                ts.tab_switches,
                ts.locked_by_flag,
                ts.locked_at,
                ts.unlocked_at
            FROM exercises ex
            LEFT JOIN chapters ch ON ex.chapter_id = ch.id
            LEFT JOIN user_progress up ON ex.id = up.exercise_id AND up.user_id = $1
            LEFT JOIN exam_sessions ts ON ex.id = ts.exercise_id AND ts.user_id = $1
            WHERE ex.course_id = $2
            ORDER BY ch.order_index, ex.order_index, ex.id
        `, [studentId, courseId]);

        // Get recent submissions
        const submissionsResult = await db.query(`
            SELECT 
                s.id,
                s.exercise_id,
                ex.title as exercise_title,
                s.score,
                s.status,
                s.tests_passed,
                s.tests_total,
                s.execution_time,
                s.submitted_at
            FROM submissions s
            JOIN exercises ex ON s.exercise_id = ex.id
            WHERE s.user_id = $1 AND ex.course_id = $2
            ORDER BY s.submitted_at DESC
            LIMIT 20
        `, [studentId, courseId]);

        // Get time sessions (only those >= 60s — exclude quick bounces)
        const timeSessionsResult = await db.query(`
            SELECT
                ts.started_at,
                ts.ended_at,
                COALESCE(ts.duration, EXTRACT(EPOCH FROM (COALESCE(ts.ended_at, NOW()) - ts.started_at))::integer) as duration_seconds
            FROM course_time_sessions ts
            WHERE ts.user_id = $1 AND ts.course_id = $2 AND ts.started_at IS NOT NULL
              AND COALESCE(ts.duration, EXTRACT(EPOCH FROM (COALESCE(ts.ended_at, NOW()) - ts.started_at))::integer) >= 60
            ORDER BY ts.started_at DESC
            LIMIT 10
        `, [studentId, courseId]);

        // Calculate total time spent (only sessions >= 60s)
        const totalTimeResult = await db.query(`
            SELECT COALESCE(SUM(duration), 0) as total_time
            FROM course_time_sessions
            WHERE user_id = $1 AND course_id = $2 AND duration IS NOT NULL AND duration >= 60
        `, [studentId, courseId]);
        const calculatedTotalTime = parseInt(totalTimeResult.rows[0]?.total_time || 0);

        // Calculate stats
        const totalExercises = exercisesResult.rows.length;
        const completedExercises = exercisesResult.rows.filter(e => e.completed).length;
        const totalAttempts = exercisesResult.rows.reduce((sum, e) => sum + (e.attempts || 0), 0);
        const averageScore = submissionsResult.rows.length > 0 
            ? submissionsResult.rows.reduce((sum, s) => sum + (s.score || 0), 0) / submissionsResult.rows.length
            : 0;

        res.json({
            student: studentResult.rows[0],
            course: courseResult.rows[0],
            enrollment: enrollment.rows[0],
            stats: {
                total_exercises: totalExercises,
                completed_exercises: completedExercises,
                progress_percentage: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
                total_attempts: totalAttempts,
                average_score: Math.round(averageScore * 100) / 100,
                total_time_spent: calculatedTotalTime,
                study_sessions_count: timeSessionsResult.rows.length
            },
            exercises: exercisesResult.rows,
            recentSubmissions: submissionsResult.rows,
            timeSessions: timeSessionsResult.rows
        });
    } catch (error) {
        console.error('Get student course details error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Regenerate enrollment code for a private course
const regenerateEnrollmentCode = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT * FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }
        if (!course.rows[0].is_private) {
            return res.status(400).json({ error: 'Course is not private' });
        }

        // Generate new unique enrollment code
        let enrollmentCode;
        let isUnique = false;
        while (!isUnique) {
            enrollmentCode = generateEnrollmentCode();
            const existing = await db.query('SELECT id FROM courses WHERE enrollment_code = $1 AND id != $2', [enrollmentCode, courseId]);
            if (existing.rows.length === 0) isUnique = true;
        }

        const result = await db.query(
            'UPDATE courses SET enrollment_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [enrollmentCode, courseId]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Regenerate enrollment code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Verify enrollment code (public endpoint for students to check before enrolling)
const verifyEnrollmentCode = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Enrollment code is required' });
        }

        const course = await db.query('SELECT id, enrollment_code, is_private FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }

        if (!course.rows[0].is_private) {
            return res.json({ valid: true });
        }

        const valid = code.toUpperCase() === course.rows[0].enrollment_code;
        res.json({ valid });
    } catch (error) {
        console.error('Verify enrollment code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Enroll in a private course using just the enrollment code (no course ID needed)
const enrollByCode = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.user.id;

        if (!code) {
            return res.status(400).json({ error: 'Enrollment code is required' });
        }

        // Find the course with this enrollment code
        const courseResult = await db.query(
            `SELECT c.*, u.username as creator_name
             FROM courses c
             LEFT JOIN users u ON c.created_by = u.id
             WHERE c.enrollment_code = $1 AND c.is_private = true`,
            [code.toUpperCase()]
        );

        if (courseResult.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid enrollment code. Please check the code and try again.' });
        }

        const course = courseResult.rows[0];

        // Check if already enrolled
        const existing = await db.query(
            'SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2',
            [userId, course.id]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({ 
                error: 'You are already enrolled in this course.',
                courseId: course.id,
                alreadyEnrolled: true
            });
        }

        // Enroll the user
        await db.query(
            'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)',
            [userId, course.id]
        );

        res.status(201).json({
            message: 'Successfully enrolled!',
            course: {
                id: course.id,
                title: course.title,
                description: course.description,
                difficulty: course.difficulty,
                creator_name: course.creator_name
            }
        });
    } catch (error) {
        console.error('Enroll by code error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Professor: per-exercise class-wide stats (which exercises students struggle with)
const getCourseExerciseStats = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const course = await db.query('SELECT created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) {
            return res.status(404).json({ error: 'Course not found' });
        }
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await db.query(`
            SELECT
                ex.id AS exercise_id,
                ex.title AS exercise_title,
                ex.difficulty,
                ch.title AS chapter_title,
                COUNT(up.id) FILTER (WHERE up.attempts > 0) AS students_attempted,
                COUNT(up.id) FILTER (WHERE up.completed = true) AS students_completed,
                ROUND((AVG(up.best_score) FILTER (WHERE up.attempts > 0))::numeric, 1) AS avg_score,
                ROUND((AVG(up.attempts) FILTER (WHERE up.attempts > 0))::numeric, 1) AS avg_attempts
            FROM exercises ex
            LEFT JOIN chapters ch ON ex.chapter_id = ch.id
            LEFT JOIN user_progress up ON up.exercise_id = ex.id
            WHERE ex.course_id = $1
            GROUP BY ex.id, ex.title, ex.difficulty, ch.title, ch.order_index, ex.order_index
            ORDER BY ch.order_index NULLS LAST, ex.order_index NULLS LAST, ex.id
        `, [courseId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Get course exercise stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const getExerciseStudentAttempts = async (req, res) => {
    try {
        const { courseId, exerciseId } = req.params;
        const userId = req.user.id;

        // Verify professor owns the course
        const course = await db.query('SELECT created_by FROM courses WHERE id = $1', [courseId]);
        if (course.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
        if (course.rows[0].created_by !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const exerciseResult = await db.query(
            'SELECT id, title, difficulty FROM exercises WHERE id = $1 AND course_id = $2',
            [exerciseId, courseId]
        );
        if (exerciseResult.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });

        // All enrolled students who attempted, with their full submission history
        const studentsResult = await db.query(`
            SELECT
                u.id   AS user_id,
                u.username,
                u.email,
                up.attempts,
                up.best_score,
                up.completed,
                up.last_attempt_at,
                (
                    SELECT json_agg(
                        json_build_object(
                            'id',           s.id,
                            'code',         s.code,
                            'language',     s.language,
                            'score',        s.score,
                            'tests_passed', s.tests_passed,
                            'tests_total',  s.tests_total,
                            'status',       s.status,
                            'submitted_at', s.submitted_at
                        ) ORDER BY s.submitted_at DESC
                    )
                    FROM submissions s
                    WHERE s.user_id = u.id AND s.exercise_id = $2
                ) AS submissions
            FROM user_progress up
            JOIN users u ON up.user_id = u.id
            WHERE up.exercise_id = $2
              AND up.attempts > 0
              AND EXISTS (
                  SELECT 1 FROM enrollments e
                  WHERE e.user_id = u.id AND e.course_id = $1
              )
            ORDER BY up.best_score DESC NULLS LAST, up.attempts ASC
        `, [courseId, exerciseId]);

        res.json({
            exercise: exerciseResult.rows[0],
            students: studentsResult.rows,
        });
    } catch (error) {
        console.error('Get exercise student attempts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse,
    enrollInCourse,
    unenrollFromCourse,
    getUserCourses,
    getEnrolledCourseDetails,
    getProfessorCourses,
    addChapter,
    updateChapter,
    deleteChapter,
    startTimeSession,
    endTimeSession,
    updateTimeSession,
    getCourseEnrolledStudents,
    getStudentCourseDetails,
    getCourseExerciseStats,
    getExerciseStudentAttempts,
    regenerateEnrollmentCode,
    verifyEnrollmentCode,
    enrollByCode,
};
