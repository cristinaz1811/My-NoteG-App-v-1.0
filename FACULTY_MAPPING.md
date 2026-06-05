# Faculty Email Mapping System

This document explains the faculty-to-email mapping system that restricts course visibility based on student email domains.

## Overview

Students can only see courses created by professors from their same faculty. The system automatically assigns a faculty to each student based on their email domain (e.g., `stud.ase.ro` → Faculty of Economic Studies).

## Database Schema

### Faculties Table

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

### Users Table (Updated)

The `users` table now includes:
- `faculty_id` (INTEGER): Foreign key to `faculties` table

## Setup

### 1. Run the Migration

```bash
npm run migrate
```

Or manually:
```bash
psql -h $DB_HOST -U $DB_USER -d $DB_NAME < database/migrations/021_add_faculties_and_email_mapping.sql
```

### 2. Seed Initial Faculty Data

```bash
node backend/seed-faculties.js
```

This creates default faculties with email domain mappings:

| Faculty | Email Domain |
|---------|--------------|
| Faculty of Economic Studies | stud.ase.ro |
| Faculty of Engineering | stud.upb.ro |
| Faculty of Computer Science | stud.fmi.ro |
| Faculty of Medicine | stud.umf.ro |
| Faculty of Law | stud.unibuc.ro |

## API Endpoints

### Get All Faculties
```
GET /api/faculties
Authorization: Optional
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Faculty of Economic Studies",
    "email_domain": "stud.ase.ro",
    "description": "Economics and Business studies",
    "created_at": "2026-06-05T10:00:00Z"
  }
]
```

### Create Faculty (Professor Only)
```
POST /api/faculties
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Faculty of Arts",
  "email_domain": "stud.unibuc-arts.ro",
  "description": "Arts and Humanities studies"
}
```

### Update Faculty (Professor Only)
```
PUT /api/faculties/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Faculty of Arts and Sciences",
  "email_domain": "stud.unibuc-arts.ro",
  "description": "Updated description"
}
```

### Delete Faculty (Professor Only)
```
DELETE /api/faculties/:id
Authorization: Bearer {token}
```

## How It Works

### During Student Registration

1. Student registers with email `student@stud.ase.ro`
2. System extracts domain: `stud.ase.ro`
3. System looks up faculty with matching email domain
4. Faculty ID is stored in user's `faculty_id` column
5. `faculty_name` is returned in response

### When Student Views Courses

1. System retrieves student's `faculty_id` from JWT token
2. Only courses created by professors with matching `faculty_id` are displayed
3. Students can still access enrolled courses from other faculties (for backward compatibility)

### When Student Views Course Details

1. System checks creator's faculty ID
2. If creator's faculty differs from student's faculty:
   - If student is enrolled in the course: access granted
   - If student is not enrolled: 403 Forbidden error

## Example Scenarios

### Scenario 1: Two Faculties with Different Courses

**Faculty Setup:**
- Faculty of Economic Studies: `stud.ase.ro`
- Faculty of Engineering: `stud.upb.ro`

**Professors:**
- Prof. A (stud.ase.ro) creates "Microeconomics 101"
- Prof. B (stud.upb.ro) creates "Circuit Design"

**Students:**
- Student A (stud.ase.ro) sees only "Microeconomics 101"
- Student B (stud.upb.ro) sees only "Circuit Design"

### Scenario 2: Cross-Faculty Course Access

If a student from Faculty B enrolls in a course from Faculty A:
- They can access it through the enrollment (backward compatible)
- It appears in their course details
- They cannot see it in the general course listing

## Configuration

### Adding a New Faculty

1. Using API (POST to `/api/faculties`):
```bash
curl -X POST http://localhost:5000/api/faculties \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculty of Medicine",
    "email_domain": "stud.umf.ro",
    "description": "Medicine and Healthcare studies"
  }'
```

2. Using Database:
```sql
INSERT INTO faculties (name, email_domain, description)
VALUES ('Faculty of Medicine', 'stud.umf.ro', 'Medicine and Healthcare studies');
```

### Updating Email Domain

To change a faculty's email domain (existing students keep their assignment):
```bash
curl -X PUT http://localhost:5000/api/faculties/{id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculty of Economic Studies",
    "email_domain": "students.ase.ro",
    "description": "Economics and Business studies"
  }'
```

## Troubleshooting

### Student Sees No Courses

1. Verify faculty was assigned during registration:
   ```bash
   SELECT id, email, faculty_id FROM users WHERE email = 'student@stud.ase.ro';
   ```

2. Verify faculty exists:
   ```bash
   SELECT * FROM faculties WHERE email_domain = 'stud.ase.ro';
   ```

3. Verify courses exist and are created by faculty:
   ```bash
   SELECT c.id, c.title, u.faculty_id 
   FROM courses c 
   JOIN users u ON c.created_by = u.id 
   WHERE c.class_id IS NULL AND c.is_private = false;
   ```

### Faculty Not Auto-Assigned

Check that:
1. `REQUIRE_ACADEMIC_EMAIL` is not set to 'false' (disables SWOT validation)
2. Faculty record exists with matching email domain
3. User's email domain matches faculty's `email_domain` exactly (case-insensitive)

### JWT Token Missing Faculty Info

After login, ensure the token contains `faculty_id`:
```bash
# Decode the JWT (without verification) to inspect
echo {token} | jq '. | split(".") | .[1] | @base64d | fromjson'
```

## Backward Compatibility

- Existing users without a `faculty_id` can still:
  - Enroll in courses (if not private)
  - Access enrolled courses
  - Professors can still see their own courses
  
- New registrations automatically get a `faculty_id` based on email domain

## Future Enhancements

1. **Faculty Switching:** Allow students to switch faculties through their profile
2. **Cross-Faculty Courses:** Allow professors to mark courses as multi-faculty
3. **Faculty Hierarchies:** Support sub-faculties or departments
4. **Role-Based Faculty Management:** Add faculty administrators
