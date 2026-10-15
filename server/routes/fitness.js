const express = require('express');
const mongoose = require('mongoose');
const FitnessPlan = require('../models/FitnessPlan');
const WorkoutSession = require('../models/WorkoutSession');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getWeekday(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(y, m - 1, d);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return formatDate(dt);
}

// ── GET /api/fitness/plan ─────────────────────────────────────
// Retrieve user's full 7-day weekly workout plan
router.get('/plan', authenticate, async (req, res) => {
  try {
    const plans = await FitnessPlan.find({ userId: req.user.userId });
    const planMap = {};
    plans.forEach(p => {
      planMap[p.day] = p;
    });

    // Ensure all 7 days are represented in output
    const fullWeek = VALID_DAYS.map(day => {
      if (planMap[day]) {
        return planMap[day];
      }
      return {
        day,
        workoutName: '',
        isRestDay: false,
        notes: '',
        exercises: []
      };
    });

    res.json(fullWeek);
  } catch (err) {
    console.error('Fetch plan error:', err);
    res.status(500).json({ error: 'Failed to fetch workout plan' });
  }
});

// ── PUT /api/fitness/plan/:day ────────────────────────────────
// Update plan for a single day
router.put('/plan/:day', authenticate, async (req, res) => {
  try {
    const day = req.params.day;
    if (!VALID_DAYS.includes(day)) {
      return res.status(400).json({ error: 'Invalid weekday' });
    }

    const { workoutName, isRestDay, notes, exercises } = req.body;

    const sanitizedExercises = Array.isArray(exercises)
      ? exercises
          .filter(e => e && e.name && e.name.trim())
          .map((e, index) => ({
            name: String(e.name).trim(),
            sets: Math.max(1, parseInt(e.sets, 10) || 3),
            reps: String(e.reps || '10').trim(),
            weight: String(e.weight || '').trim(),
            restDuration: String(e.restDuration || '').trim(),
            order: typeof e.order === 'number' ? e.order : index,
            notes: String(e.notes || '').trim()
          }))
      : [];

    const updatedPlan = await FitnessPlan.findOneAndUpdate(
      { userId: req.user.userId, day },
      {
        $set: {
          workoutName: String(workoutName || '').trim(),
          isRestDay: Boolean(isRestDay),
          notes: String(notes || '').trim(),
          exercises: sanitizedExercises
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json(updatedPlan);
  } catch (err) {
    console.error('Update day plan error:', err);
    res.status(500).json({ error: 'Failed to update day plan' });
  }
});

// ── PUT /api/fitness/plan ─────────────────────────────────────
// Batch update all 7 days of weekly plan
router.put('/plan', authenticate, async (req, res) => {
  try {
    const { plans } = req.body;
    if (!Array.isArray(plans)) {
      return res.status(400).json({ error: 'Plans must be an array' });
    }

    const saved = [];
    for (const item of plans) {
      if (!item.day || !VALID_DAYS.includes(item.day)) continue;

      const sanitizedExercises = Array.isArray(item.exercises)
        ? item.exercises
            .filter(e => e && e.name && e.name.trim())
            .map((e, index) => ({
              name: String(e.name).trim(),
              sets: Math.max(1, parseInt(e.sets, 10) || 3),
              reps: String(e.reps || '10').trim(),
              weight: String(e.weight || '').trim(),
              restDuration: String(e.restDuration || '').trim(),
              order: typeof e.order === 'number' ? e.order : index,
              notes: String(e.notes || '').trim()
            }))
        : [];

      const doc = await FitnessPlan.findOneAndUpdate(
        { userId: req.user.userId, day: item.day },
        {
          $set: {
            workoutName: String(item.workoutName || '').trim(),
            isRestDay: Boolean(item.isRestDay),
            notes: String(item.notes || '').trim(),
            exercises: sanitizedExercises
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      saved.push(doc);
    }

    res.json(saved);
  } catch (err) {
    console.error('Batch save plan error:', err);
    res.status(500).json({ error: 'Failed to save weekly plan' });
  }
});

// ── GET /api/fitness/today ────────────────────────────────────
// Get scheduled plan and session for a specific date (defaults to today)
router.get('/today', authenticate, async (req, res) => {
  try {
    const targetDate = req.query.date || formatDate(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res.status(400).json({ error: 'Date must be in YYYY-MM-DD format' });
    }

    const day = getWeekday(targetDate);
    const plan = await FitnessPlan.findOne({ userId: req.user.userId, day });
    let session = await WorkoutSession.findOne({ userId: req.user.userId, date: targetDate });

    // If no session exists yet, return template based on plan
    let templateExercises = [];
    if (plan && !plan.isRestDay && Array.isArray(plan.exercises)) {
      templateExercises = plan.exercises.map(e => ({
        name: e.name,
        plannedSets: e.sets,
        plannedReps: e.reps,
        plannedWeight: e.weight || '',
        restDuration: e.restDuration || '',
        notes: e.notes || '',
        completed: false,
        setsData: Array.from({ length: e.sets }, (_, i) => ({
          setNumber: i + 1,
          completed: false,
          reps: e.reps,
          weight: e.weight || ''
        }))
      }));
    }

    res.json({
      date: targetDate,
      day,
      plan: plan || {
        day,
        workoutName: '',
        isRestDay: false,
        exercises: []
      },
      session: session || null,
      templateExercises
    });
  } catch (err) {
    console.error('Fetch today workout error:', err);
    res.status(500).json({ error: 'Failed to fetch today workout' });
  }
});

// ── POST /api/fitness/session ─────────────────────────────────
// Save or partially update a workout session
router.post('/session', authenticate, async (req, res) => {
  try {
    const { date, workoutName, isRestDay, status, durationMinutes, exercises, notes } = req.body;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required' });
    }

    const day = getWeekday(date);
    const sanitizedDuration = Math.max(0, parseInt(durationMinutes, 10) || 0);

    const sanitizedExercises = Array.isArray(exercises)
      ? exercises.map(e => ({
          name: String(e.name || '').trim(),
          plannedSets: Math.max(1, parseInt(e.plannedSets, 10) || 3),
          plannedReps: String(e.plannedReps || '10').trim(),
          plannedWeight: String(e.plannedWeight || '').trim(),
          restDuration: String(e.restDuration || '').trim(),
          notes: String(e.notes || '').trim(),
          completed: Boolean(e.completed),
          setsData: Array.isArray(e.setsData)
            ? e.setsData.map((s, idx) => ({
                setNumber: idx + 1,
                completed: Boolean(s.completed),
                reps: String(s.reps || '').trim(),
                weight: String(s.weight || '').trim()
              }))
            : []
        }))
      : [];

    const updates = {
      day,
      workoutName: String(workoutName || '').trim(),
      isRestDay: Boolean(isRestDay),
      status: ['in_progress', 'completed', 'rest_day', 'skipped'].includes(status) ? status : 'in_progress',
      durationMinutes: sanitizedDuration,
      exercises: sanitizedExercises,
      notes: String(notes || '').trim()
    };

    if (updates.status === 'completed') {
      updates.completedAt = new Date();
    }

    const session = await WorkoutSession.findOneAndUpdate(
      { userId: req.user.userId, date },
      {
        $set: updates,
        $setOnInsert: { startedAt: new Date() }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json(session);
  } catch (err) {
    console.error('Save session error:', err);
    res.status(500).json({ error: 'Failed to save workout session' });
  }
});

// ── POST /api/fitness/session/:id/complete ────────────────────
// Explicitly complete a workout session
router.post('/session/:id/complete', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    const session = await WorkoutSession.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    const { durationMinutes, exercises, notes } = req.body;

    if (durationMinutes !== undefined) {
      session.durationMinutes = Math.max(0, parseInt(durationMinutes, 10) || 0);
    }
    if (notes !== undefined) {
      session.notes = String(notes || '').trim();
    }

    if (Array.isArray(exercises)) {
      session.exercises = exercises.map(e => ({
        name: String(e.name || '').trim(),
        plannedSets: Math.max(1, parseInt(e.plannedSets, 10) || 3),
        plannedReps: String(e.plannedReps || '10').trim(),
        plannedWeight: String(e.plannedWeight || '').trim(),
        restDuration: String(e.restDuration || '').trim(),
        notes: String(e.notes || '').trim(),
        completed: Boolean(e.completed),
        setsData: Array.isArray(e.setsData)
          ? e.setsData.map((s, idx) => ({
              setNumber: idx + 1,
              completed: Boolean(s.completed),
              reps: String(s.reps || '').trim(),
              weight: String(s.weight || '').trim()
            }))
          : []
      }));
    }

    session.status = 'completed';
    session.completedAt = new Date();
    await session.save();

    res.json(session);
  } catch (err) {
    console.error('Complete session error:', err);
    res.status(500).json({ error: 'Failed to complete workout session' });
  }
});

// ── PUT /api/fitness/session/:id ──────────────────────────────
// Edit an existing session
router.put('/session/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    const session = await WorkoutSession.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    const allowed = ['workoutName', 'durationMinutes', 'status', 'notes', 'exercises', 'isRestDay'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        if (key === 'durationMinutes') {
          session.durationMinutes = Math.max(0, parseInt(req.body[key], 10) || 0);
        } else if (key === 'status') {
          if (['in_progress', 'completed', 'rest_day', 'skipped'].includes(req.body[key])) {
            session.status = req.body[key];
            if (req.body[key] === 'completed' && !session.completedAt) {
              session.completedAt = new Date();
            }
          }
        } else {
          session[key] = req.body[key];
        }
      }
    }

    await session.save();
    res.json(session);
  } catch (err) {
    console.error('Edit session error:', err);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

// ── DELETE /api/fitness/session/:id ───────────────────────────
// Delete a workout session safely
router.delete('/session/:id', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    const session = await WorkoutSession.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    res.json({ message: 'Workout session removed successfully' });
  } catch (err) {
    console.error('Delete session error:', err);
    res.status(500).json({ error: 'Failed to delete workout session' });
  }
});

// ── GET /api/fitness/history ──────────────────────────────────
// Get past workout sessions with filtering/pagination
router.get('/history', authenticate, async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const sessions = await WorkoutSession.find({ userId: req.user.userId })
      .sort({ date: -1 })
      .limit(limit);

    res.json(sessions);
  } catch (err) {
    console.error('Fetch history error:', err);
    res.status(500).json({ error: 'Failed to fetch workout history' });
  }
});

