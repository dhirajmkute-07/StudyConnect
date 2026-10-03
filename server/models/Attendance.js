const mongoose = require('mongoose');

// Attendance formula: present / (present + absent) * 100
// Cancelled and not_marked are EXCLUDED from the denominator.
const attendanceSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timetableId: { type: mongoose.Schema.Types.ObjectId, ref: 'Timetable', default: null },
  subject:     { type: String, required: true, trim: true },
  date:        { type: String, required: true },   // 'YYYY-MM-DD'
  status:      { type: String, required: true, enum: ['present', 'absent', 'cancelled', 'not_marked'], default: 'not_marked' }
}, { timestamps: true });

// Unique per (user, timetable slot OR subject, date)
attendanceSchema.index({ userId: 1, timetableId: 1, date: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
