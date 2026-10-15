package com.example.studyconnect.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimerScreen(
    onLogStudySession: (minutes: Int, subject: String) -> Unit
) {
    val presets = listOf(25 to "Pomodoro (25m)", 50 to "Deep Work (50m)", 15 to "Long Break (15m)", 5 to "Short Break (5m)")
    var selectedPresetMinutes by remember { mutableIntStateOf(25) }

    var totalSeconds by remember { mutableIntStateOf(25 * 60) }
    var remainingSeconds by remember { mutableIntStateOf(25 * 60) }
    var isRunning by remember { mutableStateOf(false) }
    var sessionCount by remember { mutableIntStateOf(0) }
    var showCompletedMessage by remember { mutableStateOf(false) }

    // Timer countdown effect
    LaunchedEffect(isRunning, remainingSeconds) {
        if (isRunning && remainingSeconds > 0) {
            delay(1000L)
            remainingSeconds--
            if (remainingSeconds == 0) {
                isRunning = false
                sessionCount++
                showCompletedMessage = true
                onLogStudySession(selectedPresetMinutes, "Focus Session")
            }
        }
    }

    val progress = if (totalSeconds > 0) (remainingSeconds.toFloat() / totalSeconds) else 0f
    val animatedProgress by animateFloatAsState(targetValue = progress, label = "timerProgress")

    val minutes = remainingSeconds / 60
    val seconds = remainingSeconds % 60
    val timeFormatted = String.format("%02d:%02d", minutes, seconds)

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("FocusLearn Study Timer", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp)
                .testTag("timer_screen"),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Preset Chips
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                presets.forEach { (mins, label) ->
                    FilterChip(
                        selected = selectedPresetMinutes == mins,
                        onClick = {
                            selectedPresetMinutes = mins
                            totalSeconds = mins * 60
                            remainingSeconds = mins * 60
                            isRunning = false
                        },
                        label = { Text("${mins}m", fontSize = 12.sp) }
                    )
                }
            }

            Spacer(modifier = Modifier.height(36.dp))

            // Circular Timer
            Box(
                modifier = Modifier.size(260.dp),
                contentAlignment = Alignment.Center
            ) {
                val trackColor = MaterialTheme.colorScheme.surfaceVariant
                val primaryColor = IndigoLight

                Canvas(modifier = Modifier.fillMaxSize()) {
                    val stroke = 14.dp.toPx()
                    // Background track
                    drawCircle(
                        color = trackColor,
                        style = Stroke(width = stroke)
                    )
                    // Progress arc
                    drawArc(
                        color = primaryColor,
                        startAngle = -90f,
                        sweepAngle = 360f * animatedProgress,
                        useCenter = false,
                        style = Stroke(width = stroke, cap = StrokeCap.Round)
                    )
                }

                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = timeFormatted,
                        fontSize = 48.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Text(
                        text = if (isRunning) "Deep Focus Active" else "Ready to Focus",
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (isRunning) EmeraldTertiary else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Sessions Done: $sessionCount",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            // Control Buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Reset Button
                IconButton(
                    onClick = {
                        isRunning = false
                        remainingSeconds = totalSeconds
                    },
                    modifier = Modifier
                        .size(54.dp)
                        .background(MaterialTheme.colorScheme.surfaceVariant, CircleShape)
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = "Reset Timer")
                }

                // Play / Pause Button
                Button(
                    onClick = { isRunning = !isRunning },
                    shape = CircleShape,
                    colors = ButtonDefaults.buttonColors(containerColor = IndigoLight),
                    modifier = Modifier
                        .size(72.dp)
                        .testTag("timer_toggle_button")
                ) {
                    Icon(
                        imageVector = if (isRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = if (isRunning) "Pause" else "Start",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }

                // Finish & Log Early Button
                IconButton(
                    onClick = {
                        val elapsedMinutes = maxOf(1, (totalSeconds - remainingSeconds) / 60)
                        onLogStudySession(elapsedMinutes, "Self Study")
                        remainingSeconds = totalSeconds
                        isRunning = false
                        sessionCount++
                        showCompletedMessage = true
                    },
                    modifier = Modifier
                        .size(54.dp)
                        .background(EmeraldTertiary.copy(alpha = 0.15f), CircleShape)
                ) {
                    Icon(Icons.Default.Check, contentDescription = "Log Session", tint = EmeraldTertiary)
                }
            }

            if (showCompletedMessage) {
                Spacer(modifier = Modifier.height(20.dp))
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFDCFCE7)
                ) {
                    Text(
                        text = "🎉 Awesome focus session logged! Your 7-day study chart is updated.",
                        color = Color(0xFF15803D),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp)
                    )
                }
            }
        }
    }
}
