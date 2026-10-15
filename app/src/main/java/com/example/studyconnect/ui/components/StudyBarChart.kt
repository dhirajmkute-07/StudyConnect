package com.example.studyconnect.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.studyconnect.data.model.DailyStudyLog
import com.example.studyconnect.ui.theme.EmeraldTertiary
import com.example.studyconnect.ui.theme.IndigoLight
import com.example.studyconnect.ui.theme.IndigoPrimary
import kotlin.math.max

@Composable
fun StudyBarChart(
    logs: List<DailyStudyLog>,
    targetMinutes: Int = 120, // 2h goal
    modifier: Modifier = Modifier
) {
    var selectedIndex by remember { mutableIntStateOf(logs.size - 1) }

    val totalMinutes = logs.sumOf { it.minutesStudied }
    val avgMinutes = if (logs.isNotEmpty()) totalMinutes / logs.size else 0
    val maxMinutesInLogs = logs.maxOfOrNull { it.minutesStudied } ?: 0
    val yAxisMax = max(targetMinutes + 30, (maxMinutesInLogs / 60 + 1) * 60)

    val selectedLog = logs.getOrNull(selectedIndex)

    Card(
        modifier = modifier
            .fillMaxWidth()
            .testTag("study_overview_barchart_card"),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
        ) {
            // Header Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.TrendingUp,
                            contentDescription = null,
                            tint = IndigoLight,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Study Overview",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                    }
                    Text(
                        text = "Total study time (Past 7 Days)",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primaryContainer
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(EmeraldTertiary, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Goal: ${targetMinutes / 60}h/day",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Quick Stats Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                MetricChip(
                    title = "7-Day Total",
                    value = formatHoursAndMinutes(totalMinutes),
                    icon = Icons.Default.Schedule,
                    modifier = Modifier.weight(1f)
                )
                MetricChip(
                    title = "Daily Average",
                    value = formatHoursAndMinutes(avgMinutes),
                    icon = Icons.Default.TrendingUp,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Selected Day Tooltip Banner
            if (selectedLog != null) {
                val isGoalMet = selectedLog.minutesStudied >= targetMinutes
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = if (isGoalMet) Color(0xFFDCFCE7) else MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isGoalMet) Icons.Default.CheckCircle else Icons.Default.Info,
                                contentDescription = null,
                                tint = if (isGoalMet) EmeraldTertiary else IndigoLight,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "${selectedLog.dayLabel} (${selectedLog.date})",
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                        }

                        Text(
                            text = "${formatHoursAndMinutes(selectedLog.minutesStudied)} ${if (isGoalMet) "• Target Reached ✓" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isGoalMet) Color(0xFF15803D) else MaterialTheme.colorScheme.primary
                        )
                    }
                }
                Spacer(modifier = Modifier.height(14.dp))
            }

            // Interactive Bar Chart Canvas
            val primaryColor = MaterialTheme.colorScheme.primary
            val outlineColor = MaterialTheme.colorScheme.outline
            val onSurfaceVariant = MaterialTheme.colorScheme.onSurfaceVariant

            BoxWithConstraints(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
            ) {
                val availableWidth = maxWidth
                val availableHeight = 200.dp

                // Animation for bars
                val animProgress by animateFloatAsState(
                    targetValue = 1f,
                    animationSpec = tween(durationMillis = 600),
                    label = "barAnimation"
                )

                Canvas(
                    modifier = Modifier
                        .fillMaxSize()
                        .pointerInput(logs) {
                            detectTapGestures { offset ->
                                val count = logs.size
                                if (count > 0) {
                                    val leftPadding = 36.dp.toPx()
                                    val chartWidth = size.width - leftPadding
                                    val slotWidth = chartWidth / count
                                    val tappedX = offset.x - leftPadding
                                    if (tappedX >= 0) {
                                        val idx = (tappedX / slotWidth).toInt().coerceIn(0, count - 1)
                                        selectedIndex = idx
                                    }
                                }
                            }
                        }
                ) {
                    val canvasWidth = size.width
                    val canvasHeight = size.height
                    val leftPadding = 36.dp.toPx()
                    val bottomPadding = 26.dp.toPx()
                    val chartPlotWidth = canvasWidth - leftPadding
                    val chartPlotHeight = canvasHeight - bottomPadding

                    // Draw horizontal goal dashed line
                    val goalY = chartPlotHeight - (targetMinutes.toFloat() / yAxisMax) * chartPlotHeight
                    if (goalY in 0f..chartPlotHeight) {
                        drawLine(
                            color = EmeraldTertiary.copy(alpha = 0.6f),
                            start = Offset(leftPadding, goalY),
                            end = Offset(canvasWidth, goalY),
                            strokeWidth = 2.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 10f), 0f)
                        )
                    }

                    // Draw baseline
                    drawLine(
                        color = outlineColor.copy(alpha = 0.5f),
                        start = Offset(leftPadding, chartPlotHeight),
                        end = Offset(canvasWidth, chartPlotHeight),
                        strokeWidth = 1.dp.toPx()
                    )

                    val barCount = logs.size
                    if (barCount > 0) {
                        val slotWidth = chartPlotWidth / barCount
                        val barWidth = (slotWidth * 0.45f).coerceIn(16.dp.toPx(), 32.dp.toPx())

                        logs.forEachIndexed { index, log ->
                            val isSelected = (index == selectedIndex)
                            val normalizedHeight = (log.minutesStudied.toFloat() / yAxisMax).coerceIn(0.02f, 1f)
                            val barHeight = normalizedHeight * chartPlotHeight * animProgress

                            val barLeft = leftPadding + (index * slotWidth) + (slotWidth - barWidth) / 2f
                            val barTop = chartPlotHeight - barHeight

                            val barBrush = if (isSelected) {
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFF6366F1),
                                        Color(0xFF4338CA)
                                    )
                                )
                            } else if (log.isToday) {
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFF818CF8),
                                        Color(0xFF6366F1)
                                    )
                                )
                            } else {
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFFC7D2FE),
                                        Color(0xFFA5B4FC)
                                    )
                                )
                            }

                            // Draw Bar
                            drawRoundRect(
                                brush = barBrush,
                                topLeft = Offset(barLeft, barTop),
                                size = Size(barWidth, barHeight),
                                cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
                            )

                            // Highlight border for selected
                            if (isSelected) {
                                drawRoundRect(
                                    color = Color.White,
                                    topLeft = Offset(barLeft, barTop),
                                    size = Size(barWidth, barHeight),
                                    cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx()),
                                    style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx())
                                )
                            }
                        }
                    }
                }
            }

            // X-axis Day Labels Row below the chart
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 36.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                logs.forEachIndexed { index, log ->
                    val isSelected = (index == selectedIndex)
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.weight(1f)
                    ) {
                        Text(
                            text = log.dayLabel,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected || log.isToday) FontWeight.Bold else FontWeight.Normal,
                            color = if (isSelected) IndigoLight else if (log.isToday) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (log.isToday) {
                            Box(
                                modifier = Modifier
                                    .padding(top = 2.dp)
                                    .size(4.dp)
                                    .background(IndigoLight, CircleShape)
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetricChip(
    title: String,
    value: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = IndigoLight,
                    modifier = Modifier.size(16.dp)
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(
                    text = title,
                    style = MaterialTheme.typography.bodySmall,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = value,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }
    }
}

private fun formatHoursAndMinutes(minutes: Int): String {
    val h = minutes / 60
    val m = minutes % 60
    return if (h > 0) "${h}h ${m}m" else "${m}m"
}
