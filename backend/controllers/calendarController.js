const db = require('../config/database');

// Get all calendar events for the authenticated user (with optional date range filter)
const getEvents = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start, end, type, courseId } = req.query;

        let query = `
            SELECT ce.*, 
                   c.title as course_title,
                   e.title as exercise_title,
                   u.username as created_by_name
            FROM calendar_events ce
            LEFT JOIN courses c ON ce.course_id = c.id
            LEFT JOIN exercises e ON ce.exercise_id = e.id
            LEFT JOIN users u ON ce.created_by = u.id
            WHERE ce.user_id = $1
        `;
        const params = [userId];
        let paramIdx = 2;

        if (start) {
            query += ` AND ce.start_time >= $${paramIdx}`;
            params.push(start);
            paramIdx++;
        }
        if (end) {
            query += ` AND ce.start_time <= $${paramIdx}`;
            params.push(end);
            paramIdx++;
        }
        if (type) {
            query += ` AND ce.event_type = $${paramIdx}`;
            params.push(type);
            paramIdx++;
        }
        if (courseId) {
            query += ` AND ce.course_id = $${paramIdx}`;
            params.push(courseId);
            paramIdx++;
        }

        query += ' ORDER BY ce.start_time ASC';

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching calendar events:', error);
        res.status(500).json({ error: 'Failed to fetch calendar events' });
    }
};

