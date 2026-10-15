package com.example.studyconnect.data.model

data class Chapter(
    val id: Long = 0,
    val subjectId: Long = 0,
    val title: String,
    val completed: Boolean = false
)

data class Subject(
    val id: Long = 0,
    val name: String,
    val code: String = "",
    val colorHex: String = "#6366F1",
    val chapters: List<Chapter> = emptyList()
) {
    val completedChaptersCount: Int get() = chapters.count { it.completed }
    val progress: Float get() = if (chapters.isEmpty()) 0f else completedChaptersCount.toFloat() / chapters.size
}

data class TimetableSlot(
    val id: Long = 0,
    val day: String, // Monday, Tuesday, etc.
    val subject: String,
    val startTime: String,
    val endTime: String,
    val room: String = "",
    val faculty: String = ""
)

data class AttendanceRecord(
    val id: Long = 0,
    val subject: String,
    val date: String, // YYYY-MM-DD
    val status: String // "present", "absent", "cancelled"
)

data class TaskItem(
    val id: Long = 0,
    val title: String,
    val description: String = "",
    val subject: String = "",
    val dueDate: String = "",
    val priority: String = "medium", // "low", "medium", "high"
    val status: String = "pending" // "pending", "completed"
)

data class TestItem(
    val id: Long = 0,
    val name: String,
    val subject: String,
    val date: String,
    val time: String = "",
    val totalMarks: Double? = null,
    val obtainedMarks: Double? = null,
    val notes: String = ""
) {
    val percentage: Double? get() = if (totalMarks != null && totalMarks > 0 && obtainedMarks != null) (obtainedMarks / totalMarks) * 100 else null
}

data class FitnessExercise(
    val id: Long = 0,
    val day: String,
    val name: String,
    val sets: Int = 3,
    val reps: String = "10",
    val weight: String = "",
    val restDuration: String = "60s",
    val completed: Boolean = false
)

data class FitnessDayPlan(
    val day: String,
    val workoutName: String = "",
    val isRestDay: Boolean = false,
    val notes: String = "",
    val exercises: List<FitnessExercise> = emptyList()
)

data class DailyStudyLog(
    val date: String, // YYYY-MM-DD
    val dayLabel: String, // e.g. "Mon", "Tue", "Today"
    val minutesStudied: Int,
    val isToday: Boolean = false
)

data class StudentProfile(
    val fullName: String = "Alex Rivers",
    val email: String = "alex.rivers@university.edu",
    val college: String = "Faculty of Computer Science",
    val university: String = "State University",
    val branch: String = "Computer Science & Engineering",
    val year: String = "3rd Year",
    val section: String = "Section B",
    val rollNumber: String = "CS-2024-042",
    val phone: String = "+1 (555) 234-5678",
    val bio: String = "Passionate student focusing on algorithms, distributed systems, and AI.",
    val strongSubjects: String = "Algorithms, Web Dev, Databases",
    val weakSubjects: String = "Theory of Computation, Calculus"
)

data class AppNotification(
    val id: Long = 0,
    val title: String,
    val message: String,
    val type: String = "info", // "warning", "info", "success"
    val timestamp: Long = System.currentTimeMillis(),
    val isRead: Boolean = false
)

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val text: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val modelName: String? = null
)
