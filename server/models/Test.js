const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:          { type: String, required: true, trim: true },
  subject:       { type: String, required: true, trim: true },
  date:          { type: String, required: true },
  time:          { type: String, default: '' },
  totalMarks:    { type: Number, default: null },
  obtainedMarks: { type: Number, default: null },
  notes:         { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
