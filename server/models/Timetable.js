const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day:       { type: String, required: true, enum: ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'] },
  subject:   { type: String, required: true, trim: true },
  startTime: { type: String, required: true },
  endTime:   { type: String, required: true },
  room:      { type: String, default: '' },
  faculty:   { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
