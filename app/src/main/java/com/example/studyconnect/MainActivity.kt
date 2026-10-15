package com.example.studyconnect

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.studyconnect.data.repository.StudyConnectRepository
import com.example.studyconnect.ui.screens.*
import com.example.studyconnect.ui.theme.IndigoLight
import com.example.studyconnect.ui.theme.StudyConnectTheme
import kotlinx.coroutines.launch

enum class Screen(val title: String, val icon: ImageVector) {
    DASHBOARD("Dashboard", Icons.Default.Dashboard),
    TIMETABLE("Timetable", Icons.Default.CalendarMonth),
    SUBJECTS("Subjects", Icons.Default.MenuBook),
    ATTENDANCE("Attendance", Icons.Default.FactCheck),
    TASKS("Tasks", Icons.Default.Assignment),
    TESTS("Tests", Icons.Default.School),
    TIMER("Timer", Icons.Default.Timer),
    FITNESS("Fitness", Icons.Default.FitnessCenter),
    PROFILE("Profile", Icons.Default.Person),
    CHAT("AI Buddy", Icons.Default.AutoAwesome)
}

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            StudyConnectTheme {
                StudyConnectApp()
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudyConnectApp() {
    val context = LocalContext.current
    val repository = remember { StudyConnectRepository(context) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(Unit) {
        repository.refreshAll()
    }

    // Reactive State
    val subjects by repository.subjects.collectAsStateWithLifecycle()
    val timetable by repository.timetable.collectAsStateWithLifecycle()
    val attendance by repository.attendance.collectAsStateWithLifecycle()
    val tasks by repository.tasks.collectAsStateWithLifecycle()
    val tests by repository.tests.collectAsStateWithLifecycle()
    val fitnessPlans by repository.fitnessPlans.collectAsStateWithLifecycle()
    val studyLogs by repository.studyLogs.collectAsStateWithLifecycle()
    val profile by repository.profile.collectAsStateWithLifecycle()
    val notifications by repository.notifications.collectAsStateWithLifecycle()

    var currentScreen by remember { mutableStateOf(Screen.DASHBOARD) }

    // Android Back Handler to navigate back to Dashboard from sub-screens
    BackHandler(enabled = currentScreen != Screen.DASHBOARD) {
        currentScreen = Screen.DASHBOARD
    }

    Scaffold(
        bottomBar = {
            // Hide bottom bar on full-screen AI chat to give maximum conversational canvas
            if (currentScreen != Screen.CHAT) {
                NavigationBar(
                    modifier = Modifier
                        .windowInsetsPadding(WindowInsets.navigationBars)
                        .testTag("main_navigation_bar"),
                    tonalElevation = 8.dp
                ) {
                    val primaryTabs = listOf(
                        Screen.DASHBOARD,
                        Screen.TIMETABLE,
                        Screen.SUBJECTS,
                        Screen.ATTENDANCE,
                        Screen.TASKS
                    )

                    primaryTabs.forEach { screen ->
                        NavigationBarItem(
                            icon = { Icon(screen.icon, contentDescription = screen.title) },
                            label = { Text(screen.title) },
                            selected = currentScreen == screen,
                            onClick = { currentScreen = screen },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = IndigoLight,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer
                            )
                        )
                    }
                }
            }
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding)) {
            when (currentScreen) {
                Screen.DASHBOARD -> DashboardScreen(
                    profile = profile,
                    studyLogs = studyLogs,
                    timetable = timetable,
                    tasks = tasks,
                    tests = tests,
                    attendanceRecords = attendance,
                    onNavigateToTimer = { currentScreen = Screen.TIMER },
                    onNavigateToTasks = { currentScreen = Screen.TASKS },
                    onNavigateToTests = { currentScreen = Screen.TESTS },
                    onNavigateToAttendance = { currentScreen = Screen.ATTENDANCE },
                    onNavigateToChat = { currentScreen = Screen.CHAT },
                    onMarkAttendance = { sub, status ->
                        scope.launch { repository.markAttendance(sub, status) }
                    },
                    onToggleTask = { id, comp ->
                        scope.launch { repository.toggleTaskStatus(id, comp) }
                    }
                )

                Screen.SUBJECTS -> SubjectsScreen(
                    subjects = subjects,
                    onAddSubject = { name, code, color ->
                        scope.launch { repository.addSubject(name, code, color) }
                    },
                    onDeleteSubject = { id ->
                        scope.launch { repository.deleteSubject(id) }
                    },
                    onAddChapter = { subId, title ->
                        scope.launch { repository.addChapter(subId, title) }
                    },
                    onToggleChapter = { chId, comp ->
                        scope.launch { repository.toggleChapter(chId, comp) }
                    }
                )

                Screen.TIMETABLE -> TimetableScreen(
                    slots = timetable,
                    onAddSlot = { day, sub, start, end, room, fac ->
                        scope.launch { repository.addTimetableSlot(day, sub, start, end, room, fac) }
                    },
                    onDeleteSlot = { id ->
                        scope.launch { repository.deleteTimetableSlot(id) }
                    }
                )

                Screen.ATTENDANCE -> AttendanceScreen(
                    attendanceRecords = attendance,
                    subjects = subjects,
                    onMarkAttendance = { sub, status, date ->
                        scope.launch { repository.markAttendance(sub, status, date) }
                    }
                )

                Screen.TASKS -> TasksScreen(
                    tasks = tasks,
                    subjects = subjects,
                    onToggleTask = { id, comp ->
                        scope.launch { repository.toggleTaskStatus(id, comp) }
                    },
                    onAddTask = { title, desc, sub, due, prio ->
                        scope.launch { repository.addTask(title, desc, sub, due, prio) }
                    },
                    onDeleteTask = { id ->
                        scope.launch { repository.deleteTask(id) }
                    }
                )

                Screen.TESTS -> TestsScreen(
                    tests = tests,
                    subjects = subjects,
                    onAddTest = { name, sub, date, time, total, obt, notes ->
                        scope.launch { repository.addTest(name, sub, date, time, total, obt, notes) }
                    },
                    onDeleteTest = { id ->
                        scope.launch { repository.deleteTest(id) }
                    }
                )

                Screen.TIMER -> TimerScreen(
                    onLogStudySession = { mins, sub ->
                        scope.launch { repository.logStudySession(mins, sub) }
                    }
                )

                Screen.FITNESS -> FitnessScreen(
                    plans = fitnessPlans,
                    onToggleExercise = { id, comp ->
                        scope.launch { repository.toggleExerciseCompleted(id, comp) }
                    }
                )

                Screen.PROFILE -> ProfileScreen(
                    profile = profile,
                    notifications = notifications,
                    onUpdateProfile = { p ->
                        scope.launch { repository.updateProfile(p) }
                    },
                    onMarkNotificationRead = { id ->
                        scope.launch { repository.markNotificationRead(id) }
                    }
                )

                Screen.CHAT -> ChatbotScreen(
                    onNavigateBack = { currentScreen = Screen.DASHBOARD }
                )
            }
        }
    }
}
