package com.example.studyconnect.ai

import com.example.studyconnect.BuildConfig
import com.example.studyconnect.data.model.ChatMessage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

enum class ChatbotRole(val title: String, val description: String, val systemPrompt: String) {
    ACADEMIC_COACH(
        "Academic Coach",
        "Habits, productivity, and study motivation",
        "You are StudyConnect Academic Coach, an encouraging and insightful mentor for students. You give practical advice on active recall, spaced repetition, time management, and overcoming procrastination. Keep answers concise, clear, and encouraging."
    ),
    EXAM_TUTOR(
        "Exam Prep Tutor",
        "Concept breakdowns, quizzes, and revision",
        "You are StudyConnect Exam Prep Tutor. You specialize in explaining difficult college and high-school topics step-by-step (STEM, computing, humanities, math). You provide concrete examples and test preparation strategies."
    ),
    STUDY_PLANNER(
        "Study Planner",
        "Timetable optimization and syllabus planning",
        "You are StudyConnect Study Planner. You help students structure their study blocks, break down multi-chapter syllabi into daily targets, and balance coursework."
    ),
    WELLNESS_GUIDE(
        "Wellness Guide",
        "Fitness, sleep, hydration, and mental recovery",
        "You are StudyConnect Wellness Guide. You help students maintain peak physical and mental energy through effective workout routines, proper hydration, nutrition, and stress management."
    )
}

object GeminiChatService {

    private val client = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private const val BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    suspend fun sendMessage(
        history: List<ChatMessage>,
        userMessage: String,
        role: ChatbotRole,
        modelName: String = "gemini-3.8-flash"
    ): String = withContext(Dispatchers.IO) {
        val apiKey = BuildConfig.GEMINI_API_KEY
        if (apiKey.isBlank()) {
            return@withContext "StudyConnect AI is running in offline mode. Please configure your GEMINI_API_KEY to enable live AI responses."
        }

        // Map model alias to valid API model identifier
        val resolvedModel = when (modelName) {
            "gemini-3.1-flash-lite" -> "gemini-3.1-flash-lite-preview"
            "gemini-4-argon" -> "gemini-3.1-pro-preview"
            "gemini-3.8-flash" -> "gemini-2.5-flash"
            else -> modelName
        }

        try {
            val rootJson = JSONObject()

            // System instruction
            val sysInstructionObj = JSONObject()
            val sysPartsArray = JSONArray().put(JSONObject().put("text", role.systemPrompt))
            sysInstructionObj.put("parts", sysPartsArray)
            rootJson.put("systemInstruction", sysInstructionObj)

            // Multi-turn contents
            val contentsArray = JSONArray()

            // Include last 8 messages for context
            val recentHistory = history.takeLast(8)
            for (msg in recentHistory) {
                val contentObj = JSONObject()
                contentObj.put("role", if (msg.isUser) "user" else "model")
                val parts = JSONArray().put(JSONObject().put("text", msg.text))
                contentObj.put("parts", parts)
                contentsArray.put(contentObj)
            }

            // Current user turn
            val currentUserObj = JSONObject()
            currentUserObj.put("role", "user")
            currentUserObj.put("parts", JSONArray().put(JSONObject().put("text", userMessage)))
            contentsArray.put(currentUserObj)

            rootJson.put("contents", contentsArray)

            // Generation config
            val genConfig = JSONObject()
            genConfig.put("temperature", 0.7)
            genConfig.put("maxOutputTokens", 1200)
            rootJson.put("generationConfig", genConfig)

            val url = "$BASE_URL/$resolvedModel:generateContent?key=$apiKey"
            val body = rootJson.toString().toRequestBody("application/json; charset=utf-8".toMediaType())

            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string() ?: ""

            if (!response.isSuccessful) {
                // If the preview model fails, try fallback to gemini-2.5-flash
                if (resolvedModel != "gemini-2.5-flash") {
                    return@withContext sendMessage(history, userMessage, role, "gemini-2.5-flash")
                }
                return@withContext "Unable to reach Gemini ($resolvedModel): ${response.code}. Please try again."
            }

            val resJson = JSONObject(responseBody)
            val candidates = resJson.optJSONArray("candidates")
            if (candidates != null && candidates.length() > 0) {
                val firstCandidate = candidates.getJSONObject(0)
                val content = firstCandidate.optJSONObject("content")
                val parts = content?.optJSONArray("parts")
                if (parts != null && parts.length() > 0) {
                    val text = parts.getJSONObject(0).optString("text", "")
                    if (text.isNotBlank()) {
                        return@withContext text
                    }
                }
            }

            "I received an empty response. Please ask again!"
        } catch (e: Exception) {
            "Connection error: ${e.localizedMessage ?: "Failed to contact Gemini API."}"
        }
    }
}
