package com.example.studyconnect.data.repository

import android.content.ContentValues
import android.content.Context
import com.example.studyconnect.data.local.StudyConnectDbHelper
import com.example.studyconnect.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*

class StudyConnectRepository(context: Context) {

    private val dbHelper = StudyConnectDbHelper(context.applicationContext)
    private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
    private val dayNameFormat = SimpleDateFormat("EEE", Locale.getDefault())

    private val _subjects = MutableStateFlow<List<Subject>>(emptyList())
    val subjects: StateFlow<List<Subject>> = _subjects.asStateFlow()

    private val _timetable = MutableStateFlow<List<TimetableSlot>>(emptyList())
    val timetable: StateFlow<List<TimetableSlot>> = _timetable.asStateFlow()

    private val _attendance = MutableStateFlow<List<AttendanceRecord>>(emptyList())
    val attendance: StateFlow<List<AttendanceRecord>> = _attendance.asStateFlow()

    private val _tasks = MutableStateFlow<List<TaskItem>>(emptyList())
    val tasks: StateFlow<List<TaskItem>> = _tasks.asStateFlow()

    private val _tests = MutableStateFlow<List<TestItem>>(emptyList())
    val tests: StateFlow<List<TestItem>> = _tests.asStateFlow()

    private val _fitnessPlans = MutableStateFlow<List<FitnessDayPlan>>(emptyList())
    val fitnessPlans: StateFlow<List<FitnessDayPlan>> = _fitnessPlans.asStateFlow()

    private val _studyLogs = MutableStateFlow<List<DailyStudyLog>>(emptyList())
    val studyLogs: StateFlow<List<DailyStudyLog>> = _studyLogs.asStateFlow()

    private val _profile = MutableStateFlow(StudentProfile())
    val profile: StateFlow<StudentProfile> = _profile.asStateFlow()

    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    suspend fun refreshAll() = withContext(Dispatchers.IO) {
        loadSubjects()
        loadTimetable()
        loadAttendance()
        loadTasks()
        loadTests()
        loadFitness()
        load7DaysStudyLogs()
        loadProfile()
        loadNotifications()
    }

