package com.example.studyconnect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.studyconnect.data.model.*
import com.example.studyconnect.ui.components.StudyBarChart
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight
import com.example.studyconnect.ui.theme.RoseDanger
import com.example.studyconnect.ui.theme.SkySecondary
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    profile: StudentProfile,
    studyLogs: List<DailyStudyLog>,
    timetable: List<TimetableSlot>,
    tasks: List<TaskItem>,
    tests: List<TestItem>,
    attendanceRecords: List<AttendanceRecord>,
    onNavigateToTimer: () -> Unit,
    onNavigateToTasks: () -> Unit,
    onNavigateToTests: () -> Unit,
    onNavigateToAttendance: () -> Unit,
    onNavigateToChat: () -> Unit,
    onMarkAttendance: (subject: String, status: String) -> Unit,
    onToggleTask: (taskId: Long, completed: Boolean) -> Unit
) {
    val dayOfWeek = SimpleDateFormat("EEEE", Locale.getDefault()).format(Date())
    val todayDateFormatted = SimpleDateFormat("EEE, d MMM yyyy", Locale.getDefault()).format(Date())

    // Filter today's timetable slots
    val todayClasses = timetable.filter { it.day.equals(dayOfWeek, ignoreCase = true) }

    // Attendance calculation: present / (present + absent) * 100
    val presentCount = attendanceRecords.count { it.status == "present" }
    val absentCount = attendanceRecords.count { it.status == "absent" }
    val totalCounted = presentCount + absentCount
    val attendancePct = if (totalCounted > 0) (presentCount.toFloat() / totalCounted) * 100f else 100f

    // Pending tasks
    val pendingTasks = tasks.filter { it.status == "pending" }
    val highPriorityPending = pendingTasks.filter { it.priority == "high" }

    // Today's study time
    val todayMinutes = studyLogs.firstOrNull { it.isToday }?.minutesStudied ?: 0

    // Next upcoming test
    val upcomingTests = tests.filter { it.obtainedMarks == null }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .testTag("dashboard_screen"),
        contentPadding = PaddingValues(bottom = 96.dp)
    ) {
        // Hero Header
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(bottomStart = 24.dp, bottomEnd = 24.dp)
                    )
                    .padding(horizontal = 20.dp, vertical = 24.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = "Welcome back,",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = profile.fullName,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = "${profile.branch} • ${profile.year}",
                                style = MaterialTheme.typography.bodySmall,
                                color = IndigoLight,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        // AI Buddy Floating Pill
                        Button(
                            onClick = onNavigateToChat,
                            shape = RoundedCornerShape(20.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = IndigoLight
                            ),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                            modifier = Modifier.testTag("ai_buddy_hero_button")
                        ) {
                            Icon(
                                imageVector = Icons.Default.AutoAwesome,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp),
                                tint = Color.White
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "AI Buddy",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = todayDateFormatted,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(16.dp)) }

        // Top KPI Stat Grid
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    KpiCard(
                        title = "Attendance",
                        value = "${attendancePct.toInt()}%",
                        subtitle = if (attendancePct >= 75f) "Target Met ✓" else "Below 75%",
                        icon = Icons.Default.FactCheck,
                        accentColor = if (attendancePct >= 75f) EmeraldTertiary else RoseDanger,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onNavigateToAttendance() }
                    )
                    KpiCard(
                        title = "Pending Tasks",
                        value = "${pendingTasks.size}",
                        subtitle = "${highPriorityPending.size} High Priority",
                        icon = Icons.Default.Assignment,
                        accentColor = if (highPriorityPending.isNotEmpty()) RoseDanger else SkySecondary,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onNavigateToTasks() }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    KpiCard(
                        title = "Upcoming Tests",
                        value = "${upcomingTests.size}",
                        subtitle = upcomingTests.firstOrNull()?.name?.take(16) ?: "All clear",
                        icon = Icons.Default.School,
                        accentColor = SkySecondary,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onNavigateToTests() }
                    )
                    KpiCard(
                        title = "Today's Focus",
                        value = if (todayMinutes >= 60) "${todayMinutes / 60}h ${todayMinutes % 60}m" else "${todayMinutes}m",
                        subtitle = "Tap to launch Timer",
                        icon = Icons.Default.Timer,
                        accentColor = IndigoLight,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onNavigateToTimer() }
                    )
                }
            }
        }

        item { Spacer(modifier = Modifier.height(20.dp)) }

        // Core Bar Chart: Past 7 Days Study Overview (replacing placeholder)
        item {
            Box(modifier = Modifier.padding(horizontal = 16.dp)) {
                StudyBarChart(
                    logs = studyLogs,
                    targetMinutes = 120
                )
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }

        // Today's Timetable Section
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.CalendarToday,
                            contentDescription = null,
                            tint = IndigoLight,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Today's Schedule ($dayOfWeek)",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Text(
                        text = "${todayClasses.size} classes",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (todayClasses.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(16.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Celebration, contentDescription = null, tint = EmeraldTertiary)
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                text = "No scheduled lectures today! Great day for project work or revision.",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        todayClasses.forEach { slot ->
                            ClassScheduleCard(
                                slot = slot,
                                onMarkPresent = { onMarkAttendance(slot.subject, "present") },
                                onMarkAbsent = { onMarkAttendance(slot.subject, "absent") }
                            )
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }

        // Upcoming Tests Preview
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Quiz, contentDescription = null, tint = IndigoLight, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Upcoming Exams & Tests",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "View all",
                        style = MaterialTheme.typography.bodySmall,
                        color = IndigoLight,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { onNavigateToTests() }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (upcomingTests.isEmpty()) {
                    Text(
                        text = "No upcoming tests recorded. You're all caught up!",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    upcomingTests.take(2).forEach { test ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = test.name,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "${test.subject} • ${test.date} at ${test.time}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }

                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer
                                ) {
                                    Text(
                                        text = "Max: ${test.totalMarks?.toInt() ?: 100} pts",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        item { Spacer(modifier = Modifier.height(24.dp)) }

        // High Priority Tasks Preview
        item {
            Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Checklist, contentDescription = null, tint = IndigoLight, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "High Priority Study Tasks",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "View all",
                        style = MaterialTheme.typography.bodySmall,
                        color = IndigoLight,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable { onNavigateToTasks() }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (pendingTasks.isEmpty()) {
                    Text(
                        text = "All study tasks completed!",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                } else {
                    pendingTasks.take(3).forEach { task ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(
                                    checked = task.status == "completed",
                                    onCheckedChange = { checked ->
                                        onToggleTask(task.id, checked)
                                    }
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = task.title,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = "${task.subject} • Due: ${task.dueDate}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun KpiCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accentColor: Color,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .background(accentColor.copy(alpha = 0.15f), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = accentColor,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.onSurface
            )

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                fontSize = 11.sp,
                color = accentColor,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@Composable
private fun ClassScheduleCard(
    slot: TimetableSlot,
    onMarkPresent: () -> Unit,
    onMarkAbsent: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Time Badge
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.width(68.dp)
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = slot.startTime,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Text(
                        text = slot.endTime,
                        fontSize = 10.sp,
                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = slot.subject,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${slot.room} • ${slot.faculty}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Quick Mark Buttons
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                IconButton(
                    onClick = onMarkPresent,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Mark Present",
                        tint = EmeraldTertiary,
                        modifier = Modifier.size(20.dp)
                    )
                }
                IconButton(
                    onClick = onMarkAbsent,
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Mark Absent",
                        tint = RoseDanger,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}
