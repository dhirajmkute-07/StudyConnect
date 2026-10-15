package com.example.studyconnect.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val IndigoPrimary = Color(0xFF4F46E5)
val IndigoLight = Color(0xFF6366F1)
val IndigoContainerLight = Color(0xFFEEF2FF)
val IndigoDeepBg = Color(0xFF1E1B4B)

val SkySecondary = Color(0xFF0EA5E9)
val EmeraldTertiary = Color(0xFF10B981)
val AmberWarning = Color(0xFFF59E0B)
val RoseDanger = Color(0xFFEF4444)

val Slate900 = Color(0xFF0F172A)
val Slate800 = Color(0xFF1E293B)
val Slate700 = Color(0xFF334155)
val Slate500 = Color(0xFF64748B)
val Slate400 = Color(0xFF94A3B8)
val Slate200 = Color(0xFFE2E8F0)
val Slate100 = Color(0xFFF1F5F9)
val Slate50 = Color(0xFFF8FAFC)

private val LightColorScheme = lightColorScheme(
    primary = IndigoLight,
    onPrimary = Color.White,
    primaryContainer = IndigoContainerLight,
    onPrimaryContainer = IndigoDeepBg,
    secondary = SkySecondary,
    onSecondary = Color.White,
    tertiary = EmeraldTertiary,
    onTertiary = Color.White,
    background = Slate50,
    onBackground = Slate900,
    surface = Color.White,
    onSurface = Slate900,
    surfaceVariant = Slate100,
    onSurfaceVariant = Slate700,
    outline = Slate200
)

private val DarkColorScheme = darkColorScheme(
    primary = IndigoLight,
    onPrimary = Color.White,
    primaryContainer = IndigoDeepBg,
    onPrimaryContainer = IndigoContainerLight,
    secondary = SkySecondary,
    onSecondary = Color.White,
    tertiary = EmeraldTertiary,
    onTertiary = Color.White,
    background = Slate900,
    onBackground = Slate50,
    surface = Slate800,
    onSurface = Slate50,
    surfaceVariant = Slate700,
    onSurfaceVariant = Slate200,
    outline = Slate700
)

@Composable
fun StudyConnectTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
