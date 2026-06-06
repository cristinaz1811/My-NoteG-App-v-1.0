# Faculty Email Mapping Implementation Summary

## Overview

A complete email-to-faculty mapping system has been implemented using SWOT for academic email validation. Students automatically get assigned to a faculty based on their email domain, and can only see courses created by professors from their same faculty.

## What Was Implemented

### 1. Database Schema Changes

**New Table: `faculties`**
```sql
CREATE TABLE faculties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    email_domain VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Updated Table: `users`**
- Added `faculty_id` column (foreign key to `faculties`)
- Index on `faculty_id` for fast lookups

**Migration File:** `database/migrations/021_add_faculties_and_email_mapping.sql`

### 2. Backend Services

**New Module: `backend/utils/facultyService.js`**
- `extractEmailDomain(email)` - Extracts domain from email
- `getFacultyByEmailDomain(email)` - Looks up faculty by email domain
- `getAllFaculties()` - Retrieves all faculties
- `createFaculty()` - Creates new faculty (admin/professor only)
- `updateFaculty()` - Updates faculty details
- `deleteFaculty()` - Deletes a faculty

### 3. Controllers

**New Controller: `backend/controllers/facultyController.js`**
- CRUD operations for faculties
- Proper error handling (unique constraints, not found errors)
- Role-based access control (professors only for write operations)

### 4. Routes

**New Routes: `backend/routes/faculties.js`**
- `GET /api/faculties` - Get all faculties (public)
- `POST /api/faculties` - Create faculty (professor only)
- `PUT /api/faculties/:id` - Update faculty (professor only)
- `DELETE /api/faculties/:id` - Delete faculty (professor only)

**Registration in Server:**
- Added to `backend/server.js` as `app.use('/api/faculties', facultyRoutes)`

### 5. Authentication Controller Updates

**File: `backend/controllers/authController.js`**

**Changes:**
1. Imports `getFacultyByEmailDomain` from facultyService
2. During registration:
   - Automatically looks up faculty based on email domain
   - Stores `faculty_id` in users table
   - Returns `faculty_id` in response
3. During Google OAuth signup:
   - Extracts faculty from email domain
   - Includes in temporary token for username selection
   - Returns `faculty_name` in response
4. During login:
   - Fetches faculty name
   - Includes `faculty_id` and `faculty_name` in JWT token
   - Returns to frontend in user object
5. Profile retrieval:
   - Returns `faculty_id` and `faculty_name` alongside user info

### 6. Course Controller Updates

**File: `backend/controllers/courseController.js`**

**`getAllCourses()` Function:**
- **Professors:** See only their own standalone courses (unchanged)
- **Students:** See standalone public courses from their faculty only
  - Query includes faculty filter on creator's `faculty_id`
  - Returns course with `faculty_id` and `faculty_name`
- **Unauthenticated:** See all public courses (no faculty restriction)

**`getCourseById()` Function:**
- Retrieves creator's `faculty_id` and `faculty_name`
- Access control for students:
  - Same faculty: Full access
  - Different faculty: Only if enrolled (backward compatible)
  - Returns 403 if not enrolled and different faculty
- Stores creator faculty info in cache

### 7. Seed Script

**New Script: `backend/seed-faculties.js`**

Default faculties (can be customized):
| Faculty | Email Domain | Description |
|---------|--------------|-------------|
| Faculty of Economic Studies | stud.ase.ro | Economics and Business |
| Faculty of Engineering | stud.upb.ro | Engineering and Technology |
| Faculty of Computer Science | stud.fmi.ro | Computer Science |
| Faculty of Medicine | stud.umf.ro | Medicine and Healthcare |
| Faculty of Law | stud.unibuc.ro | Law and Legal Studies |

Run with: `node backend/seed-faculties.js`

### 8. Documentation

**Files Created:**
1. `FACULTY_MAPPING.md` - Complete system documentation
   - Schema explanation
   - API endpoints with examples
   - How it works (registration, viewing courses)
   - Configuration guide
   - Troubleshooting section
   
2. `FACULTY_TESTING.md` - Testing guide
   - Step-by-step testing workflow
   - cURL examples for all operations
   - Test scenarios
   - Debugging queries
   - Edge cases
   
3. `IMPLEMENTATION_SUMMARY.md` - This file
   - Overview of all changes
   - Setup instructions
   - Architecture decisions

## Architecture Decisions

### 1. Faculty Assignment Strategy
- **Decision:** Auto-assign based on email domain at registration
- **Why:** Prevents manual assignment errors, scales automatically for new domains
- **Fallback:** Users without matching faculty get `faculty_id = NULL` (backward compatible)

### 2. Course Filtering
- **Decision:** Filter at database query level (not in application)
- **Why:** More efficient, reduces data transfer, consistent enforcement
- **Caching:** Cache invalidation still applies after course modifications

### 3. Cross-Faculty Access
- **Decision:** Allow enrolled students from other faculties to access courses
- **Why:** Maintains backward compatibility, supports cross-faculty programs
- **Check:** Only enforced on new course access, not existing enrollments

### 4. Role-Based Faculty Management
- **Decision:** Professors can CRUD faculties (not just admins)
- **Why:** Professors often manage their own institutional data
- **Alternative:** Can be changed to `isAdmin` in routes if needed

### 5. JWT Token Structure
- **Decision:** Include `faculty_id` in JWT
- **Why:** Allows course controller to filter without extra database query
- **Fields:** `id`, `username`, `role`, `faculty_id` (all needed for authorization)

## Setup Instructions

### Prerequisites
- PostgreSQL 15+
- Node.js 18+
- Backend dependencies installed (`npm install`)

### Step 1: Run Migration
```bash
npm run migrate
# Or manually:
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < database/migrations/021_add_faculties_and_email_mapping.sql
```

### Step 2: Seed Faculties
```bash
node backend/seed-faculties.js
```

Output:
```
Starting faculty seeding...
✓ Created faculty: Faculty of Economic Studies (stud.ase.ro)
✓ Created faculty: Faculty of Engineering (stud.upb.ro)
✓ Created faculty: Faculty of Computer Science (stud.fmi.ro)
✓ Created faculty: Faculty of Medicine (stud.umf.ro)
✓ Created faculty: Faculty of Law (stud.unibuc.ro)
Faculty seeding complete!
```

### Step 3: Start Backend
```bash
npm start
# Or for development:
npm run dev
```

## Testing

Quick verification test:

```bash
# 1. Get all faculties
curl http://localhost:5000/api/faculties

