# Code Learning Platform - Database Schema

## Overview

This directory contains the complete database schema for the Code Learning Platform. The database is built on **PostgreSQL 15** and supports a comprehensive learning management system with:

- Multi-user support (Students & Professors)
- Course organization with chapters
- Lecture system with multi-page content and embedded media
- Exercise system supporting code, SQL, and optimization problems
- AI-powered hint system
- Plagiarism detection
- Exam proctoring with focus monitoring
- Student feedback from professors
- Calendar and scheduling
- Time tracking and analytics

## Files

### 1. **SCHEMA_UPDATED.sql** ⭐ (Recommended for presentation)
Comprehensive DDL script with:
- All 28 tables organized by functional area
- Proper indexes for performance
- Foreign key constraints
- Data type specifications
- Detailed comments and structure

**Use this file to:**
- Generate database diagrams
- Present to stakeholders
- Understand the complete schema
- Create new databases

### 2. **migrations/** (Directory)
Incremental migration scripts:
- `001_initial.sql` - Initial schema
- `020_schema_cleanup.sql` - Cleanup and fixes
- `021_add_faculties_and_email_mapping.sql` - Faculty system
- `022_add_student_feedback_system.sql` - Feedback system
- `023_add_custom_hint_levels.sql` - Custom AI hints
- **`024_remove_gamification.sql`** ⭐ **NEW** - Removes all gamification features

### 3. **FULL_DDL.sql**
Original complete DDL (legacy, contains gamification)

### 4. **docker-migrations.sql**
Docker initialization script

---

## Database Tables (28 Total)

### A. User Management (2 tables)
| Table | Purpose |
|-------|---------|
| `faculties` | Academic departments with email domain mapping |
| `users` | All platform users (students & professors) |

### B. Course Organization (3 tables)
| Table | Purpose |
|-------|---------|
| `courses` | Main teaching units |
| `chapters` | Course structure (groups lectures/exercises) |
| `enrollments` | Student enrollment in courses |

### C. Lecture System (4 tables)
| Table | Purpose |
|-------|---------|
| `lectures` | Course lectures |
| `lecture_pages` | Multi-page lecture content |
| `lecture_media` | Embedded media (images, videos) |
| `lecture_progress` | Student progress through lectures |

### D. Exercise System (5 tables)
| Table | Purpose |
|-------|---------|
| `exercises` | Programming exercises (code/SQL/optimization) |
| `exercise_files` | Multi-file exercise support |
| `test_cases` | Exercise test cases |
| `submissions` | Student code submissions |
| `user_progress` | Exercise completion tracking |

### E. AI Features (2 tables)
| Table | Purpose |
|-------|---------|
| `ai_hints` | Generated hints for exercises |
| `ai_complexity_analysis` | Code complexity analysis results |

### F. Exam Security (3 tables)
| Table | Purpose |
|-------|---------|
| `exam_sessions` | Timed exercises with focus monitoring |
| `course_time_sessions` | Study time tracking per course |
| `sql_sessions` | Database session management |

### G. Plagiarism Detection (2 tables)
| Table | Purpose |
|-------|---------|
| `plagiarism_reports` | Plagiarism scan reports |
| `plagiarism_matches` | Individual similarity matches |

### H. Class Management (3 tables)
| Table | Purpose |
|-------|---------|
| `college_years` | Academic years/terms |
| `classes` | Class sections |
| `class_enrollments` | Student enrollment in classes |

### I. Feedback & Communication (3 tables)
| Table | Purpose |
|-------|---------|
| `student_feedback` | Professor feedback to students |
| `help_requests` | Student help requests |
| `notifications` | System notifications |

### J. Calendar & Scheduling (1 table)
| Table | Purpose |
|-------|---------|
| `calendar_events` | Student calendar events |

---

## Key Features

### 1. **Multi-Page Lectures**
- Lectures split into multiple pages
- Each page has editable content
- Embedded media support (images, videos, documents)
- Student progress tracked per page

### 2. **Exercise Types**
Three types of exercises supported:
- **Code Exercises**: JavaScript, Python, etc.
- **SQL Exercises**: Database queries with validation
- **Optimization Exercises**: Algorithm efficiency challenges

### 3. **Multi-File Exercises**
- Exercises can have multiple starter code files
- Each file has separate starter code
- One entry point file designated

### 4. **AI-Powered Hints**
- Progressive hint system (3 levels)
- Customizable per course or exercise
- JSONB configuration for flexibility
- Three modes: solving, optimization, SQL

### 5. **Exam Proctoring**
- Timed exercise sessions
- Focus monitoring (tab switching detection)
- 3-violation lockout system
- Admin unlock capability

### 6. **Plagiarism Detection**
- Automated plagiarism scanning
- Token-based similarity matching
- Match fragments stored
- Review verdicts recorded

