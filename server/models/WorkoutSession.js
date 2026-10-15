const mongoose = require('mongoose');

const setLogSchema = new mongoose.Schema({
  setNumber: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  reps: { type: String, default: '' },
  weight: { type: String, default: '' }
}, { _id: false });

const exerciseLogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  plannedSets: { type: Number, default: 3 },
  plannedReps: { type: String, default: '10' },
  plannedWeight: { type: String, default: '' },
  restDuration: { type: String, default: '' },
  notes: { type: String, default: '' },
  completed: { type: Boolean, default: false },
  setsData: [setLogSchema]
}, { _id: true });

const workoutSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true, index: true }, // 'YYYY-MM-DD'
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  workoutName: { type: String, default: '', trim: true },
  isRestDay: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'rest_day', 'skipped'],
    default: 'in_progress',
    index: true
  },
  durationMinutes: { type: Number, default: 0, min: 0 },
  exercises: [exerciseLogSchema],
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  notes: { type: String, default: '' }
}, { timestamps: true });

// Prevent duplicate sessions/completion records for the same user and date
workoutSessionSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkoutSession', workoutSessionSchema);