// Get a single event by ID
const getEventById = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            `SELECT ce.*, 
                    c.title as course_title,
                    e.title as exercise_title,
                    u.username as created_by_name
             FROM calendar_events ce
             LEFT JOIN courses c ON ce.course_id = c.id
             LEFT JOIN exercises e ON ce.exercise_id = e.id
             LEFT JOIN users u ON ce.created_by = u.id
             WHERE ce.id = $1 AND ce.user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
};

// Create a new calendar event
const createEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            title, description, event_type, start_time, end_time,
            all_day, color, course_id, exercise_id,
            recurrence, recurrence_end, reminder_minutes, is_public
        } = req.body;

        if (!title || !event_type || !start_time) {
            return res.status(400).json({ error: 'Title, event type, and start time are required' });
        }

        const result = await db.query(
            `INSERT INTO calendar_events 
             (user_id, course_id, exercise_id, title, description, event_type, 
              start_time, end_time, all_day, color, recurrence, recurrence_end,
              reminder_minutes, is_public, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING *`,
            [userId, course_id || null, exercise_id || null, title, description || null,
             event_type, start_time, end_time || null, all_day || false,
             color || null, recurrence || null, recurrence_end || null,
             reminder_minutes || 30, is_public || false, userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
};

// Professor: create event for all enrolled students in a course
const createCourseEvent = async (req, res) => {
    try {
        const professorId = req.user.id;
        const {
            title, description, event_type, start_time, end_time,
            all_day, color, course_id, exercise_id,
            recurrence, recurrence_end, reminder_minutes
        } = req.body;

        if (!title || !event_type || !start_time || !course_id) {
            return res.status(400).json({ error: 'Title, event type, start time, and course are required' });
        }

        // Verify the professor owns this course
        const courseCheck = await db.query(
            'SELECT id FROM courses WHERE id = $1 AND created_by = $2',
            [course_id, professorId]
        );
        if (courseCheck.rows.length === 0) {
            return res.status(403).json({ error: 'You do not own this course' });
        }

        // Get all enrolled students
        const enrollments = await db.query(
            'SELECT user_id FROM enrollments WHERE course_id = $1',
            [course_id]
        );

        const allUserIds = [professorId, ...enrollments.rows.map(e => e.user_id)];
        const createdEvents = [];

        for (const uid of allUserIds) {
            const result = await db.query(
                `INSERT INTO calendar_events 
                 (user_id, course_id, exercise_id, title, description, event_type,
                  start_time, end_time, all_day, color, recurrence, recurrence_end,
                  reminder_minutes, is_public, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                 RETURNING *`,
                [uid, course_id, exercise_id || null, title, description || null,
                 event_type, start_time, end_time || null, all_day || false,
                 color || null, recurrence || null, recurrence_end || null,
                 reminder_minutes || 30, true, professorId]
            );
            createdEvents.push(result.rows[0]);
        }

        res.status(201).json({ message: `Event created for ${allUserIds.length} users`, events: createdEvents });
    } catch (error) {
        console.error('Error creating course event:', error);
        res.status(500).json({ error: 'Failed to create course event' });
    }
};

// Update a calendar event
const updateEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const {
            title, description, event_type, start_time, end_time,
            all_day, color, course_id, exercise_id,
            recurrence, recurrence_end, reminder_minutes, is_public
        } = req.body;

        const result = await db.query(
            `UPDATE calendar_events SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                event_type = COALESCE($3, event_type),
                start_time = COALESCE($4, start_time),
                end_time = $5,
                all_day = COALESCE($6, all_day),
                color = $7,
                course_id = $8,
                exercise_id = $9,
                recurrence = $10,
                recurrence_end = $11,
                reminder_minutes = COALESCE($12, reminder_minutes),
                is_public = COALESCE($13, is_public),
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $14 AND user_id = $15
             RETURNING *`,
            [title, description, event_type, start_time, end_time || null,
             all_day, color || null, course_id || null, exercise_id || null,
             recurrence || null, recurrence_end || null, reminder_minutes, is_public,
             id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).json({ error: 'Failed to update event' });
    }
};

// Delete a calendar event
const deleteEvent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM calendar_events WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found or not authorized' });
        }

        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
};

// Export events to ICS format (for Google Calendar / Outlook import)
const exportICS = async (req, res) => {
    try {
        const userId = req.user.id;
        const { start, end, eventIds } = req.query;

        let query = `
            SELECT ce.*, c.title as course_title
            FROM calendar_events ce
            LEFT JOIN courses c ON ce.course_id = c.id
            WHERE ce.user_id = $1
        `;
        const params = [userId];
        let paramIdx = 2;

        if (eventIds) {
            const ids = eventIds.split(',').map(Number).filter(n => !isNaN(n));
            query += ` AND ce.id = ANY($${paramIdx})`;
            params.push(ids);
            paramIdx++;
        } else {
            if (start) {
                query += ` AND ce.start_time >= $${paramIdx}`;
                params.push(start);
                paramIdx++;
            }
            if (end) {
                query += ` AND ce.start_time <= $${paramIdx}`;
                params.push(end);
                paramIdx++;
            }
        }

        query += ' ORDER BY ce.start_time ASC';
        const result = await db.query(query, params);

        // Generate ICS content
        const icsEvents = result.rows.map(event => {
            const uid = `event-${event.id}@noteg.com`;
            const dtStart = formatICSDate(new Date(event.start_time), event.all_day);
            const dtEnd = event.end_time 
                ? formatICSDate(new Date(event.end_time), event.all_day) 
                : formatICSDate(new Date(new Date(event.start_time).getTime() + 3600000), event.all_day);
            
            let vevent = `BEGIN:VEVENT\r\n`;
            vevent += `UID:${uid}\r\n`;
            vevent += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
            
            if (event.all_day) {
                vevent += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
                vevent += `DTEND;VALUE=DATE:${dtEnd}\r\n`;
            } else {
                vevent += `DTSTART:${dtStart}\r\n`;
                vevent += `DTEND:${dtEnd}\r\n`;
            }
            
            vevent += `SUMMARY:${escapeICS(event.title)}\r\n`;
            
            if (event.description) {
                vevent += `DESCRIPTION:${escapeICS(event.description)}\r\n`;
            }
            if (event.course_title) {
                vevent += `CATEGORIES:${escapeICS(event.course_title)}\r\n`;
            }

            // Add alarm/reminder
            if (event.reminder_minutes) {
                vevent += `BEGIN:VALARM\r\n`;
                vevent += `TRIGGER:-PT${event.reminder_minutes}M\r\n`;
                vevent += `ACTION:DISPLAY\r\n`;
                vevent += `DESCRIPTION:${escapeICS(event.title)} - Reminder\r\n`;
                vevent += `END:VALARM\r\n`;
            }

            // Add recurrence rule
            if (event.recurrence) {
                const freq = event.recurrence.toUpperCase();
                let rrule = `RRULE:FREQ=${freq}`;
                if (event.recurrence_end) {
                    rrule += `;UNTIL=${formatICSDate(new Date(event.recurrence_end), true)}`;
                }
                vevent += `${rrule}\r\n`;
            }

            vevent += `END:VEVENT\r\n`;
            return vevent;
        });

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Note G//Calendar//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Note G Calendar',
            ...icsEvents,
            'END:VCALENDAR'
        ].join('\r\n');

        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="noteg-calendar.ics"');
        res.send(ics);
    } catch (error) {
        console.error('Error exporting ICS:', error);
        res.status(500).json({ error: 'Failed to export calendar' });
    }
};

// Generate Google Calendar URL for a single event
const getGoogleCalendarUrl = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            `SELECT ce.*, c.title as course_title
             FROM calendar_events ce
             LEFT JOIN courses c ON ce.course_id = c.id
             WHERE ce.id = $1 AND ce.user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = result.rows[0];
        const startDate = new Date(event.start_time);
        const endDate = event.end_time 
            ? new Date(event.end_time) 
            : new Date(startDate.getTime() + 3600000);

        const googleUrl = new URL('https://calendar.google.com/calendar/render');
        googleUrl.searchParams.set('action', 'TEMPLATE');
        googleUrl.searchParams.set('text', event.title);
        
        if (event.description) {
            googleUrl.searchParams.set('details', event.description);
        }

        if (event.all_day) {
            googleUrl.searchParams.set('dates', 
                `${formatGoogleDate(startDate, true)}/${formatGoogleDate(endDate, true)}`);
        } else {
            googleUrl.searchParams.set('dates', 
                `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`);
        }

        if (event.recurrence) {
            const freq = event.recurrence.toUpperCase();
            let rrule = `FREQ=${freq}`;
            if (event.recurrence_end) {
                rrule += `;UNTIL=${formatGoogleDate(new Date(event.recurrence_end), true)}`;
            }
            googleUrl.searchParams.set('recur', `RRULE:${rrule}`);
        }

        res.json({ url: googleUrl.toString() });
    } catch (error) {
        console.error('Error generating Google Calendar URL:', error);
        res.status(500).json({ error: 'Failed to generate Google Calendar URL' });
    }
};