// ── GET /api/fitness/stats ────────────────────────────────────
// Real calculations for streaks, summaries, graphs and calendar
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const todayStr = req.query.date || formatDate(new Date());

    const [plans, sessions] = await Promise.all([
      FitnessPlan.find({ userId }),
      WorkoutSession.find({ userId }).sort({ date: 1 })
    ]);

    const planByDay = {};
    plans.forEach(p => {
      planByDay[p.day] = p;
    });

    const sessionByDate = {};
    sessions.forEach(s => {
      sessionByDate[s.date] = s;
    });

    // 1. Total Completed Workouts (excluding rest days)
    const completedSessions = sessions.filter(
      s => s.status === 'completed' && !s.isRestDay
    );
    const totalWorkouts = completedSessions.length;

    // 2. Total Workout Duration in Minutes
    const totalDurationMinutes = completedSessions.reduce(
      (sum, s) => sum + (s.durationMinutes || 0),
      0
    );

    // 3. Today's Status
    const todayDayName = getWeekday(todayStr);
    const todayPlan = planByDay[todayDayName];
    const todaySession = sessionByDate[todayStr];

    let todayStatus = 'no_workout';
    let todayWorkoutName = '';

    if (todaySession) {
      todayWorkoutName = todaySession.workoutName || (todayPlan ? todayPlan.workoutName : '');
      if (todaySession.status === 'completed') {
        todayStatus = todaySession.isRestDay ? 'rest_day' : 'completed';
      } else if (todaySession.isRestDay) {
        todayStatus = 'rest_day';
      } else if (todaySession.status === 'in_progress') {
        todayStatus = 'in_progress';
      } else {
        todayStatus = todaySession.status;
      }
    } else if (todayPlan) {
      todayWorkoutName = todayPlan.workoutName || '';
      if (todayPlan.isRestDay) {
        todayStatus = 'rest_day';
      } else if (todayPlan.exercises && todayPlan.exercises.length > 0) {
        todayStatus = 'scheduled';
      }
    }

    // 4. Real Streak Calculation (Local calendar date based)
    // - Streak day counts ONLY when scheduled workout is completed
    // - Rest day bridges streak (does NOT increase streak, does NOT break streak)
    // - Unscheduled day bridges streak
    // - Duplicate logs cannot double count due to unique date index
    // - Missed scheduled workout breaks streak

    // Determine current streak:
    let currentStreak = 0;
    const isTodayCompleted = todaySession && todaySession.status === 'completed' && !todaySession.isRestDay;

    // If today is completed, walk backwards from today.
    // If today is not completed yet, walk backwards from yesterday (today is still in progress / pending)
    let checkDateStr = isTodayCompleted ? todayStr : addDays(todayStr, -1);

    // Walk backwards up to 365 days
    for (let i = 0; i < 365; i++) {
      const s = sessionByDate[checkDateStr];
      const dName = getWeekday(checkDateStr);
      const p = planByDay[dName];

      const isCompleted = s && s.status === 'completed' && !s.isRestDay;
      const isRest = (s && s.isRestDay) || (p && p.isRestDay);
      const isScheduled = p && !p.isRestDay && p.exercises && p.exercises.length > 0;

      if (isCompleted) {
        currentStreak++;
      } else if (isRest) {
        // Rest day bridges without incrementing
      } else if (!isScheduled) {
        // Unscheduled day bridges without incrementing
      } else {
        // Scheduled workout missed! Streak ends here.
        break;
      }

      checkDateStr = addDays(checkDateStr, -1);
    }

    // 5. Longest Streak Calculation
    // Chronological scan from earliest session date to today
    let longestStreak = 0;
    if (sessions.length > 0) {
      const earliestDateStr = sessions[0].date;
      let walkDate = earliestDateStr;
      let runningStreak = 0;

      while (walkDate <= todayStr) {
        const s = sessionByDate[walkDate];
        const dName = getWeekday(walkDate);
        const p = planByDay[dName];

        const isCompleted = s && s.status === 'completed' && !s.isRestDay;
        const isRest = (s && s.isRestDay) || (p && p.isRestDay);
        const isScheduled = p && !p.isRestDay && p.exercises && p.exercises.length > 0;

        if (isCompleted) {
          runningStreak++;
          if (runningStreak > longestStreak) {
            longestStreak = runningStreak;
          }
        } else if (isRest || !isScheduled) {
          // Bridge
        } else {
          runningStreak = 0;
        }

        walkDate = addDays(walkDate, 1);
      }
    }
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // 6. This Week Breakdown (Monday to Sunday)
    const [tY, tM, tD] = todayStr.split('-').map(Number);
    const todayObj = new Date(tY, tM - 1, tD);
    const dayOfWeek = todayObj.getDay(); // 0 is Sunday, 1 is Monday ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekMondayStr = addDays(todayStr, mondayOffset);

    const weeklyDays = [];
    let thisWeekCompleted = 0;
    let thisWeekScheduled = 0;

    for (let i = 0; i < 7; i++) {
      const dStr = addDays(weekMondayStr, i);
      const dName = getWeekday(dStr);
      const p = planByDay[dName];
      const s = sessionByDate[dStr];

      const isCompleted = s && s.status === 'completed' && !s.isRestDay;
      const isRest = (s && s.isRestDay) || (p && p.isRestDay);
      const isScheduled = p && !p.isRestDay && p.exercises && p.exercises.length > 0;

      let status = 'unscheduled';
      if (isCompleted) {
        status = 'completed';
        thisWeekCompleted++;
      } else if (isRest) {
        status = 'rest_day';
      } else if (dStr === todayStr) {
        status = s && s.status === 'in_progress' ? 'in_progress' : isScheduled ? 'today_pending' : 'unscheduled';
      } else if (dStr < todayStr) {
        status = isScheduled ? 'missed' : 'unscheduled';
      } else {
        status = isScheduled ? 'upcoming' : 'unscheduled';
      }

      if (isScheduled) {
        thisWeekScheduled++;
      }

      weeklyDays.push({
        date: dStr,
        day: dName,
        status,
        workoutName: (s && s.workoutName) || (p && p.workoutName) || '',
        duration: s ? s.durationMinutes : 0
      });
    }

    // 7. Monthly Consistency (% of scheduled workout days completed in current month)
    const currentMonthPrefix = todayStr.slice(0, 7); // 'YYYY-MM'
    const daysInCurrentMonth = new Date(tY, tM, 0).getDate();
    let monthScheduledDays = 0;
    let monthCompletedDays = 0;

    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dStr = `${currentMonthPrefix}-${String(dayNum).padStart(2, '0')}`;
      const dName = getWeekday(dStr);
      const p = planByDay[dName];
      const s = sessionByDate[dStr];

      const isScheduled = p && !p.isRestDay && p.exercises && p.exercises.length > 0;
      const isCompleted = s && s.status === 'completed' && !s.isRestDay;

      // Only count days up to today or all month if passed
      if (dStr <= todayStr) {
        if (isScheduled) monthScheduledDays++;
        if (isCompleted) monthCompletedDays++;
      }
    }

    const monthlyConsistency = monthScheduledDays > 0
      ? Math.round((monthCompletedDays / monthScheduledDays) * 100)
      : (monthCompletedDays > 0 ? 100 : 0);

    // 8. Duration By Day (Last 14 days)
    const durationByDay = [];
    for (let i = 13; i >= 0; i--) {
      const dStr = addDays(todayStr, -i);
      const s = sessionByDate[dStr];
      durationByDay.push({
        date: dStr,
        day: getWeekday(dStr).slice(0, 3),
        duration: s ? s.durationMinutes || 0 : 0,
        status: s ? s.status : 'none'
      });
    }

    // 9. Activity Calendar (Last 90 days for GitHub-style heatmap)
    const calendarDays = [];
    for (let i = 89; i >= 0; i--) {
      const dStr = addDays(todayStr, -i);
      const dName = getWeekday(dStr);
      const p = planByDay[dName];
      const s = sessionByDate[dStr];

      const isCompleted = s && s.status === 'completed' && !s.isRestDay;
      const isRest = (s && s.isRestDay) || (p && p.isRestDay);
      const isScheduled = p && !p.isRestDay && p.exercises && p.exercises.length > 0;

      let status = 'unscheduled';
      if (isCompleted) {
        status = 'completed';
      } else if (isRest) {
        status = 'rest_day';
      } else if (dStr < todayStr && isScheduled) {
        status = 'missed';
      } else if (dStr === todayStr) {
        status = s && s.status === 'in_progress' ? 'in_progress' : isScheduled ? 'today_pending' : 'unscheduled';
      }

      calendarDays.push({
        date: dStr,
        day: dName,
        status,
        duration: s ? s.durationMinutes || 0 : 0,
        workoutName: (s && s.workoutName) || (p && p.workoutName) || ''
      });
    }

    res.json({
      todayStatus,
      todayWorkoutName,
      currentStreak,
      longestStreak,
      totalWorkouts,
      totalDurationMinutes,
      thisWeekCompleted,
      thisWeekScheduled,
      monthlyConsistency,
      weeklyDays,
      durationByDay,
      calendarDays
    });
  } catch (err) {
    console.error('Fetch fitness stats error:', err);
    res.status(500).json({ error: 'Failed to calculate fitness statistics' });
  }
});

module.exports = router;