# 2. Register student with faculty domain
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "student@stud.ase.ro",
    "password": "password123"
  }'

# 3. Verify faculty_id is returned
# Look for "faculty_id": 1 in response
```

See `FACULTY_TESTING.md` for comprehensive testing guide.

## Files Modified

### Backend Controllers
- `backend/controllers/authController.js` - Added faculty lookup and JWT inclusion
- `backend/controllers/courseController.js` - Added faculty filtering

### Backend Routes
- `backend/server.js` - Registered faculty routes

### New Backend Files
- `backend/utils/facultyService.js` - Faculty lookup and CRUD
- `backend/controllers/facultyController.js` - Faculty endpoint handlers
- `backend/routes/faculties.js` - Faculty API routes
- `backend/seed-faculties.js` - Seed default faculties

### Database
- `database/migrations/021_add_faculties_and_email_mapping.sql` - Schema migration

### Documentation
- `FACULTY_MAPPING.md` - User and developer guide
- `FACULTY_TESTING.md` - QA testing guide
- `IMPLEMENTATION_SUMMARY.md` - This file
- `FULL_DDL.sql` - Updated (will be regenerated)

## Key Features

✅ **Automatic Faculty Assignment**
- Students auto-assigned to faculty based on email domain
- Uses existing SWOT academic email validation

✅ **Course Visibility Control**
- Students see only courses from their faculty
- Professors see only their own courses
- Backward compatible with enrolled courses from other faculties

✅ **Faculty Management API**
- Create, read, update, delete faculties
- Professor-accessible endpoints
- Proper error handling and validation

✅ **Database Efficiency**
- Faculty lookup via indexed email domain
- Course filtering at query level
- Minimal performance impact

✅ **Backward Compatibility**
- Existing users without `faculty_id` still work
- Enrolled students can access courses from other faculties
- No breaking changes to existing APIs

## Migration Path for Existing Users

For existing users without a `faculty_id`:

```sql
-- Option 1: Assign based on email domain
UPDATE users u
SET faculty_id = f.id
FROM faculties f
WHERE u.faculty_id IS NULL
  AND u.email LIKE CONCAT('%@', f.email_domain);

-- Option 2: Set to default faculty for unmatched emails
UPDATE users
SET faculty_id = (SELECT id FROM faculties LIMIT 1)
WHERE faculty_id IS NULL;

-- Option 3: Leave NULL and update as users log in
-- (Faculty will be assigned from JWT on next login)
```

## Future Enhancements

1. **Faculty Switching**
   - Allow students to switch faculties from profile
   - Audit trail of switches

2. **Multi-Domain Faculties**
   - Support multiple email domains per faculty
   - Domain aliasing

3. **Faculty Hierarchies**
   - Sub-faculties / departments
   - Course assignments to departments

4. **Cross-Faculty Courses**
   - Flag courses as multi-faculty
   - Allow professors to mark courses as open to other faculties

5. **Faculty Analytics**
   - Course statistics per faculty
   - Student engagement metrics by faculty

6. **API Rate Limiting by Faculty**
   - Limit API calls per faculty
   - Track usage metrics

## Troubleshooting

### Faculty not assigned during registration
1. Check `REQUIRE_ACADEMIC_EMAIL` environment variable
2. Verify faculty record exists with matching `email_domain`
3. Check email domain matches exactly (case-insensitive)

### Students see no courses
1. Verify professor and student have same `faculty_id`
2. Check course has `is_private = false`
3. Check course has `class_id IS NULL`

### JWT missing faculty_id
1. Ensure auth controller sets `faculty_id` in JWT payload
2. Check token decode at: `echo {token} | jq '. | split(".") | .[1] | @base64d | fromjson'`

See `FACULTY_MAPPING.md` for more troubleshooting.

## Support

For questions or issues:
1. Review `FACULTY_MAPPING.md` documentation
2. Check `FACULTY_TESTING.md` for testing examples
3. Run diagnostic SQL queries from troubleshooting section
4. Check application logs for error messages
