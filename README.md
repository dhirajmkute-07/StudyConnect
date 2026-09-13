# StudyConnect Professional v3

A responsive student learning and productivity website for **any student**, not tied to one college timetable.

## Core features
- Sign up / sign in / logout / verification / reset-password development flow
- User-isolated persistent data
- Editable student profile
- **User-created weekly timetable** (Monday-Saturday) with subject, time, teacher, location, type and notes
- Attendance is generated from the user's own timetable
- Present / Absent / Cancelled / Not Marked states
- **Monthly subject-wise attendance** using `Present / (Present + Absent)`
- Subjects and chapters with completion tracking
- Study plan / tasks
- Tests
- FocusLearn: search **any subject + any topic** on real YouTube without an API key
- AI Buddy opens the real ChatGPT site in a new tab
- Mobile/tablet/desktop responsive layout

## Run
```bash
npm install
npm start
```
Open http://localhost:3000

## Important attendance logic
- Present and Absent are counted as held lectures.
- Cancelled and Not Marked are excluded from the attendance percentage.
- Monthly stats are calculated separately for each subject using the attendance records created from that user's timetable.
- Changing the timetable affects future displayed class slots; historical attendance records remain stored.

## Production note
This version is a working local/prototype foundation using a JSON file for storage. For production, move storage to PostgreSQL/Supabase and use a real email provider for verification/reset emails.
