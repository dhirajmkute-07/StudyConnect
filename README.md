# StudyConnect

A personal academic command center for students. Manage subjects, timetable, attendance, study tasks, tests, and more — in one clean dashboard. 


# This is dhiraj repo...
     insta_id dhirajkute108k


## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (SPA)
- **Backend**: Node.js + Express.js
- **Database**: MongoDB Atlas (Mongoose)
- **Auth**: JWT + bcrypt
- **Deploy**: Vercel

## Features

| Module | Description |
|--------|-------------|
| Auth | Signup / Login / Logout with JWT, bcrypt password hashing |
| Profile | Photo, academic details, editable fields |
| Subjects | CRUD + nested chapters with completion tracking |
| Timetable | User-defined weekly schedule |
| Attendance | Present/Absent/Cancelled/Not-Marked — formula: `Present ÷ (Present + Absent) × 100` |
| Study Plan | Tasks with priority, due date, status tracking |
| Tests/Exams | Upcoming and past tests with scoring |
| Notifications | Read/unread, mark-all-read, delete |
| FocusLearn | YouTube search (no API key required) |
| AI Buddy | Opens ChatGPT in a new tab |
| Study Timer | 25/45/60 min presets + custom, persists across navigation |
| Clock | Live digital clock using browser time |
| Settings | Light/Dark/System theme + accent color (localStorage) |

## Attendance Formula

```
Attendance % = Present / (Present + Absent) × 100
```

`Cancelled` and `Not Marked` are **excluded** from the denominator. Only deliberate absences count against the student.

## Local Development

### 1. Clone and install

```bash
git clone <your-repo-url>
cd StudyConnect
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/studyconnect?retryWrites=true&w=majority
JWT_SECRET=your_long_random_secret_here
PORT=3000
```

### 3. Run

```bash
npm start
# Open http://localhost:3000
```

For development with auto-restart:

```bash
npm run dev
```

## Deployment: GitHub → Vercel → MongoDB Atlas

### MongoDB Atlas Setup

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write access
3. Whitelist `0.0.0.0/0` in Network Access (Vercel uses dynamic IPs)
4. Copy the connection string from **Connect → Drivers**

### Vercel Deployment

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. In **Environment Variables**, add:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — your secret key
4. Click **Deploy**

The `vercel.json` in this repo routes all `/api/*` requests to the Express server and serves `public/` as static files.

## API Reference

All protected routes require `Authorization: Bearer <token>` header.

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/signup` | No | Create account |
| POST | `/api/auth/signin` | No | Login |
| GET | `/api/auth/me` | Yes | Verify token |
| GET/PUT | `/api/profile` | Yes | Get/update profile |
| POST | `/api/profile/photo-base64` | Yes | Upload profile photo |
| GET/POST | `/api/subjects` | Yes | List/create subjects |
| PUT/DELETE | `/api/subjects/:id` | Yes | Edit/delete subject |
| POST | `/api/subjects/:id/chapters` | Yes | Add chapter |
| PUT/DELETE | `/api/subjects/:id/chapters/:chId` | Yes | Edit/delete chapter |
| GET/POST | `/api/timetable` | Yes | List/create entries |
| PUT/DELETE | `/api/timetable/:id` | Yes | Edit/delete entry |
| GET/POST | `/api/attendance` | Yes | List/mark attendance |
| PUT/DELETE | `/api/attendance/:id` | Yes | Update/delete record |
| GET/POST | `/api/tasks` | Yes | List/create tasks |
| PUT/DELETE | `/api/tasks/:id` | Yes | Edit/delete task |
| GET/POST | `/api/tests` | Yes | List/create tests |
| PUT/DELETE | `/api/tests/:id` | Yes | Edit/delete test |
| GET | `/api/notifications` | Yes | List notifications |
| PUT | `/api/notifications/mark-all-read` | Yes | Mark all read |
| PUT | `/api/notifications/:id/read` | Yes | Mark one read |
| DELETE | `/api/notifications/:id` | Yes | Delete one |
| DELETE | `/api/notifications` | Yes | Clear all |

## MongoDB Collections

| Collection | Description |
|------------|-------------|
| `users` | Authentication — email, passwordHash |
| `profiles` | Academic profile data + photo (base64) |
| `subjects` | Subjects with embedded chapters array |
| `timetables` | Weekly schedule entries |
| `attendances` | Per-lecture attendance records |
| `tasks` | Study plan tasks |
| `tests` | Exam records with scoring |
| `notifications` | System + user notifications |

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWT tokens expire after 7 days
- All API routes verify token and scope data to `req.user.userId`
- No secrets in frontend code
- `.env` is gitignored
