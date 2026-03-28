# Timetable Management System — Walkthrough

## What Was Built

A production-grade full-stack Timetable Management System with:

- **Backend**: Node.js + Express + MongoDB + JWT + bcrypt
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + Zustand + Axios

---

## Project Structure

```
e:\project\
├── backend\
│   ├── config\db.js          # MongoDB connection
│   ├── models\               # User, Department, Room, Timetable, Slot
│   ├── middleware\            # auth, role, deptAccess, errorHandler
│   ├── services\             # timetableService, conflictService
│   ├── controllers\          # auth, room, department, timetable, slot
│   ├── routes\               # All API routes
│   ├── utils\                # timeUtils, seed.js
│   ├── server.js             # Entry point
│   └── .env                  # Configuration
│
└── frontend\
    └── src\
        ├── app\              # Pages (login, dashboard, rooms, departments, timetable-builder, timetable/[roomId])
        ├── components\       # Sidebar, Navbar, AuthLayout, TimetableGrid, SlotModal
        ├── services\         # API service modules with Axios interceptor
        └── store\            # Zustand auth store
```

---

## How to Run

### 1. Start MongoDB
Ensure MongoDB is running on `localhost:27017`.

### 2. Start Backend
```bash
cd e:\project\backend
node utils/seed.js    # Seed initial data
npm start             # OR: npm run dev (with nodemon)
```

### 3. Start Frontend
```bash
cd e:\project\frontend
npm run dev
```

### 4. Login Credentials (from seed)

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `admin123` |
| Dept Admin (CS) | `cs_admin` | `dept123` |
| Dept Admin (Math) | `math_admin` | `dept123` |

---

## Key Features

### Backend
- **JWT Auth** with bcrypt password hashing and token expiry
- **Role middleware**: [allowRoles("SUPER_ADMIN")](file:///e:/project/backend/middleware/roleMiddleware.js#1-24) factory pattern
- **Dept access middleware**: DEPT_ADMIN can only edit their own department's slots
- **Conflict detection**: Prevents teacher & department double-booking across rooms
- **Auto-generated periods**: Input start time + duration → computes all period windows
- **Centralized error handler**: Mongoose validation/duplicate/cast errors parsed into clean JSON
- **Compound unique index**: [(timetableId, day, periodNumber)](file:///e:/project/backend/utils/seed.js#12-80) prevents duplicate slots

### Frontend
- **Dark mode UI** with indigo/purple gradient accents
- **Role-based sidebar**: Navigation adapts to SUPER_ADMIN vs DEPT_ADMIN
- **Timetable Builder**: Room selection, day toggles, time config with live period preview
- **Interactive timetable grid**: Days × Periods with department color coding
- **Slot edit modal**: Department dropdown, subject, teacher — disabled for restricted users (🔒)
- **Department filter** on timetable view
- **Toast notifications** for success/error feedback
- **Loading skeletons** for better UX
- **Demo credential buttons** on login page

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Current user profile |
| GET | `/api/rooms` | Yes | List all rooms |
| POST | `/api/rooms` | SUPER_ADMIN | Create room |
| GET | `/api/departments` | Yes | List departments |
| POST | `/api/departments` | SUPER_ADMIN | Create department |
| POST | `/api/timetable/create` | SUPER_ADMIN | Create timetable + slots |
| GET | `/api/timetable/:roomId` | Yes | Get timetable by room |
| GET | `/api/slots?timetableId=x` | Yes | Get slots for timetable |
| PUT | `/api/slots/:slotId` | Yes + Dept | Update slot (conflict check) |

---

## Verification

- ✅ Backend dependencies installed (136 packages, 0 vulnerabilities)
- ✅ Frontend build passed (Next.js 16.2.1, all pages compiled successfully)
