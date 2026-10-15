package com.example.studyconnect.ui.screens

import androidx.compose.foundation.background
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
import com.example.studyconnect.data.model.AppNotification
import com.example.studyconnect.data.model.StudentProfile
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight
import com.example.studyconnect.ui.theme.RoseDanger

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    profile: StudentProfile,
    notifications: List<AppNotification>,
    onUpdateProfile: (StudentProfile) -> Unit,
    onMarkNotificationRead: (Long) -> Unit
) {
    var isEditing by remember { mutableStateOf(false) }

    var fullName by remember(profile) { mutableStateOf(profile.fullName) }
    var email by remember(profile) { mutableStateOf(profile.email) }
    var college by remember(profile) { mutableStateOf(profile.college) }
    var university by remember(profile) { mutableStateOf(profile.university) }
    var branch by remember(profile) { mutableStateOf(profile.branch) }
    var year by remember(profile) { mutableStateOf(profile.year) }
    var rollNumber by remember(profile) { mutableStateOf(profile.rollNumber) }
    var strongSubjects by remember(profile) { mutableStateOf(profile.strongSubjects) }
    var weakSubjects by remember(profile) { mutableStateOf(profile.weakSubjects) }
    var bio by remember(profile) { mutableStateOf(profile.bio) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Student Profile & Notifications", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                actions = {
                    TextButton(
                        onClick = {
                            if (isEditing) {
                                onUpdateProfile(
                                    profile.copy(
                                        fullName = fullName.trim(),
                                        email = email.trim(),
                                        college = college.trim(),
                                        university = university.trim(),
                                        branch = branch.trim(),
                                        year = year.trim(),
                                        rollNumber = rollNumber.trim(),
                                        strongSubjects = strongSubjects.trim(),
                                        weakSubjects = weakSubjects.trim(),
                                        bio = bio.trim()
                                    )
                                )
                                isEditing = false
                            } else {
                                isEditing = true
                            }
                        }
                    ) {
                        Text(
                            text = if (isEditing) "Save" else "Edit",
                            fontWeight = FontWeight.Bold,
                            color = IndigoLight
                        )
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .testTag("profile_screen"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Profile Header
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Box(
                            modifier = Modifier
                                .size(72.dp)
                                .background(IndigoLight, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = fullName.take(1).uppercase(),
                                fontSize = 28.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        if (isEditing) {
                            OutlinedTextField(
                                value = fullName,
                                onValueChange = { fullName = it },
                                label = { Text("Full Name") },
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            OutlinedTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = { Text("Email") },
                                modifier = Modifier.fillMaxWidth()
                            )
                        } else {
                            Text(
                                text = fullName,
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.ExtraBold
                            )
                            Text(
                                text = email,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // Academic Information
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "ACADEMIC DETAILS",
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Bold,
                            color = IndigoLight
                        )

                        if (isEditing) {
                            OutlinedTextField(value = college, onValueChange = { college = it }, label = { Text("College") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = university, onValueChange = { university = it }, label = { Text("University") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = branch, onValueChange = { branch = it }, label = { Text("Branch / Major") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = year, onValueChange = { year = it }, label = { Text("Academic Year") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = rollNumber, onValueChange = { rollNumber = it }, label = { Text("Roll Number") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = strongSubjects, onValueChange = { strongSubjects = it }, label = { Text("Strong Subjects") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = weakSubjects, onValueChange = { weakSubjects = it }, label = { Text("Weak Subjects") }, modifier = Modifier.fillMaxWidth())
                            OutlinedTextField(value = bio, onValueChange = { bio = it }, label = { Text("Student Bio") }, modifier = Modifier.fillMaxWidth())
                        } else {
                            ProfileRow("Branch", branch)
                            ProfileRow("Academic Year", year)
                            ProfileRow("Roll Number", rollNumber)
                            ProfileRow("College", college)
                            ProfileRow("University", university)
                            ProfileRow("Strong Subjects", strongSubjects)
                            ProfileRow("Target Improvement", weakSubjects)
                            if (bio.isNotBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(text = "Bio: $bio", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            // Notifications Center
            item {
                Text(
                    text = "System Notifications (${notifications.count { !it.isRead }} Unread)",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
            }

            if (notifications.isEmpty()) {
                item {
                    Text(
                        text = "No notifications yet.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            } else {
                items(notifications, key = { it.id }) { notif ->
                    val badgeColor = when (notif.type) {
                        "warning" -> RoseDanger
                        "success" -> EmeraldTertiary
                        else -> IndigoLight
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = if (notif.isRead) MaterialTheme.colorScheme.surface else MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(10.dp)
                                    .background(badgeColor, CircleShape)
                            )
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = notif.title,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = notif.message,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (!notif.isRead) {
                                IconButton(onClick = { onMarkNotificationRead(notif.id) }) {
                                    Icon(Icons.Default.Done, contentDescription = "Mark Read", tint = IndigoLight)
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
private fun ProfileRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = value.ifBlank { "Not set" },
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