    private fun loadSubjects() {
        val db = dbHelper.readableDatabase
        val subjectList = mutableListOf<Subject>()
        val cursor = db.query(StudyConnectDbHelper.TABLE_SUBJECTS, null, null, null, null, null, "name ASC")
        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow("id")
            val nameCol = c.getColumnIndexOrThrow("name")
            val codeCol = c.getColumnIndexOrThrow("code")
            val colorCol = c.getColumnIndexOrThrow("color")
            while (c.moveToNext()) {
                val subId = c.getLong(idCol)
                val name = c.getString(nameCol)
                val code = c.getString(codeCol) ?: ""
                val color = c.getString(colorCol) ?: "#6366F1"

                // Load chapters
                val chapters = mutableListOf<Chapter>()
                val chCursor = db.query(
                    StudyConnectDbHelper.TABLE_CHAPTERS,
                    null,
                    "subject_id = ?",
                    arrayOf(subId.toString()),
                    null,
                    null,
                    "id ASC"
                )
                chCursor.use { cc ->
                    val chIdCol = cc.getColumnIndexOrThrow("id")
                    val chTitleCol = cc.getColumnIndexOrThrow("title")
                    val chCompCol = cc.getColumnIndexOrThrow("completed")
                    while (cc.moveToNext()) {
                        chapters.add(
                            Chapter(
                                id = cc.getLong(chIdCol),
                                subjectId = subId,
                                title = cc.getString(chTitleCol),
                                completed = cc.getInt(chCompCol) == 1
                            )
                        )
                    }
                }
                subjectList.add(Subject(id = subId, name = name, code = code, colorHex = color, chapters = chapters))
            }
        }
        _subjects.value = subjectList
    }

    private fun loadTimetable() {
        val db = dbHelper.readableDatabase
        val list = mutableListOf<TimetableSlot>()
        val cursor = db.query(StudyConnectDbHelper.TABLE_TIMETABLE, null, null, null, null, null, "start_time ASC")
        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow("id")
            val dayCol = c.getColumnIndexOrThrow("day")
            val subCol = c.getColumnIndexOrThrow("subject")
            val startCol = c.getColumnIndexOrThrow("start_time")
            val endCol = c.getColumnIndexOrThrow("end_time")
            val roomCol = c.getColumnIndexOrThrow("room")
            val facCol = c.getColumnIndexOrThrow("faculty")
            while (c.moveToNext()) {
                list.add(
                    TimetableSlot(
                        id = c.getLong(idCol),
                        day = c.getString(dayCol),
                        subject = c.getString(subCol),
                        startTime = c.getString(startCol),
                        endTime = c.getString(endCol),
                        room = c.getString(roomCol) ?: "",
                        faculty = c.getString(facCol) ?: ""
                    )
                )
            }
        }
        _timetable.value = list
    }

    private fun loadAttendance() {
        val db = dbHelper.readableDatabase
        val list = mutableListOf<AttendanceRecord>()
        val cursor = db.query(StudyConnectDbHelper.TABLE_ATTENDANCE, null, null, null, null, null, "date DESC")
        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow("id")
            val subCol = c.getColumnIndexOrThrow("subject")
            val dateCol = c.getColumnIndexOrThrow("date")
            val statusCol = c.getColumnIndexOrThrow("status")
            while (c.moveToNext()) {
                list.add(
                    AttendanceRecord(
                        id = c.getLong(idCol),
                        subject = c.getString(subCol),
                        date = c.getString(dateCol),
                        status = c.getString(statusCol)
                    )
                )
            }
        }
        _attendance.value = list
    }

    private fun loadTasks() {
        val db = dbHelper.readableDatabase
        val list = mutableListOf<TaskItem>()
        val cursor = db.query(StudyConnectDbHelper.TABLE_TASKS, null, null, null, null, null, "due_date ASC, id DESC")
        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow("id")
            val titleCol = c.getColumnIndexOrThrow("title")
            val descCol = c.getColumnIndexOrThrow("description")
            val subCol = c.getColumnIndexOrThrow("subject")
            val dueCol = c.getColumnIndexOrThrow("due_date")
            val priorityCol = c.getColumnIndexOrThrow("priority")
            val statusCol = c.getColumnIndexOrThrow("status")
            while (c.moveToNext()) {
                list.add(
                    TaskItem(
                        id = c.getLong(idCol),
                        title = c.getString(titleCol),
                        description = c.getString(descCol) ?: "",
                        subject = c.getString(subCol) ?: "",
                        dueDate = c.getString(dueCol) ?: "",
                        priority = c.getString(priorityCol) ?: "medium",
                        status = c.getString(statusCol) ?: "pending"
                    )
                )
            }
        }
        _tasks.value = list
    }

    private fun loadTests() {
        val db = dbHelper.readableDatabase
        val list = mutableListOf<TestItem>()
        val cursor = db.query(StudyConnectDbHelper.TABLE_TESTS, null, null, null, null, null, "date ASC")
        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow("id")
            val nameCol = c.getColumnIndexOrThrow("name")
            val subCol = c.getColumnIndexOrThrow("subject")
            val dateCol = c.getColumnIndexOrThrow("date")
            val timeCol = c.getColumnIndexOrThrow("time")
            val totCol = c.getColumnIndexOrThrow("total_marks")
            val obtCol = c.getColumnIndexOrThrow("obtained_marks")
            val notesCol = c.getColumnIndexOrThrow("notes")
            while (c.moveToNext()) {
                val total = if (c.isNull(totCol)) null else c.getDouble(totCol)
                val obtained = if (c.isNull(obtCol)) null else c.getDouble(obtCol)
                list.add(
                    TestItem(
                        id = c.getLong(idCol),
                        name = c.getString(nameCol),
                        subject = c.getString(subCol),
                        date = c.getString(dateCol),
                        time = c.getString(timeCol) ?: "",
                        totalMarks = total,
                        obtainedMarks = obtained,
                        notes = c.getString(notesCol) ?: ""
                    )
                )
            }
        }
        _tests.value = list
    }

    private fun loadFitness() {
        val db = dbHelper.readableDatabase
        val days = listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")
        val plans = mutableListOf<FitnessDayPlan>()

        for (day in days) {
            var workoutName = ""
            var isRest = false
            var notes = ""

            val pCursor = db.query(
                StudyConnectDbHelper.TABLE_FITNESS_PLANS,
                null,
                "day = ?",
                arrayOf(day),
                null,
                null,
                null
            )
            pCursor.use { c ->
                if (c.moveToFirst()) {
                    workoutName = c.getString(c.getColumnIndexOrThrow("workout_name")) ?: ""
                    isRest = c.getInt(c.getColumnIndexOrThrow("is_rest_day")) == 1
                    notes = c.getString(c.getColumnIndexOrThrow("notes")) ?: ""
                }
            }

            val exercises = mutableListOf<FitnessExercise>()
            val eCursor = db.query(
                StudyConnectDbHelper.TABLE_FITNESS_EXERCISES,
                null,
                "day = ?",
                arrayOf(day),
                null,
                null,
                "id ASC"
            )
            eCursor.use { c ->
                val idCol = c.getColumnIndexOrThrow("id")
                val nameCol = c.getColumnIndexOrThrow("name")
                val setsCol = c.getColumnIndexOrThrow("sets")
                val repsCol = c.getColumnIndexOrThrow("reps")
                val wtCol = c.getColumnIndexOrThrow("weight")
                val restCol = c.getColumnIndexOrThrow("rest_duration")
                val compCol = c.getColumnIndexOrThrow("completed")
                while (c.moveToNext()) {
                    exercises.add(
                        FitnessExercise(
                            id = c.getLong(idCol),
                            day = day,
                            name = c.getString(nameCol),
                            sets = c.getInt(setsCol),
                            reps = c.getString(repsCol) ?: "10",
                            weight = c.getString(wtCol) ?: "",
                            restDuration = c.getString(restCol) ?: "60s",
                            completed = c.getInt(compCol) == 1
                        )
                    )
                }
            }

            plans.add(
                FitnessDayPlan(
                    day = day,
                    workoutName = workoutName,
                    isRestDay = isRest,
                    notes = notes,
                    exercises = exercises
                )
            )
        }
        _fitnessPlans.value = plans
    }

    fun load7DaysStudyLogs() {
        val db = dbHelper.readableDatabase
        val logs = mutableListOf<DailyStudyLog>()
        val cal = Calendar.getInstance()
        val todayStr = dateFormat.format(cal.time)

        // Gather for each of the past 7 days (index 6 down to 0)
        for (i in 6 downTo 0) {
            val dayCal = Calendar.getInstance()
            dayCal.add(Calendar.DAY_OF_YEAR, -i)
            val dStr = dateFormat.format(dayCal.time)
            val dayLabel = if (i == 0) "Today" else dayNameFormat.format(dayCal.time)

            // Sum minutes for this date
            var sum = 0
            val cursor = db.rawQuery(
                "SELECT SUM(minutes) FROM ${StudyConnectDbHelper.TABLE_STUDY_SESSIONS} WHERE date = ?",
                arrayOf(dStr)
            )
            cursor.use { c ->
                if (c.moveToFirst() && !c.isNull(0)) {
                    sum = c.getInt(0)
                }
            }

            logs.add(
                DailyStudyLog(
                    date = dStr,
                    dayLabel = dayLabel,
                    minutesStudied = sum,
                    isToday = (i == 0)
                )
            )
        }
        _studyLogs.value = logs
    }

    private fun loadProfile() {
        val db = dbHelper.readableDatabase
        val cursor = db.query(StudyConnectDbHelper.TABLE_PROFILE, null, "id = 1", null, null, null, null)
        cursor.use { c ->
            if (c.moveToFirst()) {
                _profile.value = StudentProfile(
                    fullName = c.getString(c.getColumnIndexOrThrow("full_name")) ?: "Alex Rivers",
                    email = c.getString(c.getColumnIndexOrThrow("email")) ?: "alex.rivers@university.edu",
                    college = c.getString(c.getColumnIndexOrThrow("college")) ?: "",
                    university = c.getString(c.getColumnIndexOrThrow("university")) ?: "",
                    branch = c.getString(c.getColumnIndexOrThrow("branch")) ?: "",
                    year = c.getString(c.getColumnIndexOrThrow("year")) ?: "",
                    section = c.getString(c.getColumnIndexOrThrow("section")) ?: "",
                    rollNumber = c.getString(c.getColumnIndexOrThrow("roll_number")) ?: "",
                    phone = c.getString(c.getColumnIndexOrThrow("phone")) ?: "",
                    bio = c.getString(c.getColumnIndexOrThrow("bio")) ?: "",
                    strongSubjects = c.getString(c.getColumnIndexOrThrow("strong_subjects")) ?: "",
                    weakSubjects = c.getString(c.getColumnIndexOrThrow("weak_subjects")) ?: ""
                )
            }
        }
    }

    private fun loadNotifications() {
        val db = dbHelper.readableDatabase
        val list = mutableListOf<AppNotification>()
        val cursor = db.query(StudyConnectDbHelper.TABLE_NOTIFICATIONS, null, null, null, null, null, "timestamp DESC")
        cursor.use { c ->
            val idCol = c.getColumnIndexOrThrow("id")
            val titleCol = c.getColumnIndexOrThrow("title")
            val msgCol = c.getColumnIndexOrThrow("message")
            val typeCol = c.getColumnIndexOrThrow("type")
            val timeCol = c.getColumnIndexOrThrow("timestamp")
            val readCol = c.getColumnIndexOrThrow("is_read")
            while (c.moveToNext()) {
                list.add(
                    AppNotification(
                        id = c.getLong(idCol),
                        title = c.getString(titleCol),
                        message = c.getString(msgCol) ?: "",
                        type = c.getString(typeCol) ?: "info",
                        timestamp = c.getLong(timeCol),
                        isRead = c.getInt(readCol) == 1
                    )
                )
            }
        }
        _notifications.value = list
    }

    // ── CRUD Methods ──

    suspend fun logStudySession(minutes: Int, subject: String = "Self Study", mode: String = "Pomodoro") = withContext(Dispatchers.IO) {
        val todayStr = dateFormat.format(Date())
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("date", todayStr)
            put("minutes", minutes)
            put("subject", subject)
            put("mode", mode)
        }
        db.insert(StudyConnectDbHelper.TABLE_STUDY_SESSIONS, null, cv)
        load7DaysStudyLogs()
    }

    suspend fun markAttendance(subject: String, status: String, date: String = dateFormat.format(Date())) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("subject", subject)
            put("date", date)
            put("status", status)
        }
        db.insert(StudyConnectDbHelper.TABLE_ATTENDANCE, null, cv)
        loadAttendance()
    }

    suspend fun toggleTaskStatus(taskId: Long, isCompleted: Boolean) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("status", if (isCompleted) "completed" else "pending")
        }
        db.update(StudyConnectDbHelper.TABLE_TASKS, cv, "id = ?", arrayOf(taskId.toString()))
        loadTasks()
    }

    suspend fun addTask(title: String, desc: String, subject: String, dueDate: String, priority: String) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("title", title)
            put("description", desc)
            put("subject", subject)
            put("due_date", dueDate)
            put("priority", priority)
            put("status", "pending")
        }
        db.insert(StudyConnectDbHelper.TABLE_TASKS, null, cv)
        loadTasks()
    }

    suspend fun deleteTask(taskId: Long) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        db.delete(StudyConnectDbHelper.TABLE_TASKS, "id = ?", arrayOf(taskId.toString()))
        loadTasks()
    }

    suspend fun addSubject(name: String, code: String, color: String) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("name", name)
            put("code", code)
            put("color", color)
        }
        db.insert(StudyConnectDbHelper.TABLE_SUBJECTS, null, cv)
        loadSubjects()
    }

    suspend fun deleteSubject(subjectId: Long) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        db.delete(StudyConnectDbHelper.TABLE_CHAPTERS, "subject_id = ?", arrayOf(subjectId.toString()))
        db.delete(StudyConnectDbHelper.TABLE_SUBJECTS, "id = ?", arrayOf(subjectId.toString()))
        loadSubjects()
    }

    suspend fun toggleChapter(chapterId: Long, completed: Boolean) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("completed", if (completed) 1 else 0)
        }
        db.update(StudyConnectDbHelper.TABLE_CHAPTERS, cv, "id = ?", arrayOf(chapterId.toString()))
        loadSubjects()
    }

    suspend fun addChapter(subjectId: Long, title: String) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("subject_id", subjectId)
            put("title", title)
            put("completed", 0)
        }
        db.insert(StudyConnectDbHelper.TABLE_CHAPTERS, null, cv)
        loadSubjects()
    }

    suspend fun addTest(name: String, subject: String, date: String, time: String, totalMarks: Double?, obtainedMarks: Double?, notes: String) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("name", name)
            put("subject", subject)
            put("date", date)
            put("time", time)
            if (totalMarks != null) put("total_marks", totalMarks)
            if (obtainedMarks != null) put("obtained_marks", obtainedMarks)
            put("notes", notes)
        }
        db.insert(StudyConnectDbHelper.TABLE_TESTS, null, cv)
        loadTests()
    }

    suspend fun deleteTest(testId: Long) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        db.delete(StudyConnectDbHelper.TABLE_TESTS, "id = ?", arrayOf(testId.toString()))
        loadTests()
    }

    suspend fun addTimetableSlot(day: String, subject: String, start: String, end: String, room: String, faculty: String) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("day", day)
            put("subject", subject)
            put("start_time", start)
            put("end_time", end)
            put("room", room)
            put("faculty", faculty)
        }
        db.insert(StudyConnectDbHelper.TABLE_TIMETABLE, null, cv)
        loadTimetable()
    }

    suspend fun deleteTimetableSlot(id: Long) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        db.delete(StudyConnectDbHelper.TABLE_TIMETABLE, "id = ?", arrayOf(id.toString()))
        loadTimetable()
    }

    suspend fun toggleExerciseCompleted(id: Long, completed: Boolean) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("completed", if (completed) 1 else 0)
        }
        db.update(StudyConnectDbHelper.TABLE_FITNESS_EXERCISES, cv, "id = ?", arrayOf(id.toString()))
        loadFitness()
    }

    suspend fun updateProfile(p: StudentProfile) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply {
            put("full_name", p.fullName)
            put("email", p.email)
            put("college", p.college)
            put("university", p.university)
            put("branch", p.branch)
            put("year", p.year)
            put("section", p.section)
            put("roll_number", p.rollNumber)
            put("phone", p.phone)
            put("bio", p.bio)
            put("strong_subjects", p.strongSubjects)
            put("weak_subjects", p.weakSubjects)
        }
        db.update(StudyConnectDbHelper.TABLE_PROFILE, cv, "id = 1", null)
        _profile.value = p
    }

    suspend fun markNotificationRead(id: Long) = withContext(Dispatchers.IO) {
        val db = dbHelper.writableDatabase
        val cv = ContentValues().apply { put("is_read", 1) }
        db.update(StudyConnectDbHelper.TABLE_NOTIFICATIONS, cv, "id = ?", arrayOf(id.toString()))
        loadNotifications()
    }
}
