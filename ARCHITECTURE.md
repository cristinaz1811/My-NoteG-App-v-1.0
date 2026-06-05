# Faculty Email Mapping Architecture

## System Flow Diagram

### Registration Flow

```
Student Registration
    ↓
Extract email domain (stud.ase.ro)
    ↓
Lookup faculty by domain
    ↓
Create user with faculty_id
    ↓
Include faculty_id in response
    ↓
Client receives faculty_name
```

### Login Flow

```
Login with email + password
    ↓
Verify credentials
    ↓
Fetch user's faculty_name from faculties table
    ↓
Create JWT with faculty_id payload
    ↓
Return token + user info including faculty_name
```

### Course Listing Flow

```
GET /api/courses with JWT token
    ↓
Extract faculty_id from JWT (req.user.faculty_id)
    ↓
Query courses WHERE creator.faculty_id = user.faculty_id
    ↓
Return only courses from same faculty
    ↓
Frontend displays courses
```

### Course Access Control Flow

```
GET /api/courses/:id with JWT token
    ↓
Fetch course + creator info
    ↓
Compare creator.faculty_id with user.faculty_id
    ↓
Same faculty? → Grant access
Different faculty? → Check enrollment
    ↓
Enrolled? → Grant access
Not enrolled? → 403 Forbidden
```

## Database Schema Relationships

```
┌──────────────┐
│   faculties  │
├──────────────┤
│ id (PK)      │
│ name         │
│ email_domain │ ← Maps email domains to faculties
│ description  │
│ created_at   │
└──────┬───────┘
       │ 1
       │
    FK │ Many
       │
       ↓
┌──────────────────┐         ┌──────────────┐
│     users        │         │   courses    │
├──────────────────┤         ├──────────────┤
│ id (PK)          │         │ id (PK)      │
│ username         │         │ title        │
│ email            │         │ created_by FK├──→ users.id
│ faculty_id FK ───┼────────→│ is_private   │
│ role             │         │ class_id     │
│ password_hash    │         │ created_at   │
│ created_at       │         │ updated_at   │
└──────────────────┘         └──────────────┘
       ▲                              ▲
       │                              │
       └──────────────────────────────┘
         Filtering: courses where
         creator.faculty_id = user.faculty_id
```

## API Endpoint Architecture

```
/api/faculties
├── GET /           → Get all faculties (public)
├── POST /          → Create faculty (professor only)
├── PUT /:id        → Update faculty (professor only)
└── DELETE /:id     → Delete faculty (professor only)

/api/auth
├── POST /register  → Register with auto faculty assignment
├── POST /login     → Login with faculty in JWT
└── GET /profile    → Get user profile with faculty_name

/api/courses
├── GET /           → List courses filtered by faculty
└── GET /:id        → Get course (with faculty access control)
```

## Request/Response Flow Example

### Example 1: Student Registration

```
REQUEST:
POST /api/auth/register
{
  "username": "john_doe",
  "email": "john@stud.ase.ro",
  "password": "secure123"
}

BACKEND PROCESSING:
1. Extract domain: "stud.ase.ro"
2. Query: SELECT * FROM faculties WHERE email_domain = 'stud.ase.ro'
3. Result: { id: 1, name: "Faculty of Economic Studies" }
4. Insert user with faculty_id = 1
5. Create JWT with payload: { id: 1, username: "john_doe", role: "student", faculty_id: 1 }

RESPONSE:
{
  "message": "User registered successfully...",
  "user": {
    "id": 1,
    "username": "john_doe",
    "email": "john@stud.ase.ro",
    "role": "student",
    "faculty_id": 1,
    "faculty_name": "Faculty of Economic Studies"
  },
  "token": "eyJhbGc..."
}
```

### Example 2: Student Views Courses

```
REQUEST:
GET /api/courses
Authorization: Bearer eyJhbGc... (contains faculty_id: 1)

BACKEND PROCESSING:
1. Extract faculty_id from JWT: 1
2. Query:
   SELECT c.* FROM courses c
   LEFT JOIN users u ON c.created_by = u.id
   WHERE c.class_id IS NULL
     AND u.faculty_id = 1
     AND (c.is_private = false OR user_enrolled)
3. Result: [{ id: 1, title: "Microeconomics", ... }]

RESPONSE:
[
  {
    "id": 1,
    "title": "Microeconomics",
    "created_by": 2,
    "creator_name": "prof_smith",
    "faculty_id": 1,
    "faculty_name": "Faculty of Economic Studies",
    ...
  }
]
```

### Example 3: Course Access Control

