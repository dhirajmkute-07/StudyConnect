const mongoose = require('mongoose');

const exercisePlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sets: { type: Number, required: true, min: 1, default: 3 },
  reps: { type: String, required: true, default: '10' },
  weight: { type: String, default: '' },
  restDuration: { type: String, default: '' },
  order: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { _id: true });

const fitnessPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  workoutName: { type: String, default: '', trim: true },
  isRestDay: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  exercises: [exercisePlanSchema]
}, { timestamps: true });

fitnessPlanSchema.index({ userId: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('FitnessPlan', fitnessPlanSchema);