### 7. **Feedback System**
- Professors give feedback to students
- Categorized feedback (general, performance, effort, improvement, strengths)
- Sentiment tracking (positive/constructive)
- Student can view all feedback

### 8. **Class Organization**
- Academic years/terms structure
- Class sections within years
- Student enrollment with approval workflow
- Access keys for enrollment

---

## Performance Indexes

The schema includes 60+ indexes optimized for common queries:

### User Queries
```
idx_users_email, idx_users_username, idx_users_role, idx_users_faculty_id
```

### Course Queries
```
idx_courses_created_by, idx_courses_class_id, idx_courses_enrollment_code
```

### Enrollment Queries
```
idx_enrollments_user_id, idx_enrollments_course_id
```

### Submission Queries
```
idx_submissions_user_id, idx_submissions_exercise_id, idx_submissions_status
```

### Progress Queries
```
idx_user_progress_user_id, idx_user_progress_exercise_id
```

---

## Gamification Status

✅ **REMOVED** (Migration 024_remove_gamification.sql)

The following gamification tables have been removed:
- `badges` - Achievement badges system
- `user_badges` - User earned badges
- `user_xp` - User experience points
- `xp_transactions` - XP history

---

## Data Relationships

```
faculties
├── users (faculty_id)
│   ├── courses (created_by)
│   │   ├── chapters
│   │   │   ├── lectures
│   │   │   │   ├── lecture_pages
│   │   │   │   ├── lecture_media
│   │   │   │   └── lecture_progress (user_id)
│   │   │   └── exercises
│   │   │       ├── exercise_files
│   │   │       ├── test_cases
│   │   │       ├── submissions (user_id)
│   │   │       └── user_progress (user_id)
│   │   ├── enrollments (user_id)
│   │   ├── plagiarism_reports
│   │   │   └── plagiarism_matches
│   │   └── class_id -> classes
│   │       └── class_enrollments (user_id)
│   ├── notifications
│   ├── calendar_events
│   └── student_feedback
│       ├── course_id
│       └── professor_id
│
└── college_years
    └── classes
        └── class_enrollments (user_id)
```

---

## Data Volumes (Estimated)

| Table | Records | Notes |
|-------|---------|-------|
| users | 5K-10K | Students & professors |
| courses | 50-100 | Varies by institution |
| chapters | 200-400 | ~3-5 per course |
| lectures | 500-1K | ~5-10 per course |
| exercises | 200-500 | ~3-5 per course |
| enrollments | 5K-50K | ~50-100 per course |
| submissions | 50K-500K | Largest table |
| user_progress | 10K-50K | ~50 per student |
| course_time_sessions | 20K-100K | Daily tracking |
| calendar_events | 5K-50K | ~5-10 per student |

---

## How to Use

### 1. Creating a Fresh Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE code_learning;

# Load schema
\c code_learning
\i SCHEMA_UPDATED.sql
```

### 2. Running Migrations
```bash
# Run all migrations in order
psql -U postgres -d code_learning -f migrations/001_initial.sql
psql -U postgres -d code_learning -f migrations/020_schema_cleanup.sql
psql -U postgres -d code_learning -f migrations/021_add_faculties_and_email_mapping.sql
psql -U postgres -d code_learning -f migrations/022_add_student_feedback_system.sql
psql -U postgres -d code_learning -f migrations/023_add_custom_hint_levels.sql
psql -U postgres -d code_learning -f migrations/024_remove_gamification.sql
```

### 3. Generating Database Diagram
Use SCHEMA_UPDATED.sql with tools like:
- **DBeaver** - Open SQL file, right-click, "Create Diagram from SQL Script"
- **pgAdmin** - Import and visualize
- **Lucidchart** - Import PostgreSQL schema
- **Draw.io** - Create manual diagram from the documented structure

---

## Notes for Presentation

### Database Characteristics
- ✅ **Normalized** - Proper 3NF design
- ✅ **Indexed** - 60+ performance indexes
- ✅ **Constrained** - Foreign keys with CASCADE rules
- ✅ **Scalable** - Supports 1M+ users with partitioning potential
- ✅ **Flexible** - JSONB fields for extensibility (AI hints, results)
- ✅ **Auditable** - created_at/updated_at on all transactional tables

### Key Strengths
1. **Comprehensive** - Covers all aspects of online learning
2. **Secure** - Plagiarism detection & exam proctoring
3. **Intelligent** - AI hint system with customization
4. **Organized** - Clear separation of concerns
5. **Performant** - Strategic indexing
6. **Maintainable** - Incremental migrations

---

## Questions?

For schema-related questions or modifications:
1. Check the specific table definition in SCHEMA_UPDATED.sql
2. Review the migration that added the feature
3. Check indexes on high-query tables
4. Consider impact on existing data

---

**Last Updated:** June 6, 2026  
**Version:** 1.0 (Gamification Removed)  
**Database:** PostgreSQL 15+
