const express = require('express');
const router = express.Router();
const { authMiddleware, isProfessor } = require('../middleware/auth');
const calendarController = require('../controllers/calendarController');

// All routes require authentication
router.use(authMiddleware);

// Get all events (with optional filters: ?start=...&end=...&type=...&courseId=...)
router.get('/', calendarController.getEvents);

// Get upcoming events (?days=7)
router.get('/upcoming', calendarController.getUpcoming);

// Export events as ICS file (for Google Calendar / Outlook import)
router.get('/export/ics', calendarController.exportICS);

// Get Google Calendar URL for a specific event
router.get('/:id/google-url', calendarController.getGoogleCalendarUrl);

// Get Outlook Calendar URL for a specific event
router.get('/:id/outlook-url', calendarController.getOutlookCalendarUrl);

// Get a single event
router.get('/:id', calendarController.getEventById);

// Create a personal event
router.post('/', calendarController.createEvent);

// Professor: create event for all students in a course
router.post('/course-event', isProfessor, calendarController.createCourseEvent);

// Update an event
router.put('/:id', calendarController.updateEvent);

// Delete an event
router.delete('/:id', calendarController.deleteEvent);

module.exports = router;
