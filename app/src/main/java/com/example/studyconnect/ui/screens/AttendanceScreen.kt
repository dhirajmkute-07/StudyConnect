package com.example.studyconnect.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.RemoveCircleOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.studyconnect.data.model.AttendanceRecord
import com.example.studyconnect.data.model.Subject
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight
import com.example.studyconnect.ui.theme.RoseDanger
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceScreen(
    attendanceRecords: List<AttendanceRecord>,
    subjects: List<Subject>,
    onMarkAttendance: (subject: String, status: String, date: String) -> Unit
) {
    val targetPct = 75f

    // Total counts across all subjects
    val present = attendanceRecords.count { it.status == "present" }
    val absent = attendanceRecords.count { it.status == "absent" }
    val cancelled = attendanceRecords.count { it.status == "cancelled" }
    val totalCounted = present + absent
    val overallPct = if (totalCounted > 0) (present.toFloat() / totalCounted) * 100f else 100f

    // Consecutive classes calculation:
    // If < 75%: (present + x) / (totalCounted + x) >= 0.75  =>  x >= (0.75 * totalCounted - present) / 0.25
    val classesNeeded = if (overallPct < targetPct) {
        val needed = ((0.75f * totalCounted - present) / 0.25f).toInt() + 1
        maxOf(1, needed)
    } else 0

    // Missable classes:
    // present / (totalCounted + y) >= 0.75 => y <= (present - 0.75 * totalCounted) / 0.75
    val canMiss = if (overallPct >= targetPct && totalCounted > 0) {
        val miss = ((present - 0.75f * totalCounted) / 0.75f).toInt()
        maxOf(0, miss)
    } else 0

    var showMarkDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Attendance Tracker", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showMarkDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Mark Attendance") },
                containerColor = IndigoLight,
                contentColor = Color.White,
                modifier = Modifier
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .testTag("mark_attendance_fab")
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("attendance_screen"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Overall Gauge Card
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = "Overall Attendance Rate",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        Box(
                            modifier = Modifier
                                .size(110.dp)
                                .background(
                                    color = if (overallPct >= targetPct) EmeraldTertiary.copy(alpha = 0.15f) else RoseDanger.copy(alpha = 0.15f),
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(
                                    text = "${overallPct.toInt()}%",
                                    fontSize = 28.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (overallPct >= targetPct) EmeraldTertiary else RoseDanger
                                )
                                Text(
                                    text = "Goal: 75%",
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        // Target Analysis Callout
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = if (overallPct >= targetPct) Color(0xFFDCFCE7) else Color(0xFFFFE4E6),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text(
                                text = if (overallPct >= targetPct) {
                                    "Safe! You can miss $canMiss more lecture${if (canMiss == 1) "" else "s"} without falling below the 75% requirement."
                                } else {
                                    "Attention: You must attend the next $classesNeeded consecutive class${if (classesNeeded == 1) "" else "es"} to restore your attendance to 75%."
                                },
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = if (overallPct >= targetPct) Color(0xFF15803D) else Color(0xFFBE123C),
                                modifier = Modifier.padding(12.dp)
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        // Summary Pill Row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly
                        ) {
                            CountPill("Present", present, EmeraldTertiary)
                            CountPill("Absent", absent, RoseDanger)
                            CountPill("Cancelled", cancelled, MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }

            // Subject-wise Breakdown
            item {
                Text(
                    text = "Subject-Wise Statistics",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            // Distinct subjects from list or attendance records
            val subjectNames = (subjects.map { it.name } + attendanceRecords.map { it.subject }).distinct()
            if (subjectNames.isEmpty()) {
                item {
                    Text(
                        text = "No subject attendance data available yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(subjectNames) { subName ->
                    val subRecords = attendanceRecords.filter { it.subject.equals(subName, ignoreCase = true) }
                    val p = subRecords.count { it.status == "present" }
                    val a = subRecords.count { it.status == "absent" }
                    val c = subRecords.count { it.status == "cancelled" }
                    val counted = p + a
                    val pct = if (counted > 0) (p.toFloat() / counted) * 100f else 100f

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = subName,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "${pct.toInt()}%",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = if (pct >= targetPct) EmeraldTertiary else RoseDanger
                                )
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            LinearProgressIndicator(
                                progress = { pct / 100f },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(6.dp),
                                color = if (pct >= targetPct) EmeraldTertiary else RoseDanger,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            Text(
                                text = "Present: $p • Absent: $a • Cancelled: $c",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }

    if (showMarkDialog) {
        val subjectOptions = (subjects.map { it.name } + listOf("General Lecture")).distinct()
        var selectedSub by remember { mutableStateOf(subjectOptions.firstOrNull() ?: "") }
        var status by remember { mutableStateOf("present") }
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())

        AlertDialog(
            onDismissRequest = { showMarkDialog = false },
            title = { Text("Log Attendance", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Subject:", style = MaterialTheme.typography.labelMedium)
                    subjectOptions.forEach { sub ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            RadioButton(
                                selected = selectedSub == sub,
                                onClick = { selectedSub = sub }
                            )
                            Text(text = sub, style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    Text("Status:", style = MaterialTheme.typography.labelMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("present" to "Present", "absent" to "Absent", "cancelled" to "Cancelled").forEach { (valKey, label) ->
                            FilterChip(
                                selected = status == valKey,
                                onClick = { status = valKey },
                                label = { Text(label) }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (selectedSub.isNotBlank()) {
                            onMarkAttendance(selectedSub, status, todayStr)
                            showMarkDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoLight)
                ) {
                    Text("Save Record")
                }
            },
            dismissButton = {
                TextButton(onClick = { showMarkDialog = false }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun CountPill(label: String, count: Int, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "$count",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = color
        )
        Text(
            text = label,
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
