# Faculty Email Mapping - Quick Start Guide

## 5-Minute Setup

### 1. Run Database Migration
```bash
cd /Users/cristinazarnescu/Licenta/backend
node run-all-migrations.js
```

### 2. Seed Initial Faculties
```bash
node backend/seed-faculties.js
```

You should see:
```
✓ Created faculty: Faculty of Economic Studies (stud.ase.ro)
✓ Created faculty: Faculty of Engineering (stud.upb.ro)
✓ Created faculty: Faculty of Computer Science (stud.fmi.ro)
✓ Created faculty: Faculty of Medicine (stud.umf.ro)
✓ Created faculty: Faculty of Law (stud.unibuc.ro)
```

### 3. Start the Backend
```bash
npm start
# or npm run dev for development
```

## How It Works

### For Students
1. Register with university email (e.g., `student@stud.ase.ro`)
2. System automatically assigns faculty based on domain
3. Can only see courses created by professors in same faculty
4. Frontend shows their faculty name in profile

### For Professors
1. Can create courses (automatically tagged with their faculty)
2. Their courses visible only to students in same faculty
3. Can manage faculty list (create/update/delete)

## Common Tasks

### Add a New Faculty
```bash
curl -X POST http://localhost:5000/api/faculties \
  -H "Authorization: Bearer {PROFESSOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Faculty of Arts",
    "email_domain": "stud.arts.ro",
    "description": "Arts and Humanities"
  }'
```

### Register Student from Specific Faculty
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "student1",
    "email": "student1@stud.ase.ro",
    "password": "password123"
  }'
```

Check response - should include:
```json
"faculty_id": 1,
"faculty_name": "Faculty of Economic Studies"
```

### View Available Faculties
```bash
curl http://localhost:5000/api/faculties
```

### Check If Student Can See Course
```bash
# Student logs in and gets token
# Try to access a course with different faculty creator
curl http://localhost:5000/api/courses/1 \
  -H "Authorization: Bearer {STUDENT_TOKEN}"

# If different faculty and not enrolled:
# {"error": "Access denied. This course is not available for your faculty."}
```

## Key Files

| File | Purpose |
|------|---------|
| `database/migrations/021_add_faculties_and_email_mapping.sql` | Database schema |
| `backend/utils/facultyService.js` | Faculty lookup logic |
| `backend/controllers/facultyController.js` | API handlers |
| `backend/routes/faculties.js` | API routes |
| `backend/seed-faculties.js` | Initialize faculties |
| `FACULTY_MAPPING.md` | Complete documentation |
| `ARCHITECTURE.md` | System design details |
| `FACULTY_TESTING.md` | Testing guide |

## Default Faculties

| Domain | Faculty |
|--------|---------|
| stud.ase.ro | Faculty of Economic Studies |
| stud.upb.ro | Faculty of Engineering |
| stud.fmi.ro | Faculty of Computer Science |
| stud.umf.ro | Faculty of Medicine |
| stud.unibuc.ro | Faculty of Law |

To add more, edit `backend/seed-faculties.js` and run it again.

## Important Environment Variables

These are already set (check your `.env`):
- `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - Database
- `JWT_SECRET` - Token signing
- `REQUIRE_ACADEMIC_EMAIL` - Should be `true` for SWOT validation (default)

## Database Tables

### New Table: `faculties`
```
id | name | email_domain | description | created_at | updated_at
```

### Updated Table: `users`
Added column: `faculty_id` (foreign key to faculties.id)

## API Changes

### New Endpoints
```
GET    /api/faculties          # Get all faculties
POST   /api/faculties          # Create faculty (professor only)
PUT    /api/faculties/:id      # Update faculty (professor only)
DELETE /api/faculties/:id      # Delete faculty (professor only)
```

### Updated Endpoints
- `POST /api/auth/register` - Now includes `faculty_id` in response
- `POST /api/auth/login` - JWT includes `faculty_id`, response includes `faculty_name`
- `GET /api/auth/profile` - Returns `faculty_id` and `faculty_name`
- `GET /api/courses` - Filters by faculty for students
- `GET /api/courses/:id` - Access control by faculty

## Backward Compatibility

✓ Existing users without `faculty_id` still work
✓ Students can access enrolled courses from other faculties
✓ No breaking changes to existing endpoints

## Troubleshooting

### Faculty not assigned on registration
```sql
SELECT email, faculty_id FROM users WHERE faculty_id IS NULL LIMIT 5;
```
If null, check email domain matches a faculty:
```sql
SELECT * FROM faculties WHERE email_domain = 'stud.ase.ro';
```

### Student can't see courses
1. Check professor and student have same `faculty_id`
2. Check course `is_private = false`
3. Check course `class_id IS NULL`

```sql
SELECT c.id, c.title, u.faculty_id 
FROM courses c 
JOIN users u ON c.created_by = u.id;
```

### JWT not showing faculty_id
Decode token to see payload:
```bash
TOKEN="eyJhbGc..."
echo $TOKEN | jq '. | split(".") | .[1] | @base64d | fromjson'
```

Should show:
```json
{
  "id": 1,
  "username": "student",
  "role": "student",
  "faculty_id": 1,
  "iat": 1717575600,
  "exp": 1718180400
}
```

## Next Steps

1. ✅ Setup complete
2. Test with `FACULTY_TESTING.md`
3. Customize default faculties if needed
4. Read `ARCHITECTURE.md` for deeper understanding
5. Integrate with frontend to display faculty info

## Documentation Files

- **FACULTY_MAPPING.md** - Complete user and developer documentation
- **ARCHITECTURE.md** - System design, flows, and diagrams
- **FACULTY_TESTING.md** - Step-by-step testing guide
- **IMPLEMENTATION_SUMMARY.md** - What was implemented
- **FACULTY_QUICKSTART.md** - This file

Pick what you need for your use case!