// Generate Outlook Calendar URL for a single event
const getOutlookCalendarUrl = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const result = await db.query(
            `SELECT ce.*, c.title as course_title
             FROM calendar_events ce
             LEFT JOIN courses c ON ce.course_id = c.id
             WHERE ce.id = $1 AND ce.user_id = $2`,
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = result.rows[0];
        const startDate = new Date(event.start_time);
        const endDate = event.end_time 
            ? new Date(event.end_time) 
            : new Date(startDate.getTime() + 3600000);

        const outlookUrl = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
        outlookUrl.searchParams.set('path', '/calendar/action/compose');
        outlookUrl.searchParams.set('rru', 'addevent');
        outlookUrl.searchParams.set('subject', event.title);
        outlookUrl.searchParams.set('startdt', startDate.toISOString());
        outlookUrl.searchParams.set('enddt', endDate.toISOString());
        
        if (event.description) {
            outlookUrl.searchParams.set('body', event.description);
        }
        if (event.all_day) {
            outlookUrl.searchParams.set('allday', 'true');
        }

        res.json({ url: outlookUrl.toString() });
    } catch (error) {
        console.error('Error generating Outlook URL:', error);
        res.status(500).json({ error: 'Failed to generate Outlook Calendar URL' });
    }
};

// Get upcoming events (next 7 days by default)
const getUpcoming = async (req, res) => {
    try {
        const userId = req.user.id;
        const days = parseInt(req.query.days) || 7;
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const result = await db.query(
            `SELECT ce.*, 
                    c.title as course_title,
                    e.title as exercise_title
             FROM calendar_events ce
             LEFT JOIN courses c ON ce.course_id = c.id
             LEFT JOIN exercises e ON ce.exercise_id = e.id
             WHERE ce.user_id = $1 AND ce.start_time >= $2 AND ce.start_time <= $3
             ORDER BY ce.start_time ASC
             LIMIT 20`,
            [userId, now, future]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching upcoming events:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming events' });
    }
};

// ── Helpers ──────────────────────────────────────────────────────────────

function formatICSDate(date, dateOnly = false) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    if (dateOnly) return `${y}${m}${d}`;
    const h = String(date.getUTCHours()).padStart(2, '0');
    const min = String(date.getUTCMinutes()).padStart(2, '0');
    const s = String(date.getUTCSeconds()).padStart(2, '0');
    return `${y}${m}${d}T${h}${min}${s}Z`;
}

function formatGoogleDate(date, dateOnly = false) {
    if (dateOnly) {
        return date.toISOString().replace(/[-:]/g, '').split('T')[0];
    }
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
}

module.exports = {
    getEvents,
    getEventById,
    createEvent,
    createCourseEvent,
    updateEvent,
    deleteEvent,
    exportICS,
    getGoogleCalendarUrl,
    getOutlookCalendarUrl,
    getUpcoming,
};
