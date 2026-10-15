package com.example.studyconnect.data.local

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

class StudyConnectDbHelper(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        const val DATABASE_NAME = "studyconnect.db"
        const val DATABASE_VERSION = 1

        const val TABLE_SUBJECTS = "subjects"
        const val TABLE_CHAPTERS = "chapters"
        const val TABLE_TIMETABLE = "timetable"
        const val TABLE_ATTENDANCE = "attendance"
        const val TABLE_TASKS = "tasks"
        const val TABLE_TESTS = "tests"
        const val TABLE_FITNESS_PLANS = "fitness_plans"
        const val TABLE_FITNESS_EXERCISES = "fitness_exercises"
        const val TABLE_STUDY_SESSIONS = "study_sessions"
        const val TABLE_PROFILE = "profile"
        const val TABLE_NOTIFICATIONS = "notifications"
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE $TABLE_SUBJECTS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                code TEXT,
                color TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_CHAPTERS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                completed INTEGER DEFAULT 0,
                FOREIGN KEY (subject_id) REFERENCES $TABLE_SUBJECTS(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_TIMETABLE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                subject TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                room TEXT,
                faculty TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_ATTENDANCE (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                subject TEXT NOT NULL,
                date TEXT NOT NULL,
                status TEXT NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_TASKS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                subject TEXT,
                due_date TEXT,
                priority TEXT DEFAULT 'medium',
                status TEXT DEFAULT 'pending'
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_TESTS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                subject TEXT NOT NULL,
                date TEXT NOT NULL,
                time TEXT,
                total_marks REAL,
                obtained_marks REAL,
                notes TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_FITNESS_PLANS (
                day TEXT PRIMARY KEY,
                workout_name TEXT,
                is_rest_day INTEGER DEFAULT 0,
                notes TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_FITNESS_EXERCISES (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                day TEXT NOT NULL,
                name TEXT NOT NULL,
                sets INTEGER DEFAULT 3,
                reps TEXT DEFAULT '10',
                weight TEXT,
                rest_duration TEXT DEFAULT '60s',
                completed INTEGER DEFAULT 0
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_STUDY_SESSIONS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                minutes INTEGER NOT NULL,
                subject TEXT,
                mode TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_PROFILE (
                id INTEGER PRIMARY KEY,
                full_name TEXT,
                email TEXT,
                college TEXT,
                university TEXT,
                branch TEXT,
                year TEXT,
                section TEXT,
                roll_number TEXT,
                phone TEXT,
                bio TEXT,
                strong_subjects TEXT,
                weak_subjects TEXT
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE $TABLE_NOTIFICATIONS (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT,
                type TEXT DEFAULT 'info',
                timestamp INTEGER,
                is_read INTEGER DEFAULT 0
            )
        """.trimIndent())

        seedInitialData(db)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_NOTIFICATIONS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_PROFILE")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_STUDY_SESSIONS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_FITNESS_EXERCISES")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_FITNESS_PLANS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_TESTS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_TASKS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_ATTENDANCE")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_TIMETABLE")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_CHAPTERS")
        db.execSQL("DROP TABLE IF EXISTS $TABLE_SUBJECTS")
        onCreate(db)
    }

    private fun seedInitialData(db: SQLiteDatabase) {
        // 1. Initial Subjects & Chapters
        val sub1Id = insertSubject(db, "Data Structures & Algorithms", "CS301", "#6366F1")
        insertChapter(db, sub1Id, "Arrays and Linked Lists", true)
        insertChapter(db, sub1Id, "Stacks, Queues, and Deques", true)
        insertChapter(db, sub1Id, "Trees and Binary Search Trees", true)
        insertChapter(db, sub1Id, "Graphs and Shortest Paths", false)
        insertChapter(db, sub1Id, "Dynamic Programming", false)

        val sub2Id = insertSubject(db, "Database Management Systems", "CS302", "#0EA5E9")
        insertChapter(db, sub2Id, "Relational Model & SQL", true)
        insertChapter(db, sub2Id, "ER Modeling & Normalization", true)
        insertChapter(db, sub2Id, "Indexing and Hashing", false)
        insertChapter(db, sub2Id, "Transactions & ACID Properties", false)

        val sub3Id = insertSubject(db, "Operating Systems", "CS303", "#10B981")
        insertChapter(db, sub3Id, "Processes and Threads", true)
        insertChapter(db, sub3Id, "CPU Scheduling Algorithms", true)
        insertChapter(db, sub3Id, "Memory Management & Paging", false)
        insertChapter(db, sub3Id, "Deadlock Detection & Prevention", false)

        val sub4Id = insertSubject(db, "Computer Networks", "CS304", "#F59E0B")
        insertChapter(db, sub4Id, "OSI & TCP/IP Layer Architecture", true)
        insertChapter(db, sub4Id, "Data Link Layer & Protocols", true)
        insertChapter(db, sub4Id, "Routing Algorithms", false)
        insertChapter(db, sub4Id, "Transport Layer (TCP/UDP)", false)

        // 2. Timetable
        val days = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
        insertTimetable(db, "Monday", "Data Structures & Algorithms", "09:00", "10:30", "Lab 2", "Dr. Vance")
        insertTimetable(db, "Monday", "Database Management Systems", "11:00", "12:30", "Room 401", "Prof. Lin")
        insertTimetable(db, "Monday", "Operating Systems", "14:00", "15:30", "Room 302", "Dr. Stone")

        insertTimetable(db, "Tuesday", "Computer Networks", "09:30", "11:00", "Room 205", "Prof. Miller")
        insertTimetable(db, "Tuesday", "Data Structures & Algorithms", "11:30", "13:00", "Room 101", "Dr. Vance")
        insertTimetable(db, "Tuesday", "Library & Self Study", "14:00", "16:00", "Central Library", "Mentor")

        insertTimetable(db, "Wednesday", "Database Management Systems", "09:00", "10:30", "Lab 1", "Prof. Lin")
        insertTimetable(db, "Wednesday", "Operating Systems", "11:00", "12:30", "Room 302", "Dr. Stone")
        insertTimetable(db, "Wednesday", "Computer Networks", "14:00", "15:30", "Room 205", "Prof. Miller")

        insertTimetable(db, "Thursday", "Data Structures & Algorithms", "10:00", "11:30", "Room 101", "Dr. Vance")
        insertTimetable(db, "Thursday", "Database Management Systems", "12:00", "13:30", "Room 401", "Prof. Lin")
        insertTimetable(db, "Thursday", "Project Work / Seminar", "14:30", "16:30", "Seminar Hall", "Faculty Panel")

        insertTimetable(db, "Friday", "Operating Systems", "09:00", "10:30", "Room 302", "Dr. Stone")
        insertTimetable(db, "Friday", "Computer Networks", "11:00", "12:30", "Lab 3", "Prof. Miller")
        insertTimetable(db, "Friday", "Weekly Review & Doubt Clearing", "14:00", "15:30", "Room 101", "Teaching Asst")

        // 3. Attendance records (Realistic ~82% attendance)
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val cal = Calendar.getInstance()
        for (i in 1..18) {
            cal.add(Calendar.DAY_OF_YEAR, -1)
            val dateStr = dateFormat.format(cal.time)
            val subName = when (i % 4) {
                0 -> "Data Structures & Algorithms"
                1 -> "Database Management Systems"
                2 -> "Operating Systems"
                else -> "Computer Networks"
            }
            val status = when {
                i == 3 || i == 11 -> "absent"
                i == 7 -> "cancelled"
                else -> "present"
            }
            insertAttendance(db, subName, dateStr, status)
        }

        // 4. Tasks / Study Plan
        val taskCal = Calendar.getInstance()
        taskCal.add(Calendar.DAY_OF_YEAR, 1)
        val tomorrow = dateFormat.format(taskCal.time)
        taskCal.add(Calendar.DAY_OF_YEAR, 2)
        val threeDays = dateFormat.format(taskCal.time)

        insertTask(db, "Implement Dijkstra's Algorithm in Kotlin", "Complete the graph shortest-path assignment with test cases", "Data Structures & Algorithms", tomorrow, "high", "pending")
        insertTask(db, "Write B-Tree Indexing Summary", "Prepare notes on secondary indexing and clustering", "Database Management Systems", threeDays, "medium", "pending")
        insertTask(db, "Practice Banker's Deadlock Algorithm", "Solve previous year exam problems on deadlock avoidance", "Operating Systems", tomorrow, "high", "pending")
        insertTask(db, "Socket Programming Lab Report", "Document client-server TCP handshake packet capture", "Computer Networks", threeDays, "low", "pending")
        insertTask(db, "Review Binary Heap Priority Queues", "Read chapter 4 and solve 5 LeetCode problems", "Data Structures & Algorithms", tomorrow, "medium", "completed")

        // 5. Tests
        val testCal = Calendar.getInstance()
        testCal.add(Calendar.DAY_OF_YEAR, 4)
        val testDate1 = dateFormat.format(testCal.time)
        testCal.add(Calendar.DAY_OF_YEAR, 8)
        val testDate2 = dateFormat.format(testCal.time)
        testCal.add(Calendar.DAY_OF_YEAR, -12)
        val pastTestDate = dateFormat.format(testCal.time)

        insertTest(db, "Midterm Exam 1: Graph Theory & DP", "Data Structures & Algorithms", testDate1, "10:00 AM", 50.0, null, "Bring blue book and graph paper. 4 questions total.")
        insertTest(db, "SQL & Normalization Quiz", "Database Management Systems", testDate2, "02:00 PM", 25.0, null, "Covers 1NF, 2NF, 3NF and BCNF transformations.")
        insertTest(db, "Process Synchronization Test", "Operating Systems", pastTestDate, "11:00 AM", 40.0, 36.0, "Great performance on Semaphores and Mutex locks!")

        // 6. Fitness Plan (Weekly Routine)
        insertFitnessPlan(db, "Monday", "Chest & Triceps Push", false, "Focus on controlled eccentrics and proper bench press bar path.")
        insertFitnessExercise(db, "Monday", "Barbell Bench Press", 4, "8-10", "135 lbs", "90s")
        insertFitnessExercise(db, "Monday", "Incline Dumbbell Press", 3, "10-12", "45 lbs", "60s")
        insertFitnessExercise(db, "Monday", "Dips / Tricep Pushdowns", 3, "12-15", "Bodyweight", "45s")

        insertFitnessPlan(db, "Tuesday", "Back & Biceps Pull", false, "Keep shoulders packed, pull with elbows.")
        insertFitnessExercise(db, "Tuesday", "Pull-Ups / Lat Pulldown", 4, "8-10", "Bodyweight", "90s")
        insertFitnessExercise(db, "Tuesday", "Barbell Bent-Over Row", 3, "10", "115 lbs", "75s")
        insertFitnessExercise(db, "Tuesday", "Incline Dumbbell Curls", 3, "12", "25 lbs", "45s")

        insertFitnessPlan(db, "Wednesday", "Active Recovery & Mobility", true, "30-min brisk walk or light cycling plus full body stretching.")
        insertFitnessExercise(db, "Wednesday", "Full Body Mobility Routine", 1, "20 min", "-", "0s")

        insertFitnessPlan(db, "Thursday", "Legs & Core Strength", false, "Warm up hips thoroughly.")
        insertFitnessExercise(db, "Thursday", "Barbell Back Squat", 4, "6-8", "165 lbs", "120s")
        insertFitnessExercise(db, "Thursday", "Romanian Deadlift", 3, "10", "135 lbs", "90s")
        insertFitnessExercise(db, "Thursday", "Hanging Leg Raises", 3, "15", "Bodyweight", "45s")

        insertFitnessPlan(db, "Friday", "Shoulders & Arms Hypertrophy", false, "Strict form, avoid shrugging during lateral raises.")
        insertFitnessExercise(db, "Friday", "Overhead Dumbbell Press", 3, "10", "40 lbs", "75s")
        insertFitnessExercise(db, "Friday", "Dumbbell Lateral Raises", 4, "15", "15 lbs", "45s")
        insertFitnessExercise(db, "Friday", "Hammer Curls", 3, "12", "25 lbs", "45s")

        insertFitnessPlan(db, "Saturday", "Cardio & Core Endurance", false, "5km steady state run followed by core circuit.")
        insertFitnessExercise(db, "Saturday", "Outdoor 5K Run", 1, "25 min", "-", "0s")
        insertFitnessExercise(db, "Saturday", "Plank Hold", 3, "60s", "-", "45s")

        insertFitnessPlan(db, "Sunday", "Rest Day", true, "Complete rest, hydrate, meal prep, and review upcoming week's study plan.")

        // 7. 7-Day Study Time Sessions (Past 7 days) - Fuels the Recharts-inspired study overview bar chart!
        val studyCal = Calendar.getInstance()
        val studyDurations = listOf(145, 110, 180, 95, 160, 210, 135) // minutes for past 6 days + today
        for (idx in 6 downTo 0) {
            val sessionCal = Calendar.getInstance()
            sessionCal.add(Calendar.DAY_OF_YEAR, -idx)
            val dateStr = dateFormat.format(sessionCal.time)
            val duration = studyDurations[6 - idx]
            insertStudySession(db, dateStr, duration, "Core Academics", "Pomodoro")
        }

        // 8. Profile
        val profileValues = ContentValues().apply {
            put("id", 1)
            put("full_name", "Alex Rivers")
            put("email", "alex.rivers@university.edu")
            put("college", "Faculty of Computer Science")
            put("university", "Tech State University")
            put("branch", "Computer Science & Engineering")
            put("year", "3rd Year (Semester 5)")
            put("section", "Section B")
            put("roll_number", "CS-2024-042")
            put("phone", "+1 (555) 234-5678")
            put("bio", "Engineering student passionate about systems architecture, algorithms, and machine intelligence. Striving for academic balance and fitness.")
            put("strong_subjects", "Data Structures, Database Systems, Linux")
            put("weak_subjects", "Theory of Computation, Complex Analysis")
        }
        db.insert(TABLE_PROFILE, null, profileValues)

        // 9. Notifications
        insertNotification(db, "Upcoming Exam Alert", "Midterm Exam 1 in Data Structures & Algorithms is in 4 days. Review graph algorithms!", "warning")
        insertNotification(db, "Attendance Goal Met", "Your overall attendance is currently at 84%, comfortably above your 75% target.", "success")
        insertNotification(db, "New Study Streak", "You've hit a 5-day continuous study streak! Keep up the great focus.", "info")
    }

    private fun insertSubject(db: SQLiteDatabase, name: String, code: String, color: String): Long {
        val cv = ContentValues().apply {
            put("name", name)
            put("code", code)
            put("color", color)
        }
        return db.insert(TABLE_SUBJECTS, null, cv)
    }

    private fun insertChapter(db: SQLiteDatabase, subjectId: Long, title: String, completed: Boolean) {
        val cv = ContentValues().apply {
            put("subject_id", subjectId)
            put("title", title)
            put("completed", if (completed) 1 else 0)
        }
        db.insert(TABLE_CHAPTERS, null, cv)
    }

    private fun insertTimetable(db: SQLiteDatabase, day: String, subject: String, start: String, end: String, room: String, faculty: String) {
        val cv = ContentValues().apply {
            put("day", day)
            put("subject", subject)
            put("start_time", start)
            put("end_time", end)
            put("room", room)
            put("faculty", faculty)
        }
        db.insert(TABLE_TIMETABLE, null, cv)
    }

    private fun insertAttendance(db: SQLiteDatabase, subject: String, date: String, status: String) {
        val cv = ContentValues().apply {
            put("subject", subject)
            put("date", date)
            put("status", status)
        }
        db.insert(TABLE_ATTENDANCE, null, cv)
    }

    private fun insertTask(db: SQLiteDatabase, title: String, desc: String, subject: String, dueDate: String, priority: String, status: String) {
        val cv = ContentValues().apply {
            put("title", title)
            put("description", desc)
            put("subject", subject)
            put("due_date", dueDate)
            put("priority", priority)
            put("status", status)
        }
        db.insert(TABLE_TASKS, null, cv)
    }

    private fun insertTest(db: SQLiteDatabase, name: String, subject: String, date: String, time: String, total: Double, obtained: Double?, notes: String) {
        val cv = ContentValues().apply {
            put("name", name)
            put("subject", subject)
            put("date", date)
            put("time", time)
            put("total_marks", total)
            if (obtained != null) put("obtained_marks", obtained)
            put("notes", notes)
        }
        db.insert(TABLE_TESTS, null, cv)
    }

    private fun insertFitnessPlan(db: SQLiteDatabase, day: String, workoutName: String, isRest: Boolean, notes: String) {
        val cv = ContentValues().apply {
            put("day", day)
            put("workout_name", workoutName)
            put("is_rest_day", if (isRest) 1 else 0)
            put("notes", notes)
        }
        db.insert(TABLE_FITNESS_PLANS, null, cv)
    }

    private fun insertFitnessExercise(db: SQLiteDatabase, day: String, name: String, sets: Int, reps: String, weight: String, rest: String) {
        val cv = ContentValues().apply {
            put("day", day)
            put("name", name)
            put("sets", sets)
            put("reps", reps)
            put("weight", weight)
            put("rest_duration", rest)
            put("completed", 0)
        }
        db.insert(TABLE_FITNESS_EXERCISES, null, cv)
    }

    private fun insertStudySession(db: SQLiteDatabase, date: String, minutes: Int, subject: String, mode: String) {
        val cv = ContentValues().apply {
            put("date", date)
            put("minutes", minutes)
            put("subject", subject)
            put("mode", mode)
        }
        db.insert(TABLE_STUDY_SESSIONS, null, cv)
    }

    private fun insertNotification(db: SQLiteDatabase, title: String, msg: String, type: String) {
        val cv = ContentValues().apply {
            put("title", title)
            put("message", msg)
            put("type", type)
            put("timestamp", System.currentTimeMillis())
            put("is_read", 0)
        }
        db.insert(TABLE_NOTIFICATIONS, null, cv)
    }
}
