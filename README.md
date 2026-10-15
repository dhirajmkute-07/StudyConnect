# StudyConnect — Academic Command Center (Android)

StudyConnect is a modern, personal academic command center for university and college students built with **Kotlin** and **Jetpack Compose**. It unifies timetable tracking, subject chapters with syllabus progress, 75% target attendance calculations, study tasks with priorities, exam score tracking, workout planning, and an integrated **Gemini AI Study Buddy**.

## Tech Stack & Architecture

- **Platform**: Android (minSdk 26, targetSdk 36)
- **UI Framework**: Jetpack Compose & Material Design 3 (M3)
- **Language**: Kotlin 2.2 with Compose Compiler
- **Architecture**: MVVM with Repository Pattern and Reactive StateFlows
- **Local Persistence**: SQLite database (`StudyConnectDbHelper`) with pre-seeded academic data
- **AI Integration**: Google Gemini API via REST (`GeminiChatService`) with role switching and multi-turn conversation memory

## Key Features

1. **Dashboard & Study Overview Bar Chart**:
   - Recharts-inspired interactive Bar Chart tracking study time completed over the past 7 days (day-by-day minutes, daily goal dashed line, daily average, and interactive tap inspection).
   - High-level KPI cards for overall attendance percentage, pending high-priority tasks, upcoming exams, and today's focused study minutes.
   - Today's lecture schedule with 1-tap attendance marking (`Present` / `Absent`).

2. **Subjects & Syllabus Progress**:
   - Color-coded subject badges and course codes.
   - Chapter and unit completion checklists with live syllabus progress percentages.
   - Add new subjects and chapters.

3. **Weekly Timetable**:
   - Monday to Sunday tabs.
   - Class time blocks with room numbers and faculty details.
   - Add or remove schedule entries.

4. **Attendance Tracker**:
   - Uses the exact formula: `Present / (Present + Absent) * 100` (`Cancelled` excluded).
   - Automatic 75% threshold analysis: computes safe classes you can miss, or consecutive lectures needed to restore attendance to 75%.
   - Subject-by-subject statistics and recent attendance logs.

5. **Study Plan & Tasks**:
   - Filter by All, Pending, or Done.
   - Priority tagging (High, Medium, Low) with color pills.
   - Due dates and linked subjects.

6. **Tests & Examinations**:
   - Upcoming exams countdown and past graded tests with marks percentages.
   - Cumulative average score tracking.

7. **FocusLearn Study Timer (Pomodoro)**:
   - 25m, 50m, 15m, 5m presets, plus custom countdown.
   - Animated circular countdown ring.
   - Automatically logs completed focus sessions into the local study sessions database, instantly updating the 7-day study overview bar chart.

8. **Fitness & Workout Planner**:
   - Monday to Sunday workout routines with rest day designations.
   - Exercises with sets, reps, weight, and rest intervals.
   - Interactive exercise completion checkboxes.

9. **Gemini AI Buddy (Study Assistant)**:
   - Multi-turn conversation history in a scrollable message thread.
   - Role switching with tailored system instructions:
     - **Academic Coach** (study habits & productivity)
     - **Exam Prep Tutor** (concept breakdowns & revision)
     - **Study Planner** (scheduling & timetable balancing)
     - **Wellness Guide** (workout routines & recovery)
   - Model selection: `gemini-3.8-flash` (recommended default), `gemini-3.1-flash-lite`, and `gemini-4-argon`.
   - Quick prompt chips for common student questions.

10. **Student Profile & System Notifications**:
    - Editable student profile (university, college, branch, roll number, strong/weak subjects, bio).
    - Alerts for upcoming exams, study streaks, and low attendance.