```
REQUEST:
GET /api/courses/1
Authorization: Bearer {STUDENT_FROM_DIFFERENT_FACULTY}

BACKEND PROCESSING:
1. Extract faculty_id from JWT: 2
2. Fetch course: { created_by: 2 }
3. Fetch creator: { faculty_id: 1 }
4. Compare: 2 != 1 (different faculty)
5. Check enrollment: NOT FOUND
6. Return 403 error

RESPONSE:
{
  "error": "Access denied. This course is not available for your faculty."
}
```

## Caching Strategy

```
Cache Key Structure:
- courses:user:{userId} → Cached course list per user
- course:{courseId} → Cached course details
- faculties:all → Cached faculty list (shared)

Cache Invalidation:
- When course is created/updated/deleted → Invalidate courses:user:*
- When user changes faculty → Invalidate courses:user:{userId}
- When faculty data changes → Invalidate faculties:all

Cache TTL:
- Course list: 120 seconds (2 minutes)
- Course detail: 300 seconds (5 minutes)
- Faculty list: 600 seconds (10 minutes)
```

## Performance Considerations

### Database Indexes
```sql
CREATE INDEX idx_faculties_email_domain ON faculties(email_domain);
CREATE INDEX idx_users_faculty_id ON users(faculty_id);
```

### Query Optimization

**Original query (without faculty filter):**
```sql
SELECT c.* FROM courses c
LEFT JOIN users u ON c.created_by = u.id
WHERE c.class_id IS NULL AND c.is_private = false
-- Result: Potentially thousands of courses
```

**Optimized query (with faculty filter):**
```sql
SELECT c.* FROM courses c
LEFT JOIN users u ON c.created_by = u.id
WHERE c.class_id IS NULL 
  AND u.faculty_id = $1
  AND c.is_private = false
-- Result: Only courses from one faculty (much smaller dataset)
```

**Impact:**
- Reduced database scan
- Smaller result set
- Better cache hit rate
- Faster response time

## Backward Compatibility

### Existing Users (NULL faculty_id)

```
User Registration Timeline:
  Before migration: faculty_id = NULL (NULL)
  After migration:  faculty_id = NULL (NULL) ← Same
  After first login: faculty_id = {assigned} ← Gets assigned on next login
```

### Course Access

```
Old behavior:
  SELECT courses WHERE is_private = false
  → All public courses visible to all students

New behavior:
  SELECT courses WHERE is_private = false AND creator.faculty_id = user.faculty_id
  → Only courses from same faculty

Backward compat:
  If user.faculty_id IS NULL:
    → Query returns courses with creator.faculty_id IS NULL
    → Only sees courses from other unassigned users
    → After assignment, can see proper faculty courses
```

## Security Considerations

### Faculty Isolation

```
✓ Students cannot see courses from other faculties
  (unless explicitly enrolled)

✓ Faculty filtering happens at query level
  (not byppassable by modifying token)

✓ Access control on update/delete operations
  (professors only)

✓ Faculty assignment immutable
  (set at registration, not user-changeable)
```

### Potential Issues

```
⚠ Domain spoofing:
  Mitigated by SWOT academic email validation
  Only real university emails accepted

⚠ Token manipulation:
  Mitigated by JWT signature verification
  Server re-checks faculty_id from database

⚠ SQL injection:
  Mitigated by parameterized queries ($1, $2, etc.)
```

## Scaling Considerations

### Expected Performance

With proper indexes:
- Faculty lookup by domain: O(log n) ← Fast
- Course listing for user: O(n) where n = courses in faculty
- User registration: O(1) ← Constant time

### Optimization Opportunities

```
If users > 100,000:
  → Consider caching faculty lookups in Redis
  
If courses > 1,000,000:
  → Add composite index on (created_by, is_private, class_id)
  
If daily API calls > 1,000,000:
  → Increase cache TTL for faculty list
  → Consider read replicas for course queries
```

## Integration Points

```
Frontend
  ├─ Show faculty name in profile
  ├─ Filter courses by faculty (client-side, for UX)
  └─ Display "Your Faculty" label

Backend
  ├─ Auth: Assign faculty on registration
  ├─ Courses: Filter by faculty
  ├─ Enrollment: Check faculty match (optional)
  └─ Analytics: Track by faculty

Database
  ├─ faculties table: Master list
  ├─ users.faculty_id: User assignment
  └─ courses: Indirectly via creator
```

## Testing Architecture

```
Unit Tests:
  - facultyService functions
  - Email domain extraction
  - Faculty lookup logic

Integration Tests:
  - Registration → Faculty assignment
  - Login → JWT creation with faculty_id
  - Course listing → Faculty filtering
  - Course access → Permission checks

E2E Tests:
  - Student A registers with stud.ase.ro
  - Student B registers with stud.upb.ro
  - Professor A creates course
  - Student A sees course
  - Student B cannot see course
  - Student B enrolls → Can access
```
