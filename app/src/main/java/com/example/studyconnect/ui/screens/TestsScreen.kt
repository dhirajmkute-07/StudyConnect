package com.example.studyconnect.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DeleteOutline
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.studyconnect.data.model.Subject
import com.example.studyconnect.data.model.TestItem
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight
import com.example.studyconnect.ui.theme.SkySecondary
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TestsScreen(
    tests: List<TestItem>,
    subjects: List<Subject>,
    onAddTest: (name: String, subject: String, date: String, time: String, total: Double?, obtained: Double?, notes: String) -> Unit,
    onDeleteTest: (id: Long) -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) } // 0: Upcoming, 1: Past / Graded
    var showAddDialog by remember { mutableStateOf(false) }

    val upcomingTests = tests.filter { it.obtainedMarks == null }
    val pastTests = tests.filter { it.obtainedMarks != null }
    val currentList = if (selectedTab == 0) upcomingTests else pastTests

    // Stats
    val gradedWithPct = pastTests.mapNotNull { it.percentage }
    val avgPct = if (gradedWithPct.isNotEmpty()) gradedWithPct.average() else 0.0

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tests & Examinations", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Exam") },
                containerColor = IndigoLight,
                contentColor = Color.White,
                modifier = Modifier
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .testTag("add_test_fab")
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("tests_screen")
        ) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = IndigoLight
            ) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    text = { Text("Upcoming (${upcomingTests.size})") }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    text = { Text("Past & Graded (${pastTests.size})") }
                )
            }

            if (selectedTab == 1 && pastTests.isNotEmpty()) {
                Surface(
                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Cumulative Average:",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = "${avgPct.toInt()}%",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = IndigoLight
                        )
                    }
                }
            }

            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (currentList.isEmpty()) {
                    item {
                        Text(
                            text = if (selectedTab == 0) "No upcoming tests recorded. Good luck with your study schedule!" else "No graded tests logged yet.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(top = 24.dp)
                        )
                    }
                } else {
                    items(currentList, key = { it.id }) { test ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.5.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = test.name,
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = "${test.subject} • ${test.date} ${if (test.time.isNotBlank()) "at ${test.time}" else ""}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }

                                    if (test.obtainedMarks != null && test.totalMarks != null) {
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = EmeraldTertiary.copy(alpha = 0.15f)
                                        ) {
                                            Text(
                                                text = "${test.obtainedMarks.toInt()}/${test.totalMarks.toInt()} (${test.percentage?.toInt()}%)",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = EmeraldTertiary,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                            )
                                        }
                                    } else if (test.totalMarks != null) {
                                        Surface(
                                            shape = RoundedCornerShape(10.dp),
                                            color = MaterialTheme.colorScheme.primaryContainer
                                        ) {
                                            Text(
                                                text = "Max: ${test.totalMarks.toInt()} pts",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = MaterialTheme.colorScheme.onPrimaryContainer,
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp)
                                            )
                                        }
                                    }

                                    IconButton(onClick = { onDeleteTest(test.id) }) {
                                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }

                                if (test.notes.isNotBlank()) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = test.notes,
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

    if (showAddDialog) {
        var name by remember { mutableStateOf("") }
        val subjectOptions = (subjects.map { it.name } + listOf("General Exam")).distinct()
        var selectedSubject by remember { mutableStateOf(subjectOptions.firstOrNull() ?: "General Exam") }
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
        var date by remember { mutableStateOf(todayStr) }
        var time by remember { mutableStateOf("10:00 AM") }
        var totalMarksStr by remember { mutableStateOf("50") }
        var obtainedMarksStr by remember { mutableStateOf("") }
        var notes by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Add Exam / Test", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Exam Name") },
                        placeholder = { Text("e.g. Midterm 1") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = date,
                        onValueChange = { date = it },
                        label = { Text("Date (YYYY-MM-DD)") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = time,
                        onValueChange = { time = it },
                        label = { Text("Time") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = totalMarksStr,
                            onValueChange = { totalMarksStr = it },
                            label = { Text("Total Marks") },
                            modifier = Modifier.weight(1f)
                        )
                        OutlinedTextField(
                            value = obtainedMarksStr,
                            onValueChange = { obtainedMarksStr = it },
                            label = { Text("Score (If Graded)") },
                            modifier = Modifier.weight(1f)
                        )
                    }
                    OutlinedTextField(
                        value = notes,
                        onValueChange = { notes = it },
                        label = { Text("Syllabus / Notes") },
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            val total = totalMarksStr.toDoubleOrNull()
                            val obtained = obtainedMarksStr.toDoubleOrNull()
                            onAddTest(name.trim(), selectedSubject, date.trim(), time.trim(), total, obtained, notes.trim())
                            showAddDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoLight)
                ) {
                    Text("Save Exam")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) { Text("Cancel") }
            }
        )
    }
}
