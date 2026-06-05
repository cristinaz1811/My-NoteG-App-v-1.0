# Faculty Mapping Testing Guide

## Prerequisites

1. Run migrations: `npm run migrate`
2. Seed faculties: `node backend/seed-faculties.js`
3. Start backend: `npm start` (or `npm run dev`)
4. API Base URL: `http://localhost:5000/api`

## Testing Workflow

### 1. Get All Faculties

```bash
curl http://localhost:5000/api/faculties
```

Expected response:
```json
[
  {
    "id": 1,
    "name": "Faculty of Economic Studies",
    "email_domain": "stud.ase.ro",
    "description": "Economics and Business studies",
    "created_at": "2026-06-05T10:00:00Z"
  },
  ...
]
```

### 2. Register Student from Faculty A

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student_a",
    "email": "student@stud.ase.ro",
    "password": "password123",
    "role": "student"
  }'
```

Expected response includes:
```json
{
  "user": {
    "id": 1,
    "username": "student_a",
    "email": "student@stud.ase.ro",
    "role": "student",
    "faculty_id": 1
  },
  "token": "eyJhbGc..."
}
```

### 3. Register Professor from Faculty A

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "prof_a",
    "email": "prof@stud.ase.ro",
    "password": "password123",
    "role": "professor"
  }'
```

Capture the returned `token` for use in next steps.

### 4. Login and Get Profile

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@stud.ase.ro",
    "password": "password123"
  }'
```

Response includes:
```json
{
  "user": {
    "id": 1,
    "username": "student_a",
    "email": "student@stud.ase.ro",
    "faculty_id": 1,
    "faculty_name": "Faculty of Economic Studies"
  },
  "token": "eyJhbGc..."
}
```

### 5. Professor Creates Course

Use the professor's token from step 3.

```bash
curl -X POST http://localhost:5000/api/courses \
  -H "Authorization: Bearer {PROF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Microeconomics 101",
    "description": "Introduction to microeconomics",
    "difficulty": "beginner",
    "language": "javascript",
    "is_private": false
  }'
```

Expected response:
```json
{
  "id": 1,
  "title": "Microeconomics 101",
  "created_by": 2,
  "creator_name": "prof_a",
  "creator_faculty_id": 1,
  "creator_faculty_name": "Faculty of Economic Studies"
}
```

### 6. Student Views Available Courses

Use the student's token from step 2.

```bash
curl http://localhost:5000/api/courses \
  -H "Authorization: Bearer {STUDENT_TOKEN}"
```

Expected response:
```json
[
  {
    "id": 1,
    "title": "Microeconomics 101",
    "creator_name": "prof_a",
    "faculty_id": 1,
    "faculty_name": "Faculty of Economic Studies"
  }
]
```

### 7. Register Student from Faculty B

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student_b",
    "email": "student@stud.upb.ro",
    "password": "password123",
    "role": "student"
  }'
```

Capture the token.

### 8. Student B Attempts to View Student A's Course

Using Student B's token:

```bash
curl http://localhost:5000/api/courses/1 \
  -H "Authorization: Bearer {STUDENT_B_TOKEN}"
```

Expected response (403 Forbidden):
```json
{
  "error": "Access denied. This course is not available for your faculty."
}
```

### 9. Student B Views Available Courses (Should See None)

Using Student B's token:

```bash
curl http://localhost:5000/api/courses \
  -H "Authorization: Bearer {STUDENT_B_TOKEN}"
```

Expected response: Empty array `[]` or courses from Faculty B professors only.

### 10. Enroll Student B in Faculty A Course

Professor A can enroll Student B manually (this is a separate feature). After enrollment, Student B should be able to access the course despite different faculty.

## Test Scenarios

### Scenario 1: Different Faculty Same Courses

**Setup:**
- Two faculties with similar course names
- Professors from each faculty

**Expected Behavior:**
- Students see only courses from their faculty
- Cannot see identical-named courses from other faculties

### Scenario 2: Cross-Faculty Enrollment

**Setup:**
- Student is enrolled in a course from a different faculty

**Expected Behavior:**
- Can access the course (backward compatible)
- Cannot see it in general course list

### Scenario 3: Google OAuth Registration

**Setup:**
- Register using Google OAuth with email from a faculty domain

**Expected Behavior:**
- Faculty is automatically assigned based on Google email domain
- Token includes `faculty_id` and `faculty_name`

## Debugging

### Check User Faculty Assignment

```sql
SELECT u.id, u.username, u.email, u.faculty_id, f.name 
FROM users u 
LEFT JOIN faculties f ON u.faculty_id = f.id 
WHERE u.email = 'student@stud.ase.ro';
```

### Check Course Creator Faculty

```sql
SELECT c.id, c.title, c.created_by, u.faculty_id, f.name 
FROM courses c 
JOIN users u ON c.created_by = u.id 
LEFT JOIN faculties f ON u.faculty_id = f.id;
```

### Check Token Contents

Decode JWT (without verification) to see included fields:

```bash
# Assuming token is in environment variable
TOKEN="eyJhbGc..."
echo $TOKEN | jq '. | split(".") | .[1] | @base64d | fromjson'
```

Should show:
```json
{
  "id": 1,
  "username": "student_a",
  "role": "student",
  "faculty_id": 1,
  "iat": 1717575600,
  "exp": 1718180400
}
```

## Edge Cases to Test

1. **No Faculty Mapped:** User with unmapped email domain
2. **Null Faculty:** User with `faculty_id = NULL` (backward compatibility)
3. **Faculty Deletion:** What happens when a faculty is deleted?
4. **Email Domain Case Sensitivity:** Test with uppercase/lowercase domains
5. **Multiple Domains:** If a faculty should have multiple email domains (not yet supported)

## Performance Testing

### Cache Behavior

1. First course list request (cache miss):
```bash
time curl http://localhost:5000/api/courses -H "Authorization: Bearer {TOKEN}"
```

2. Second request (should be much faster):
```bash
time curl http://localhost:5000/api/courses -H "Authorization: Bearer {TOKEN}"
```

Cache should invalidate after course creation/update.
