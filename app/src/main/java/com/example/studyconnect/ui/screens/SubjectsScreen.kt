package com.example.studyconnect.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.studyconnect.data.model.Subject
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubjectsScreen(
    subjects: List<Subject>,
    onAddSubject: (name: String, code: String, color: String) -> Unit,
    onDeleteSubject: (id: Long) -> Unit,
    onAddChapter: (subjectId: Long, title: String) -> Unit,
    onToggleChapter: (chapterId: Long, completed: Boolean) -> Unit
) {
    var showAddSubjectDialog by remember { mutableStateOf(false) }
    var selectedSubjectForChapter by remember { mutableStateOf<Subject?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Academic Subjects", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showAddSubjectDialog = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("Add Subject") },
                containerColor = IndigoLight,
                contentColor = Color.White,
                modifier = Modifier
                    .windowInsetsPadding(WindowInsets.navigationBars)
                    .testTag("add_subject_fab")
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("subjects_screen"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            if (subjects.isEmpty()) {
                item {
                    Text(
                        text = "No subjects added yet. Tap below to create your first subject!",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(subjects, key = { it.id }) { subject ->
                    SubjectCard(
                        subject = subject,
                        onToggleChapter = onToggleChapter,
                        onAddChapterClick = { selectedSubjectForChapter = subject },
                        onDeleteSubject = { onDeleteSubject(subject.id) }
                    )
                }
            }
        }
    }

    // Add Subject Dialog
    if (showAddSubjectDialog) {
        var name by remember { mutableStateOf("") }
        var code by remember { mutableStateOf("") }
        val colors = listOf("#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6")
        var selectedColor by remember { mutableStateOf(colors[0]) }

        AlertDialog(
            onDismissRequest = { showAddSubjectDialog = false },
            title = { Text("Add New Subject", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Subject Name") },
                        placeholder = { Text("e.g. Distributed Systems") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = code,
                        onValueChange = { code = it },
                        label = { Text("Course Code") },
                        placeholder = { Text("e.g. CS401") },
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text("Badge Color:", style = MaterialTheme.typography.labelMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        colors.forEach { hex ->
                            val color = try { Color(android.graphics.Color.parseColor(hex)) } catch (e: Exception) { IndigoLight }
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .background(color, CircleShape)
                                    .clickable { selectedColor = hex }
                                    .then(
                                        if (selectedColor == hex) Modifier.padding(3.dp) else Modifier
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                if (selectedColor == hex) {
                                    Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (name.isNotBlank()) {
                            onAddSubject(name.trim(), code.trim(), selectedColor)
                            showAddSubjectDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoLight)
                ) {
                    Text("Add Subject")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddSubjectDialog = false }) { Text("Cancel") }
            }
        )
    }

    // Add Chapter Dialog
    selectedSubjectForChapter?.let { sub ->
        var chapterTitle by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { selectedSubjectForChapter = null },
            title = { Text("Add Chapter to ${sub.name}", fontWeight = FontWeight.Bold) },
            text = {
                OutlinedTextField(
                    value = chapterTitle,
                    onValueChange = { chapterTitle = it },
                    label = { Text("Chapter / Unit Title") },
                    placeholder = { Text("e.g. Chapter 5: Virtual Memory") },
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (chapterTitle.isNotBlank()) {
                            onAddChapter(sub.id, chapterTitle.trim())
                            selectedSubjectForChapter = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoLight)
                ) {
                    Text("Add Chapter")
                }
            },
            dismissButton = {
                TextButton(onClick = { selectedSubjectForChapter = null }) { Text("Cancel") }
            }
        )
    }
}

@Composable
private fun SubjectCard(
    subject: Subject,
    onToggleChapter: (chapterId: Long, completed: Boolean) -> Unit,
    onAddChapterClick: () -> Unit,
    onDeleteSubject: () -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val parsedColor = try { Color(android.graphics.Color.parseColor(subject.colorHex)) } catch (e: Exception) { IndigoLight }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(parsedColor, CircleShape)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = subject.name,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        if (subject.code.isNotBlank()) {
                            Text(
                                text = subject.code,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDeleteSubject) {
                        Icon(Icons.Default.DeleteOutline, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    IconButton(onClick = { expanded = !expanded }) {
                        Icon(
                            imageVector = if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                            contentDescription = "Expand"
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Progress Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Syllabus Progress",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = "${(subject.progress * 100).toInt()}% (${subject.completedChaptersCount}/${subject.chapters.size})",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (subject.progress >= 1f) EmeraldTertiary else IndigoLight
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            LinearProgressIndicator(
                progress = { subject.progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp),
                color = parsedColor,
                trackColor = parsedColor.copy(alpha = 0.2f),
            )

            AnimatedVisibility(visible = expanded) {
                Column(modifier = Modifier.padding(top = 16.dp)) {
                    Text(
                        text = "CHAPTERS & UNITS:",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    if (subject.chapters.isEmpty()) {
                        Text(
                            text = "No chapters recorded yet.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        subject.chapters.forEach { ch ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Checkbox(
                                    checked = ch.completed,
                                    onCheckedChange = { onToggleChapter(ch.id, it) },
                                    colors = CheckboxDefaults.colors(checkedColor = parsedColor)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = ch.title,
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = if (ch.completed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onSurface,
                                    fontWeight = if (ch.completed) FontWeight.Normal else FontWeight.Medium
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = onAddChapterClick,
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Add Chapter")
                    }
                }
            }
        }
    }
}
