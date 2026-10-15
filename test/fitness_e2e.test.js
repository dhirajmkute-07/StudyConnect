process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_84920492840284';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let server;
let baseUrl;

// Start memory server and app
before(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGODB_URI = uri;

  await mongoose.connect(uri);

  const app = require('../server/server');
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) await new Promise(r => server.close(r));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

// Helper for making authenticated requests
async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

describe('StudyConnect Fitness Module E2E Test Suite', () => {
  let userA = null;
  let userB = null;

  it('1. User Registration & Authentication (Existing StudyConnect Features Still Work)', async () => {
    // Signup User A
    const resA = await req('POST', '/api/auth/signup', {
      fullName: 'Alex Athlete',
      email: 'alex@fitness.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert.strictEqual(resA.status, 201, 'User A signup should succeed');
    assert.ok(resA.data.token, 'Token returned');
    userA = resA.data;

    // Signup User B
    const resB = await req('POST', '/api/auth/signup', {
      fullName: 'Bob Builder',
      email: 'bob@fitness.com',
      password: 'password123',
      confirmPassword: 'password123'
    });
    assert.strictEqual(resB.status, 201, 'User B signup should succeed');
    assert.ok(resB.data.token, 'Token returned');
    userB = resB.data;

    // Verify existing features: Profile & Tasks
    const profileRes = await req('GET', '/api/profile', null, userA.token);
    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.data.fullName, 'Alex Athlete');

    const taskRes = await req('POST', '/api/tasks', {
      title: 'Study Data Structures Chapter 1',
      priority: 'high',
      dueDate: '2026-10-20'
    }, userA.token);
    assert.strictEqual(taskRes.status, 201);
    assert.strictEqual(taskRes.data.title, 'Study Data Structures Chapter 1');
  });

  it('2. Weekly Workout Planner: Configure 7 days with different workouts and rest days', async () => {
    // Plan Monday: Push Workout
    const monRes = await req('PUT', '/api/fitness/plan/Monday', {
      workoutName: 'Upper Body Push',
      isRestDay: false,
      notes: 'Chest and shoulders focus',
      exercises: [
        { name: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '70 kg', restDuration: '90s', notes: 'Pause at bottom' },
        { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', weight: '24 kg', restDuration: '60s' },
        { name: 'Overhead Shoulder Press', sets: 3, reps: '10', weight: '40 kg', restDuration: '60s' }
      ]
    }, userA.token);
    assert.strictEqual(monRes.status, 200);
    assert.strictEqual(monRes.data.workoutName, 'Upper Body Push');
    assert.strictEqual(monRes.data.exercises.length, 3);

    // Plan Tuesday: Pull Workout
    const tueRes = await req('PUT', '/api/fitness/plan/Tuesday', {
      workoutName: 'Back & Biceps',
      isRestDay: false,
      notes: 'Lats and grip strength',
      exercises: [
        { name: 'Pull-ups', sets: 3, reps: '8', weight: 'Bodyweight', restDuration: '90s' },
        { name: 'Barbell Bent Over Row', sets: 4, reps: '10', weight: '60 kg', restDuration: '75s' }
      ]
    }, userA.token);
    assert.strictEqual(tueRes.status, 200);
    assert.strictEqual(tueRes.data.exercises.length, 2);

    // Plan Wednesday: Rest Day
    const wedRes = await req('PUT', '/api/fitness/plan/Wednesday', {
      workoutName: 'Active Recovery',
      isRestDay: true,
      notes: 'Stretching & foam rolling',
      exercises: []
    }, userA.token);
    assert.strictEqual(wedRes.status, 200);
    assert.strictEqual(wedRes.data.isRestDay, true);

    // Plan Thursday: Leg Day
    const thuRes = await req('PUT', '/api/fitness/plan/Thursday', {
      workoutName: 'Legs & Quads',
      isRestDay: false,
      exercises: [
        { name: 'Barbell Squat', sets: 4, reps: '8', weight: '90 kg', restDuration: '120s' }
      ]
    }, userA.token);
    assert.strictEqual(thuRes.status, 200);

    // Plan Friday: Friday Cardio & Core
    const friRes = await req('PUT', '/api/fitness/plan/Friday', {
      workoutName: 'Cardio & Abs',
      isRestDay: false,
      exercises: [
        { name: 'Treadmill Run', sets: 1, reps: '25 min', restDuration: '0' },
        { name: 'Hanging Leg Raises', sets: 3, reps: '15', restDuration: '45s' }
      ]
    }, userA.token);
    assert.strictEqual(friRes.status, 200);

    // Verify GET /api/fitness/plan returns full 7-day array
    const planRes = await req('GET', '/api/fitness/plan', null, userA.token);
    assert.strictEqual(planRes.status, 200);
    assert.strictEqual(planRes.data.length, 7);
    const mon = planRes.data.find(d => d.day === 'Monday');
    assert.strictEqual(mon.workoutName, 'Upper Body Push');
    const wed = planRes.data.find(d => d.day === 'Wednesday');
    assert.strictEqual(wed.isRestDay, true);
  });

  it('3. Viewing today workout: Only shows workout scheduled for selected date/weekday', async () => {
    // 2026-10-19 is a Monday
    const mondayRes = await req('GET', '/api/fitness/today?date=2026-10-19', null, userA.token);
    assert.strictEqual(mondayRes.status, 200);
    assert.strictEqual(mondayRes.data.day, 'Monday');
    assert.strictEqual(mondayRes.data.plan.workoutName, 'Upper Body Push');
    assert.strictEqual(mondayRes.data.templateExercises.length, 3);
    assert.strictEqual(mondayRes.data.templateExercises[0].name, 'Barbell Bench Press');

    // 2026-10-21 is a Wednesday (Rest Day)
    const wednesdayRes = await req('GET', '/api/fitness/today?date=2026-10-21', null, userA.token);
    assert.strictEqual(wednesdayRes.status, 200);
    assert.strictEqual(wednesdayRes.data.day, 'Wednesday');
    assert.strictEqual(wednesdayRes.data.plan.isRestDay, true);
    assert.strictEqual(wednesdayRes.data.templateExercises.length, 0, 'No exercises on rest day');

    // 2026-10-25 is a Sunday (Unscheduled Day)
    const sundayRes = await req('GET', '/api/fitness/today?date=2026-10-25', null, userA.token);
    assert.strictEqual(sundayRes.status, 200);
    assert.strictEqual(sundayRes.data.day, 'Sunday');
    assert.strictEqual(sundayRes.data.templateExercises.length, 0);
  });

  it('4. Saving partial progress & completing workouts with set-by-set data', async () => {
    // Partially complete Monday workout (2026-10-19)
    const partialRes = await req('POST', '/api/fitness/session', {
      date: '2026-10-19',
      workoutName: 'Upper Body Push',
      isRestDay: false,
      status: 'in_progress',
      durationMinutes: 20,
      exercises: [
        {
          name: 'Barbell Bench Press',
          plannedSets: 4,
          plannedReps: '8-10',
          plannedWeight: '70 kg',
          completed: false,
          setsData: [
            { setNumber: 1, completed: true, reps: '10', weight: '70 kg' },
            { setNumber: 2, completed: true, reps: '8', weight: '70 kg' },
            { setNumber: 3, completed: false, reps: '', weight: '' }
          ]
        }
      ]
    }, userA.token);
    assert.strictEqual(partialRes.status, 200);
    assert.strictEqual(partialRes.data.status, 'in_progress');
    assert.strictEqual(partialRes.data.exercises[0].setsData[0].completed, true);
    assert.strictEqual(partialRes.data.exercises[0].setsData[2].completed, false);

    // Complete the workout via POST /api/fitness/session/:id/complete
    const completeRes = await req('POST', `/api/fitness/session/${partialRes.data._id}/complete`, {
      durationMinutes: 50,
      notes: 'Strong bench press session, hit all reps',
      exercises: [
        {
          name: 'Barbell Bench Press',
          plannedSets: 4,
          plannedReps: '8-10',
          completed: true,
          setsData: [
            { setNumber: 1, completed: true, reps: '10', weight: '70 kg' },
            { setNumber: 2, completed: true, reps: '8', weight: '70 kg' },
            { setNumber: 3, completed: true, reps: '8', weight: '70 kg' }
          ]
        }
      ]
    }, userA.token);
    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.data.status, 'completed');
    assert.ok(completeRes.data.completedAt, 'completedAt timestamp set');
    assert.strictEqual(completeRes.data.durationMinutes, 50);

    // Duplicate protection: posting on same date should update, not create duplicate
    const dupRes = await req('POST', '/api/fitness/session', {
      date: '2026-10-19',
      workoutName: 'Upper Body Push Updated',
      isRestDay: false,
      status: 'completed',
      durationMinutes: 55
    }, userA.token);
    assert.strictEqual(dupRes.status, 200);

    const historyRes = await req('GET', '/api/fitness/history', null, userA.token);
    const mondayLogs = historyRes.data.filter(h => h.date === '2026-10-19');
    assert.strictEqual(mondayLogs.length, 1, 'Only one session record exists for the date');
  });

  it('5. Editing a future plan does NOT alter past workout logs', async () => {
    // Verify Monday log is preserved with 55 minutes
    const logBefore = await req('GET', '/api/fitness/today?date=2026-10-19', null, userA.token);
    assert.strictEqual(logBefore.data.session.durationMinutes, 55);

    // Now user changes Monday plan completely
    const updatePlanRes = await req('PUT', '/api/fitness/plan/Monday', {
      workoutName: 'Heavy Chest & Triceps Max',
      isRestDay: false,
      exercises: [
        { name: 'Dumbbell Flyes', sets: 5, reps: '15', weight: '16 kg' }
      ]
    }, userA.token);
    assert.strictEqual(updatePlanRes.status, 200);

    // Past session on 2026-10-19 must remain unchanged!
    const logAfter = await req('GET', '/api/fitness/today?date=2026-10-19', null, userA.token);
    assert.strictEqual(logAfter.data.session.workoutName, 'Upper Body Push Updated');
    assert.strictEqual(logAfter.data.session.durationMinutes, 55);
  });

  it('6. Streak calculation across completed days, rest days, and missed workouts', async () => {
    // Setup a consecutive sequence:
    // 2026-10-19 (Mon): Completed (Done above)
    // 2026-10-20 (Tue): Complete Tuesday
    await req('POST', '/api/fitness/session', {
      date: '2026-10-20',
      workoutName: 'Back & Biceps',
      isRestDay: false,
      status: 'completed',
      durationMinutes: 45
    }, userA.token);

    // 2026-10-21 (Wed): Rest Day (User planned rest day, bridges streak)
    await req('POST', '/api/fitness/session', {
      date: '2026-10-21',
      workoutName: 'Rest Day',
      isRestDay: true,
      status: 'rest_day',
      durationMinutes: 0
    }, userA.token);

    // 2026-10-22 (Thu): Complete Thursday
    await req('POST', '/api/fitness/session', {
      date: '2026-10-22',
      workoutName: 'Legs & Quads',
      isRestDay: false,
      status: 'completed',
      durationMinutes: 60
    }, userA.token);

    // Check stats as of Thursday (2026-10-22):
    // Completed Mon (1), Tue (2), Wed Rest (bridges, does not add), Thu (3).
    // Current streak should be exactly 3!
    const statsThu = await req('GET', '/api/fitness/stats?date=2026-10-22', null, userA.token);
    assert.strictEqual(statsThu.status, 200);
    assert.strictEqual(statsThu.data.currentStreak, 3, 'Streak should be 3 (Mon, Tue, Thu + Wed Rest bridge)');
    assert.strictEqual(statsThu.data.totalWorkouts, 3, 'Rest day must not count as completed workout in totalWorkouts');
    assert.strictEqual(statsThu.data.longestStreak, 3);

    // Now test a missed scheduled workout:
    // Friday (2026-10-23) had scheduled workout 'Cardio & Abs'.
    // User does NOT work out on Friday.
    // On Saturday (2026-10-24), current streak must reset to 0 because Friday was missed!
    const statsSat = await req('GET', '/api/fitness/stats?date=2026-10-24', null, userA.token);
    assert.strictEqual(statsSat.data.currentStreak, 0, 'Streak breaks when scheduled workout was missed');
    assert.strictEqual(statsSat.data.longestStreak, 3, 'Longest streak remains preserved at 3');
  });

  it('7. Weekly & Monthly Statistics and Consistency', async () => {
    const stats = await req('GET', '/api/fitness/stats?date=2026-10-22', null, userA.token);
    assert.strictEqual(stats.status, 200);

    // Total duration: 55 (Mon) + 45 (Tue) + 60 (Thu) = 160 minutes
    assert.strictEqual(stats.data.totalDurationMinutes, 160);

    // Weekly breakdown array length should be 7
    assert.strictEqual(stats.data.weeklyDays.length, 7);

    // Calendar heatmap should contain entries
    assert.ok(stats.data.calendarDays.length > 0);

    // Duration by day should contain entries
    assert.strictEqual(stats.data.durationByDay.length, 14);
  });

  it('8. Multi-User Isolation & Security (User B cannot access or modify User A data)', async () => {
    // User B should see empty plan
    const userBPlan = await req('GET', '/api/fitness/plan', null, userB.token);
    assert.strictEqual(userBPlan.status, 200);
    const monB = userBPlan.data.find(d => d.day === 'Monday');
    assert.strictEqual(monB.workoutName, '', 'User B plan is separate and empty');

    // User B stats should be 0
    const userBStats = await req('GET', '/api/fitness/stats?date=2026-10-22', null, userB.token);
    assert.strictEqual(userBStats.data.currentStreak, 0);
    assert.strictEqual(userBStats.data.totalWorkouts, 0);

    // User A session ID
    const userAHistory = await req('GET', '/api/fitness/history', null, userA.token);
    assert.ok(userAHistory.data.length > 0);
    const sessionAId = userAHistory.data[0]._id || userAHistory.data[0].id;

    // User B attempts to edit User A session -> 404 Not Found
    const hackEdit = await req('PUT', `/api/fitness/session/${sessionAId}`, {
      durationMinutes: 999
    }, userB.token);
    assert.strictEqual(hackEdit.status, 404, 'User B cannot edit User A session');

    // User B attempts to delete User A session -> 404 Not Found
    const hackDel = await req('DELETE', `/api/fitness/session/${sessionAId}`, null, userB.token);
    assert.strictEqual(hackDel.status, 404, 'User B cannot delete User A session');

    // Unauthenticated request -> 401
    const noAuth = await req('GET', '/api/fitness/plan', null, null);
    assert.strictEqual(noAuth.status, 401, 'Unauthenticated request rejected');
  });
});
